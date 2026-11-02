import { useEffect, useState } from 'react'
import { sb } from './supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'

const NAME = "Dr. Nilesh Patil's Academy, Jalgaon"
const PASS_PCT = 35
const card = 'bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-3'
const inp = 'w-full border border-slate-300 rounded-xl p-3 mb-3 text-base'
const btn = 'w-full bg-navy text-gold font-semibold rounded-xl p-3 disabled:opacity-50'
const pct = (m, max) => Math.round((m / max) * 100)

function Splash({ done }) {
  useEffect(() => { const t = setTimeout(done, 5000); return () => clearTimeout(t) }, [])
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center text-center p-6">
      <img src="/logo.svg" className="w-24 h-24 mb-6" alt="" />
      <h1 className="text-gold text-3xl font-serif leading-snug">{NAME}</h1>
      <div className="w-56 h-1.5 bg-white/20 rounded mt-10 overflow-hidden"><div className="h-full bg-gold bar" /></div>
    </div>
  )
}

function Shell({ title, children, right }) {
  return (
    <div className="min-h-screen">
      <header className="bg-navy text-white p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="font-serif text-gold text-lg">{title}</div>{right}
      </header>
      <main className="max-w-3xl mx-auto p-4">{children}</main>
    </div>
  )
}

function AuthBox({ children }) {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h1 className="font-serif text-navy text-xl mb-5 text-center">{NAME}</h1>{children}
      </div>
    </div>
  )
}

function Login({ go }) {
  const [admin, setAdmin] = useState(false)
  const [name, setName] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const submit = async () => {
    setErr(''); setBusy(true)
    let email = name.trim()
    if (!admin) {
      const { data } = await sb.rpc('login_email', { p_name: name.trim() })
      if (!data) { setBusy(false); return setErr('Student not found. Tap "Register" to create an account.') }
      email = data
    }
    const { error } = await sb.auth.signInWithPassword({ email, password: pw })
    setBusy(false)
    if (error) setErr('Wrong name or password. Please try again.')
  }
  return (
    <AuthBox>
      <label className="text-sm text-slate-600">{admin ? 'Admin email' : 'Student name'}</label>
      <input className={inp} value={name} onChange={e => setName(e.target.value)} type={admin ? 'email' : 'text'} />
      <label className="text-sm text-slate-600">Password</label>
      <input className={inp} value={pw} onChange={e => setPw(e.target.value)} type="password" />
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      <button className={btn} disabled={busy || !name || !pw} onClick={submit}>{busy ? 'Signing in…' : 'Login'}</button>
      {!admin && <button className="w-full mt-4 text-navy underline" onClick={() => go('register')}>New student? Register</button>}
      <button className="w-full mt-3 text-xs text-slate-500" onClick={() => { setAdmin(!admin); setErr('') }}>{admin ? 'Back to student login' : 'Admin login'}</button>
    </AuthBox>
  )
}

function Register({ go }) {
  const [name, setName] = useState(''), [phone, setPhone] = useState(''), [pw, setPw] = useState('')
  const [err, setErr] = useState(''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false)
  const valid = name.trim().length > 1 && /^[6-9]\d{9}$/.test(phone) && pw.length >= 6
  const submit = async () => {
    setErr(''); setBusy(true)
    const { error } = await sb.auth.signUp({
      email: `${crypto.randomUUID()}@academy.app`, password: pw,
      options: { data: { student_name: name.trim(), phone } },
    })
    setBusy(false)
    if (error) return setErr('This name or phone number is already registered.')
    await sb.auth.signOut(); setOk(true)
  }
  if (ok) return <AuthBox><p className="text-center mb-4">Registered. The academy will approve your account soon. You can then log in.</p><button className={btn} onClick={() => go('login')}>Back to login</button></AuthBox>
  return (
    <AuthBox>
      <label className="text-sm text-slate-600">Student name</label>
      <input className={inp} value={name} onChange={e => setName(e.target.value)} />
      <label className="text-sm text-slate-600">Parent phone number (10 digits)</label>
      <input className={inp} value={phone} inputMode="numeric" maxLength={10} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} />
      <label className="text-sm text-slate-600">Password (min 6 characters)</label>
      <input className={inp} type="password" value={pw} onChange={e => setPw(e.target.value)} />
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      <button className={btn} disabled={!valid || busy} onClick={submit}>{busy ? 'Registering…' : 'Register'}</button>
      <button className="w-full mt-4 text-navy underline" onClick={() => go('login')}>Back to login</button>
    </AuthBox>
  )
}

/* ---------------- ADMIN ---------------- */
function Pending() {
  const [rows, setRows] = useState([]), [students, setStudents] = useState([]), [pick, setPick] = useState({})
  const load = async () => {
    setRows((await sb.from('profiles').select('*').eq('status', 'pending')).data || [])
    setStudents((await sb.from('students').select('*').order('name')).data || [])
  }
  useEffect(() => { load() }, [])
  const approve = async p => {
    let sid = pick[p.user_id]
    if (!sid) { const { data } = await sb.from('students').insert({ name: p.student_name }).select().single(); sid = data.id }
    await sb.from('profiles').update({ status: 'approved', student_id: sid }).eq('user_id', p.user_id); load()
  }
  const reject = async p => { await sb.from('profiles').update({ status: 'rejected' }).eq('user_id', p.user_id); load() }
  if (!rows.length) return <p className="text-slate-500">No pending registrations.</p>
  return rows.map(p => (
    <div key={p.user_id} className={card}>
      <div className="font-semibold">{p.student_name}</div><div className="text-sm text-slate-500 mb-2">{p.phone}</div>
      <select className={inp} onChange={e => setPick({ ...pick, [p.user_id]: e.target.value })}>
        <option value="">Create new student record</option>
        {students.map(s => <option key={s.id} value={s.id}>Link to {s.name}</option>)}
      </select>
      <div className="flex gap-2">
        <button className={btn} onClick={() => approve(p)}>Approve</button>
        <button className="w-full border border-red-300 text-red-600 rounded-xl p-3" onClick={() => reject(p)}>Reject</button>
      </div>
    </div>
  ))
}

function Students() {
  const [rows, setRows] = useState([]), [name, setName] = useState(''), [batch, setBatch] = useState('')
  const load = async () => setRows((await sb.from('students').select('*').order('name')).data || [])
  useEffect(() => { load() }, [])
  const add = async () => { await sb.from('students').insert({ name: name.trim(), batch }); setName(''); load() }
  const del = async s => { if (confirm(`Delete ${s.name} and all their marks?`)) { await sb.from('students').delete().eq('id', s.id); load() } }
  const edit = async s => { const n = prompt('Student name', s.name); const b = prompt('Batch / class', s.batch || ''); if (n) { await sb.from('students').update({ name: n, batch: b }).eq('id', s.id); load() } }
  return <>
    <div className={card}>
      <input className={inp} placeholder="Student name" value={name} onChange={e => setName(e.target.value)} />
      <input className={inp} placeholder="Batch / class" value={batch} onChange={e => setBatch(e.target.value)} />
      <button className={btn} disabled={!name.trim()} onClick={add}>Add student</button>
    </div>
    {rows.map(s => (
      <div key={s.id} className={card + ' flex justify-between items-center'}>
        <div><div className="font-semibold">{s.name}</div><div className="text-sm text-slate-500">{s.batch || 'No batch'}</div></div>
        <div className="flex gap-3 text-sm"><button className="text-navy underline" onClick={() => edit(s)}>Edit</button><button className="text-red-600 underline" onClick={() => del(s)}>Delete</button></div>
      </div>
    ))}
  </>
}

function Tests({ tests, reload }) {
  const [f, setF] = useState({ title: '', subject: '', test_date: new Date().toISOString().slice(0, 10), max_marks: 100 })
  const add = async () => { await sb.from('tests').insert({ ...f, max_marks: Number(f.max_marks) }); setF({ ...f, title: '' }); reload() }
  const del = async t => { if (confirm(`Delete test "${t.title}" and its marks?`)) { await sb.from('tests').delete().eq('id', t.id); reload() } }
  return <>
    <div className={card}>
      <input className={inp} placeholder="Test title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <input className={inp} placeholder="Subject" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} />
      <input className={inp} type="date" value={f.test_date} onChange={e => setF({ ...f, test_date: e.target.value })} />
      <input className={inp} type="number" placeholder="Max marks" value={f.max_marks} onChange={e => setF({ ...f, max_marks: e.target.value })} />
      <button className={btn} disabled={!f.title || !f.subject || !(f.max_marks > 0)} onClick={add}>Create test</button>
    </div>
    {tests.map(t => (
      <div key={t.id} className={card + ' flex justify-between'}>
        <div><div className="font-semibold">{t.title} · {t.subject}</div><div className="text-sm text-slate-500">{t.test_date} · out of {t.max_marks}</div></div>
        <button className="text-red-600 underline text-sm" onClick={() => del(t)}>Delete</button>
      </div>
    ))}
  </>
}

function TestPicker({ tests, value, onChange }) {
  return <select className={inp} value={value} onChange={e => onChange(e.target.value)}>
    <option value="">Select a test</option>
    {tests.map(t => <option key={t.id} value={t.id}>{t.title} · {t.subject} ({t.test_date})</option>)}
  </select>
}

function MarksEntry({ tests }) {
  const [tid, setTid] = useState(''), [students, setStudents] = useState([]), [vals, setVals] = useState({}), [msg, setMsg] = useState('')
  const test = tests.find(t => t.id === tid)
  useEffect(() => {
    if (!tid) return
    ;(async () => {
      setStudents((await sb.from('students').select('*').order('name')).data || [])
      const m = (await sb.from('marks').select('*').eq('test_id', tid)).data || []
      setVals(Object.fromEntries(m.map(x => [x.student_id, String(x.marks)]))); setMsg('')
    })()
  }, [tid])
  const save = async () => {
    const rows = []
    for (const s of students) {
      const v = vals[s.id]; if (v === undefined || v === '') continue
      const n = Number(v)
      if (isNaN(n) || n < 0 || n > test.max_marks) return setMsg(`Marks for ${s.name} must be between 0 and ${test.max_marks}.`)
      rows.push({ test_id: tid, student_id: s.id, marks: n })
    }
    const { error } = await sb.from('marks').upsert(rows, { onConflict: 'test_id,student_id' })
    setMsg(error ? 'Could not save. Please try again.' : `Saved marks for ${rows.length} students.`)
  }
  return <>
    <TestPicker tests={tests} value={tid} onChange={setTid} />
    {test && <>
      {students.map(s => (
        <div key={s.id} className={card + ' flex justify-between items-center'}>
          <span>{s.name}</span>
          <input type="number" inputMode="decimal" className="w-24 border border-slate-300 rounded-lg p-2 text-right" placeholder={`/${test.max_marks}`}
            value={vals[s.id] ?? ''} onChange={e => setVals({ ...vals, [s.id]: e.target.value })} />
        </div>
      ))}
      {msg && <p className="text-sm mb-3">{msg}</p>}
      <button className={btn} onClick={save}>Save all marks</button>
    </>}
  </>
}

function Analytics({ tests }) {
  const [tid, setTid] = useState(''), [data, setData] = useState([])
  const test = tests.find(t => t.id === tid)
  useEffect(() => {
    if (!tid) return
    ;(async () => {
      const { data } = await sb.from('marks').select('marks, students(name)').eq('test_id', tid)
      setData((data || []).map(r => ({ name: r.students?.name, marks: Number(r.marks) })).sort((a, b) => b.marks - a.marks))
    })()
  }, [tid])
  const n = data.length
  const avg = n ? (data.reduce((a, b) => a + b.marks, 0) / n).toFixed(1) : 0
  const passed = test ? data.filter(d => pct(d.marks, test.max_marks) >= PASS_PCT).length : 0
  const stats = test && n ? [['Average', avg], ['Highest', data[0].marks], ['Lowest', data[n - 1].marks], ['Pass %', Math.round((passed / n) * 100) + '%']] : []
  return <>
    <TestPicker tests={tests} value={tid} onChange={setTid} />
    {test && !n && <p className="text-slate-500">No marks entered for this test yet.</p>}
    {n > 0 && <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {stats.map(([k, v]) => <div key={k} className={card + ' text-center !mb-0'}><div className="text-3xl font-bold text-navy">{v}</div><div className="text-sm text-slate-500">{k}</div></div>)}
      </div>
      <div className={card} style={{ height: 260 }}>
        <ResponsiveContainer><BarChart data={data}><XAxis dataKey="name" fontSize={11} /><YAxis domain={[0, test.max_marks]} fontSize={11} /><Tooltip /><Bar dataKey="marks" fill="#0B1F4B" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
      </div>
      <div className={card}>
        <div className="font-semibold mb-2">Rank list</div>
        {data.map((d, i) => <div key={i} className="flex justify-between py-1 border-b last:border-0"><span>{i + 1}. {d.name}</span><span className="font-semibold">{d.marks}/{test.max_marks}</span></div>)}
      </div>
    </>}
  </>
}

function Admin({ signOut }) {
  const [tab, setTab] = useState('pending'), [tests, setTests] = useState([])
  const loadTests = async () => setTests((await sb.from('tests').select('*').order('test_date', { ascending: false })).data || [])
  useEffect(() => { loadTests() }, [])
  const tabs = [['pending', 'Approvals'], ['students', 'Students'], ['tests', 'Tests'], ['marks', 'Enter marks'], ['analytics', 'Analytics']]
  return (
    <Shell title="Admin" right={<button className="text-sm underline" onClick={signOut}>Logout</button>}>
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm ${tab === k ? 'bg-navy text-gold' : 'bg-white border'}`}>{l}</button>)}
      </div>
      {tab === 'pending' && <Pending />}{tab === 'students' && <Students />}
      {tab === 'tests' && <Tests tests={tests} reload={loadTests} />}
      {tab === 'marks' && <MarksEntry tests={tests} />}{tab === 'analytics' && <Analytics tests={tests} />}
    </Shell>
  )
}

/* ---------------- PARENT ---------------- */
function Parent({ user, signOut }) {
  const [profile, setProfile] = useState(null), [res, setRes] = useState([])
  useEffect(() => {
    ;(async () => {
      const { data: p } = await sb.from('profiles').select('*').eq('user_id', user.id).single(); setProfile(p)
      if (p?.status === 'approved') { const { data } = await sb.rpc('my_results'); setRes(data || []) }
    })()
  }, [])
  const out = <button className="text-sm underline" onClick={signOut}>Logout</button>
  if (!profile) return <Shell title="Loading…" right={out}>{null}</Shell>
  if (profile.status !== 'approved') return <Shell title={profile.student_name} right={out}><div className={card}>Your account is {profile.status}. Marks will appear once the academy approves it.</div></Shell>
  const rows = res.map(r => ({ ...r, my: pct(r.marks, r.max_marks), cls: pct(r.class_avg, r.max_marks), label: `${r.subject} ${String(r.test_date).slice(5)}` }))
  const latest = rows[rows.length - 1]
  const bySub = Object.values(rows.reduce((a, r) => { (a[r.subject] ||= { subject: r.subject, sum: 0, n: 0 }); a[r.subject].sum += r.my; a[r.subject].n++; return a }, {})).map(s => ({ subject: s.subject, avg: Math.round(s.sum / s.n) }))
  return (
    <Shell title={profile.student_name} right={out}>
      {!latest && <div className={card}>No marks have been entered yet.</div>}
      {latest && <div className="bg-navy text-white rounded-2xl p-5 mb-3">
        <div className="text-gold text-sm">Latest test: {latest.title} · {latest.subject}</div>
        <div className="text-5xl font-bold my-2">{latest.marks}<span className="text-xl text-white/60">/{latest.max_marks}</span></div>
        <div className="text-sm">{latest.my}% · Rank {latest.rank} · Class average {latest.class_avg}</div>
      </div>}
      {rows.length > 0 && <>
        <div className={card} style={{ height: 270 }}>
          <div className="font-semibold mb-2">Progress vs class average (%)</div>
          <ResponsiveContainer><LineChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={10} /><YAxis domain={[0, 100]} fontSize={11} /><Tooltip /><Legend />
            <Line dataKey="my" name="Student" stroke="#0B1F4B" strokeWidth={3} /><Line dataKey="cls" name="Class" stroke="#D4A62A" strokeWidth={2} strokeDasharray="5 4" /></LineChart></ResponsiveContainer>
        </div>
        <div className={card} style={{ height: 240 }}>
          <div className="font-semibold mb-2">Subject-wise average (%)</div>
          <ResponsiveContainer><BarChart data={bySub} layout="vertical"><XAxis type="number" domain={[0, 100]} fontSize={11} /><YAxis type="category" dataKey="subject" fontSize={11} width={80} /><Tooltip /><Bar dataKey="avg" fill="#D4A62A" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
        </div>
        <div className={card}>
          <div className="font-semibold mb-2">All tests</div>
          {[...rows].reverse().map(r => <div key={r.test_id} className="flex justify-between py-2 border-b last:border-0 text-sm">
            <span>{r.title} · {r.subject}<br /><span className="text-slate-500">{r.test_date}</span></span>
            <span className="text-right font-semibold">{r.marks}/{r.max_marks} ({r.my}%)<br /><span className="font-normal text-slate-500">Rank {r.rank}</span></span></div>)}
        </div>
      </>}
    </Shell>
  )
}

/* ---------------- APP ---------------- */
export default function App() {
  const [splash, setSplash] = useState(true), [screen, setScreen] = useState('login')
  const [session, setSession] = useState(undefined), [role, setRole] = useState(null)
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    setRole(null)
    if (!session) return
    sb.from('user_roles').select('role').eq('user_id', session.user.id).then(({ data }) =>
      setRole((data || []).some(r => r.role === 'admin') ? 'admin' : 'parent'))
  }, [session])
  const signOut = () => sb.auth.signOut()
  if (splash) return <Splash done={() => setSplash(false)} />
  if (session === undefined || (session && !role)) return <div className="p-8 text-center">Loading…</div>
  if (!session) return screen === 'register' ? <Register go={setScreen} /> : <Login go={setScreen} />
  return role === 'admin' ? <Admin signOut={signOut} /> : <Parent user={session.user} signOut={signOut} />
}
