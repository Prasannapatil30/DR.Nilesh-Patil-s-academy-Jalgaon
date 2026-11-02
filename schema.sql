-- Run this whole file in Supabase > SQL Editor
create type app_role as enum ('admin','parent');
create table user_roles(user_id uuid references auth.users on delete cascade, role app_role not null, primary key(user_id,role));
create table students(id uuid primary key default gen_random_uuid(), name text not null, batch text);
create table profiles(user_id uuid primary key references auth.users on delete cascade, student_name text not null, phone text not null unique,
  login_email text not null, status text not null default 'pending' check(status in('pending','approved','rejected')), student_id uuid references students on delete set null);
create unique index profiles_name_uq on profiles(lower(student_name));
create table tests(id uuid primary key default gen_random_uuid(), title text not null, subject text not null, test_date date not null default current_date, max_marks numeric not null check(max_marks>0));
create table marks(id uuid primary key default gen_random_uuid(), test_id uuid not null references tests on delete cascade, student_id uuid not null references students on delete cascade, marks numeric not null check(marks>=0), unique(test_id,student_id));

create function has_role(_uid uuid,_role app_role) returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from user_roles where user_id=_uid and role=_role) $$;

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.raw_user_meta_data ? 'student_name' then
    insert into profiles(user_id,student_name,phone,login_email) values(new.id,new.raw_user_meta_data->>'student_name',new.raw_user_meta_data->>'phone',new.email);
    insert into user_roles values(new.id,'parent');
  end if; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create function login_email(p_name text) returns text language sql security definer stable set search_path=public as
$$ select login_email from profiles where lower(student_name)=lower(p_name) and status<>'rejected' limit 1 $$;
grant execute on function login_email(text) to anon, authenticated;

create function my_results() returns table(test_id uuid,title text,subject text,test_date date,max_marks numeric,marks numeric,class_avg numeric,rank bigint)
language sql security definer stable set search_path=public as $$
  select t.id,t.title,t.subject,t.test_date,t.max_marks,m.marks,
   (select round(avg(x.marks),1) from marks x where x.test_id=t.id),
   (select count(*)+1 from marks x where x.test_id=t.id and x.marks>m.marks)
  from marks m join tests t on t.id=m.test_id
  where m.student_id=(select student_id from profiles where user_id=auth.uid() and status='approved')
  order by t.test_date $$;
grant execute on function my_results() to authenticated;

alter table user_roles enable row level security; alter table students enable row level security;
alter table profiles enable row level security; alter table tests enable row level security; alter table marks enable row level security;
create policy "own role" on user_roles for select using(user_id=auth.uid() or has_role(auth.uid(),'admin'));
create policy "admin roles" on user_roles for all using(has_role(auth.uid(),'admin')) with check(has_role(auth.uid(),'admin'));
create policy "own profile" on profiles for select using(user_id=auth.uid() or has_role(auth.uid(),'admin'));
create policy "admin profiles" on profiles for update using(has_role(auth.uid(),'admin'));
create policy "admin del profiles" on profiles for delete using(has_role(auth.uid(),'admin'));
create policy "students read" on students for select using(has_role(auth.uid(),'admin') or exists(select 1 from profiles p where p.user_id=auth.uid() and p.status='approved' and p.student_id=students.id));
create policy "students admin" on students for all using(has_role(auth.uid(),'admin')) with check(has_role(auth.uid(),'admin'));
create policy "tests read" on tests for select to authenticated using(true);
create policy "tests admin" on tests for all using(has_role(auth.uid(),'admin')) with check(has_role(auth.uid(),'admin'));
create policy "marks read" on marks for select using(has_role(auth.uid(),'admin') or student_id=(select student_id from profiles where user_id=auth.uid() and status='approved'));
create policy "marks admin" on marks for all using(has_role(auth.uid(),'admin')) with check(has_role(auth.uid(),'admin'));
-- After creating YOUR admin user in Authentication > Users, run (replace the email):
-- insert into user_roles select id,'admin' from auth.users where email='YOUR_EMAIL';
