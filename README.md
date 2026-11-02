# Dr. Nilesh Patil's Academy, Jalgaon: marks app

React + Vite + Tailwind + Recharts + Supabase. One admin enters marks; parents see only their own child's marks and analytics.

## Setup (about 10 minutes)
1. Create a free project at supabase.com.
2. **SQL Editor**: paste and run `supabase/schema.sql`.
3. **Authentication > Providers > Email**: turn OFF "Confirm email" (parents register without email). Keep sign-ups ON (parents need them). Under **Rate Limits** keep the defaults or lower them.
4. **Authentication > Users > Add user**: create YOUR admin with your own email and password. Then run in SQL Editor:
   `insert into user_roles select id,'admin' from auth.users where email='YOUR_EMAIL';`
5. Copy `.env.example` to `.env` and fill in the Project URL and anon key (Settings > API).
6. `npm install` then `npm run dev`.
7. Deploy free on Vercel or Netlify: import this GitHub repo, add the same two environment variables, deploy.

## Why only you can write marks
Every table has Row Level Security. Writes require `has_role(auth.uid(),'admin')`, which reads a separate `user_roles` table. Parents only get the `parent` role and can read only their approved child's rows. Hiding buttons in the app is not what protects the data; the database enforces it.

## Using it
Parents register with name, phone and password, then appear in **Approvals**. Approve each one, linking to an existing student or creating a new one. Parents log in with student name + password, so keep student names unique.
Install on a phone: open the site in Chrome > menu > Add to Home screen.
