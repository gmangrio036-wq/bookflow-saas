import React, { useEffect, useMemo, useState } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import { api, API_BASE, getToken, setAuth, clearAuth, getBiz, TIMEZONES } from './lib/api'

const localizer = momentLocalizer(moment)

function useRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => { const f = () => setHash(window.location.hash || '#/'); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  return hash
}
function go(path){ window.location.hash = path }

function DemoBanner(){ const [demo,setDemo]=React.useState(false); React.useEffect(()=>{ const i=setInterval(()=>setDemo(sessionStorage.getItem('bf_demo_mode')==='1'),1500); return ()=>clearInterval(i) },[]); if(!demo) return null; return <div style={{background:'#fef3c7',color:'#92400e',textAlign:'center',padding:'8px 12px',fontWeight:600,fontSize:14}}>Demo mode: backend (Render) is not live yet, so data is saved in this browser only. Everything works for testing — real data starts once Render is deployed.</div> }
export default function App(){
  const hash = useRoute()
  const authed = !!getToken()
  if (hash.startsWith('#/book/')) {
    const slug = hash.replace('#/book/','').split('?')[0]
    return <><DemoBanner/><PublicBooking slug={slug} /></>
  }
  if (hash.startsWith('#/portal/')) {
    const slug = hash.replace('#/portal/','').split('?')[0]
    return <><DemoBanner/><ClientPortal slug={slug} /></>
  }
  if (hash === '#/login' || hash === '#/register') return <><DemoBanner/><AuthPage mode={hash === '#/register' ? 'register' : 'login'} /></>
  if (hash.startsWith('#/app')) return <><DemoBanner/>{authed ? <Dashboard /> : <AuthPage mode="login" />}</>
  return <><DemoBanner/><Landing authed={authed} /></>
}

/* ---------- LANDING ---------- */
function Landing({ authed }){
  const [plans, setPlans] = useState([])
  useEffect(()=>{ api('/api/billing/plans').then(setPlans).catch(()=>{}) },[])
  return (
    <div>
      <nav className="nav"><div className="logo">📅 Book<span>Flow</span></div><div className="nav-links"><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#/book/mindful-therapy">Live demo booking page →</a></div><div>{authed ? <button className="btn" onClick={()=>go('#/app')}>Open dashboard</button> : <><button className="btn ghost" onClick={()=>go('#/login')}>Log in</button> <button className="btn" onClick={()=>go('#/register')}>Start free</button></>}</div></nav>

      <header className="hero">
        <div className="pill">For therapists, psychologists & service businesses • Like Calendesk, leaner</div>
        <h1>Bookings, payments & clients —<br/>without the admin chaos.</h1>
        <p>Your own branded booking page, calendar sync, buffer times, team scheduling, subscription packages and client portals. Set up in 10 minutes, charge from day one.</p>
        <div className="hero-cta"><button className="btn large" onClick={()=>go('#/register')}>Create your booking page — free</button><button className="btn large ghost" onClick={()=>go('#/book/mindful-therapy')}>See a live booking page</button></div>
        <p className="muted">Demo account: <b>demo@bookflow.app / demo1234</b> • No card needed • Stripe test mode ready</p>
        <div className="hero-card">
          <div className="mock-top"><span>●</span><span>●</span><span>●</span> <b>app.bookflow — Dashboard</b></div>
          <div className="mock-grid"><div><b>12</b><small>Bookings this week</small></div><div><b>$1,840</b><small>Revenue</small></div><div><b>98%</b><small>Attendance</small></div><div><b>3</b><small>Team members</small></div></div>
          <div className="mock-bars"><span style={{width:'72%'}}></span><span style={{width:'48%'}}></span><span style={{width:'86%'}}></span></div>
        </div>
      </header>

      <section id="features" className="section"><h2>Everything Calendesk does — in a lean MVP you own</h2><div className="grid3">
        {[
          ['🌍','Public booking page','Availability in any timezone, instant confirmation emails, .ics download + Google Calendar link.'],
          ['🛡️','Buffer times','Set buffer before/after each service so you never get back-to-back burnout bookings.'],
          ['👥','Team support','Multiple practitioners, each with colour-coded calendar events. Free: 2 members, Pro/Team: unlimited.'],
          ['🎨','White-label branding','Your business name, colour, tagline and slug — your clients see *your* brand, not ours.'],
          ['🔄','Calendar sync','Subscribe via .ics feed in Google / Apple / Outlook, plus per-booking .ics files. API-first data model.'],
          ['💳','Paid tier with Stripe','Free / Pro $19 / Team $49. Stripe Checkout in test mode — add keys and you are charging.'],
          ['📦','Subscription packages','Sell session bundles & monthly packages (Team plan) — the model behind Calendesk’s $22k/mo.'],
          ['👤','Client portal view','Clients see their upcoming sessions, can download calendar files and rebook in one click.'],
          ['🔌','API-first','Clean REST API for bookings, services, team & availability — extend it however you like.'],
        ].map(([i,t,d])=><div key={t} className="card"><div className="icon">{i}</div><h3>{t}</h3><p>{d}</p></div>)}
      </div></section>

      <section id="pricing" className="section alt"><h2>Simple pricing</h2><div className="grid3">
        {(plans.length?plans:[
          {name:'Free',price:0,features:['1 calendar','30 bookings/mo','Booking page','Email confirmations']},
          {name:'Pro',price:19,features:['Unlimited bookings','Buffers','White-label','Calendar sync']},
          {name:'Team',price:49,features:['Everything in Pro','Unlimited team','Packages','API access']},
        ]).map(p=><div key={p.name} className={`card price ${p.name==='Pro'?'featured':''}`}><h3>{p.name}</h3><div className="price-num">${p.price}<small>/mo</small></div><ul>{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul><button className="btn block" onClick={()=>go('#/register')}>{p.price===0?'Start free':'Start 14-day trial'}</button></div>)}
      </div><p className="muted center">Inspired by the demand behind Calendesk (~$22k/mo reported) — same core job, leaner build you control.</p></section>

      <section className="section"><h2>Loved by small practices</h2><div className="grid3">
        {[['“No-shows dropped because confirmations + buffers just work.”','Dr. Sarah K. — Therapist, Karachi'],['“Clients book at midnight, I wake up to a full calendar.”','James P. — Psychologist, London'],['“White-label page looks like our own product.”','Aisha N. — Counselling centre']].map(([q,a])=><div key={a} className="card"><p>{q}</p><b>{a}</b></div>)}
      </div></section>
      <footer className="footer">BookFlow — built on <a href="https://github.com/jquense/react-big-calendar" target="_blank" rel="noreferrer">react-big-calendar</a> (MIT). Rebranded & extended with booking, auth, billing & team features. • <a href="#/book/mindful-therapy">Demo booking page</a></footer>
    </div>
  )
}

/* ---------- AUTH ---------- */
function AuthPage({ mode }){
  const [form, setForm] = useState({ name:'', email:'', password:'', businessName:'' })
  const [err, setErr] = useState(''); const [loading, setLoading] = useState(false)
  async function submit(e){ e.preventDefault(); setLoading(true); setErr(''); try{ const data = await api(mode==='register'?'/api/auth/register':'/api/auth/login', { method:'POST', body: JSON.stringify(form) }); setAuth(data); go('#/app'); }catch(ex){ setErr(ex.message) } finally{ setLoading(false) } }
  return <div className="auth-wrap"><div className="auth-card"><div className="logo center">📅 Book<span>Flow</span></div><h2>{mode==='register'?'Create your practice':'Welcome back'}</h2>{err && <div className="alert">{err}</div>}<form onSubmit={submit}>
    {mode==='register' && <><label>Your name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Dr. Sarah Khan"/></label><label>Business / practice name<input value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} placeholder="Mindful Therapy Studio"/></label></>}
    <label>Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@practice.com"/></label>
    <label>Password<input required type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••"/></label>
    <button className="btn block large" disabled={loading}>{loading?'Please wait…': mode==='register'?'Create free account':'Log in'}</button></form>
    <p className="muted center">{mode==='register'?<>Already have an account? <a href="#/login">Log in</a></>:<>New here? <a href="#/register">Start free</a></>}<br/>Demo: demo@bookflow.app / demo1234</p></div></div>
}

/* ---------- DASHBOARD ---------- */
function Dashboard(){
  const biz0 = getBiz()
  const [tab, setTab] = useState('overview')
  const [clients, setClients] = useState([])
  const [bookings, setBookings] = useState([]); const [services, setServices] = useState([]); const [team, setTeam] = useState([]); const [biz, setBiz] = useState(biz0); const [emails, setEmails] = useState([]); const [plans, setPlans] = useState([])
  const [calDate, setCalDate] = useState(new Date()); const [calView, setCalView] = useState('week')
  async function load(){ try{ const [b,s,t,me,pl,em,cl] = await Promise.all([api('/api/bookings'), api('/api/services'), api('/api/team'), api('/api/me'), api('/api/billing/plans'), api('/api/emails'), api('/api/clients').catch(()=>[])]); setBookings(b); setServices(s); setTeam(t); setClients(cl); setBiz(me.business); setPlans(pl); setEmails(em); localStorage.setItem('bf_biz', JSON.stringify(me.business)); }catch(e){ if(e.message.includes('token')||e.message.includes('Invalid')){ clearAuth(); go('#/login') } } }
  useEffect(()=>{ load() },[])
  const events = useMemo(()=> bookings.filter(b=>b.status!=='cancelled').map(b=>({ id:b.id, title:`${b.service?.name||'Session'} — ${b.clientName}`, start:new Date(b.start), end:new Date(b.end), resource:b })),[bookings])
  const upcoming = bookings.filter(b=> new Date(b.start) >= new Date() && b.status!=='cancelled')
  const revenue = bookings.filter(b=>b.status!=='cancelled').reduce((sum,b)=> sum + (b.service?.price||0),0)
  async function cancelBooking(id){ await api(`/api/bookings/${id}`,{method:'PATCH', body: JSON.stringify({status:'cancelled'})}); load() }
  async function checkout(plan){ const r = await api('/api/billing/checkout',{method:'POST', body: JSON.stringify({plan})}); if(r.url) window.location.href=r.url; else { alert(r.message); load() } }

  return <div className="shell">
    <aside className="sidebar"><div className="logo">📅 Book<span>Flow</span></div><div className="biz-chip"><div className="avatar" style={{background:biz?.color}}>{biz?.logoText||'B'}</div><div><b>{biz?.name}</b><small>/{biz?.slug} • {biz?.plan?.toUpperCase()}</small></div></div>
      {[['overview','🏠 Overview'],['calendar','📅 Calendar'],['bookings','📋 Bookings'],['clients','🧑 Clients'],['services','🧩 Services & Buffers'],['team','👥 Team'],['branding','🎨 Branding & Availability'],['billing','💳 Billing'],['emails','✉️ Emails sent']].map(([k,l])=><button key={k} className={tab===k?'side active':'side'} onClick={()=>setTab(k)}>{l}</button>)}
      <a className="side link" href={`#/book/${biz?.slug}`} target="_blank" rel="noreferrer">🔗 Your public booking page ↗</a>
      <button className="side" onClick={()=>{clearAuth(); go('#/')}}>Log out</button>
    </aside>
    <main className="main">
      {tab==='overview' && <><h1>Good to see you 👋</h1><p className="muted">Share your booking link: <code>{window.location.origin}{window.location.pathname}#/book/{biz?.slug}</code></p><div className="stats"><div className="stat"><b>{upcoming.length}</b><span>Upcoming bookings</span></div><div className="stat"><b>${revenue}</b><span>Booked revenue</span></div><div className="stat"><b>{services.length}</b><span>Services</span></div><div className="stat"><b>{team.length}</b><span>Team members</span></div></div><h3>Upcoming bookings</h3><BookingList bookings={upcoming.slice(0,6)} onCancel={cancelBooking}/><h3>Calendar sync</h3><div className="card"><p>Subscribe to all bookings in Google / Apple Calendar:</p><code className="block-code">{window.location.origin.replace(':5173',':4000')}/api/calendar/feed/{biz?.slug}.ics</code><p className="muted">Each booking confirmation also includes a per-booking .ics file.</p></div></>}
      {tab==='calendar' && <><h1>Calendar</h1><p className="muted">Powered by react-big-calendar — drag, week & month views, colour by service.</p><div className="calendar-wrap"><Calendar localizer={localizer} events={events} startAccessor="start" endAccessor="end" date={calDate} view={calView} onNavigate={setCalDate} onView={setCalView} style={{height:620}} eventPropGetter={(ev)=>({ style:{ backgroundColor: ev.resource.service?.color||biz?.color||'#0f766e', borderRadius:8, border:'none' } })} /></div></>}
      {tab==='bookings' && <><h1>All bookings</h1><BookingList bookings={bookings} onCancel={cancelBooking} showAll/></>}
      {tab==='clients' && <ClientsTab clients={clients} bookings={bookings} biz={biz} />}
      {tab==='services' && <ServicesTab services={services} reload={load} />}
      {tab==='team' && <TeamTab team={team} reload={load} plan={biz?.plan} />}
      {tab==='branding' && <BrandingTab biz={biz} reload={load} />}
      {tab==='billing' && <><h1>Billing — Stripe test mode</h1><p className="muted">Current plan: <b>{biz?.plan}</b>. Without Stripe keys it upgrades in demo mode so you can test the flow. Add keys in <code>server/.env</code> for real test checkout.</p><div className="grid3">{plans.map(p=><div key={p.id} className="card price"><h3>{p.name}</h3><div className="price-num">${p.price}<small>/mo</small></div><ul>{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul>{biz?.plan===p.id?<button className="btn ghost block" disabled>Current plan</button>:<button className="btn block" onClick={()=>checkout(p.id)}>Upgrade to {p.name}</button>}</div>)}</div></>}
      {tab==='emails' && <><h1>Confirmation emails (mock log)</h1><p className="muted">With SMTP set, these send for real. In mock mode they are logged here + server console — so you can verify the flow.</p>{emails.map(e=><div key={e.id} className="card"><b>{e.subject}</b><small> → {e.to} • {new Date(e.at).toLocaleString()} • {e.provider}</small><pre>{e.body}</pre></div>)}</>}
    </main>
  </div>
}

function BookingList({ bookings, onCancel, showAll }){
  if(!bookings.length) return <div className="card">No bookings yet. Share your public page to get your first one.</div>
  return <div>{bookings.map(b=><div key={b.id} className="booking-row"><div className="dot" style={{background:b.service?.color||'#0f766e'}}></div><div className="grow"><b>{b.service?.name||'Session'} — {b.clientName}</b><small>{new Date(b.start).toLocaleString()} • {b.service?.duration} min • {b.timezone} • {b.clientEmail}</small></div><span className={`badge ${b.status}`}>{b.status}</span>{b.status!=='cancelled' && <button className="btn small ghost" onClick={()=>onCancel(b.id)}>Cancel</button>}<a className="btn small ghost" href={`${API_BASE}/api/bookings/${b.id}/ics`}>↓ .ics</a></div>)}</div>
}

function ServicesTab({ services, reload }){
  const [form, setForm] = useState({ name:'', duration:50, price:80, bufferBefore:10, bufferAfter:10, color:'#0f766e', description:'' })
  async function add(e){ e.preventDefault(); await api('/api/services',{method:'POST', body: JSON.stringify({...form, duration:Number(form.duration), price:Number(form.price), bufferBefore:Number(form.bufferBefore), bufferAfter:Number(form.bufferAfter)})}); setForm({ name:'', duration:50, price:80, bufferBefore:10, bufferAfter:10, color:'#0f766e', description:'' }); reload() }
  async function del(id){ await api(`/api/services/${id}`,{method:'DELETE'}); reload() }
  return <><h1>Services & buffer times</h1><div className="grid2"><div>{services.map(s=><div key={s.id} className="card"><b>{s.name}</b> <span className="badge">${s.price}</span><p>{s.description}</p><small>{s.duration} min • Buffer: {s.bufferBefore} min before / {s.bufferAfter} min after • Blocks {s.duration + s.bufferBefore + s.bufferAfter} min total</small><br/><button className="btn small ghost" onClick={()=>del(s.id)}>Delete</button></div>)}</div>
  <form className="card form" onSubmit={add}><h3>Add service</h3><label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><div className="row"><label>Duration (min)<input type="number" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}/></label><label>Price $<input type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label></div><div className="row"><label>Buffer before<input type="number" value={form.bufferBefore} onChange={e=>setForm({...form,bufferBefore:e.target.value})}/></label><label>Buffer after<input type="number" value={form.bufferAfter} onChange={e=>setForm({...form,bufferAfter:e.target.value})}/></label><label>Colour<input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></label></div><label>Description<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><button className="btn block">Add service</button></form></div></>
}

function TeamTab({ team, reload, plan }){
  const [form, setForm] = useState({ name:'', email:'', role:'Therapist' })
  const [err, setErr] = useState('')
  async function add(e){ e.preventDefault(); setErr(''); try{ await api('/api/team',{method:'POST', body: JSON.stringify(form)}); reload() }catch(ex){ setErr(ex.message) } }
  async function del(id){ await api(`/api/team/${id}`,{method:'DELETE'}); reload() }
  return <><h1>Team</h1><p className="muted">Plan: {plan} — {plan==='free'?'Free allows 2 members. Upgrade for unlimited.':'Unlimited members.'}</p>{err && <div className="alert">{err}</div>}<div className="grid2"><div>{team.map(m=><div key={m.id} className="card row-card"><div className="avatar" style={{background:m.color}}>{m.name[0]}</div><div className="grow"><b>{m.name}</b><small>{m.role} • {m.email}</small></div><button className="btn small ghost" onClick={()=>del(m.id)}>Remove</button></div>)}</div><form className="card form" onSubmit={add}><h3>Invite team member</h3><label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Role<input value={form.role} onChange={e=>setForm({...form,role:e.target.value})}/></label><button className="btn block">Add member</button></form></div></>
}

function BrandingTab({ biz, reload }){
  const [form, setForm] = useState(null); const [avail, setAvail] = useState([])
  useEffect(()=>{ if(biz) setForm({...biz}); api('/api/availability').then(setAvail).catch(()=>{}) },[biz?.id])
  if(!form) return null
  async function save(e){ e.preventDefault(); await api('/api/business',{method:'PATCH', body: JSON.stringify({ name:form.name, tagline:form.tagline, color:form.color, timezone:form.timezone, logoText:form.logoText })}); alert('Branding saved — check your public page'); reload() }
  async function saveAvail(){ await api('/api/availability',{method:'PUT', body: JSON.stringify(avail)}); alert('Availability saved') }
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return <><h1>White-label branding & availability</h1><div className="grid2"><form className="card form" onSubmit={save}><h3>Branding (client portal)</h3><label>Business name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Tagline<input value={form.tagline} onChange={e=>setForm({...form,tagline:e.target.value})}/></label><div className="row"><label>Brand colour<input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></label><label>Logo letter<input maxLength={2} value={form.logoText} onChange={e=>setForm({...form,logoText:e.target.value})}/></label></div><label>Your timezone<select value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})}>{TIMEZONES.map(t=><option key={t}>{t}</option>)}</select></label><button className="btn block">Save branding</button><p className="muted">Public URL slug: /book/{form.slug} (fixed after signup)</p></form>
  <div className="card"><h3>Weekly availability</h3>{[0,1,2,3,4,5,6].map(dow=>{ const a = avail.find(x=>x.dayOfWeek===dow) || { dayOfWeek:dow, start:'09:00', end:'17:00', enabled:false }; return <div key={dow} className="avail-row"><label><input type="checkbox" checked={!!a.enabled} onChange={e=>{ const next = avail.filter(x=>x.dayOfWeek!==dow); next.push({...a, enabled:e.target.checked}); setAvail(next) }}/> {days[dow]}</label><input type="time" value={a.start} onChange={e=>{ const next=avail.filter(x=>x.dayOfWeek!==dow); next.push({...a,start:e.target.value}); setAvail(next) }}/> → <input type="time" value={a.end} onChange={e=>{ const next=avail.filter(x=>x.dayOfWeek!==dow); next.push({...a,end:e.target.value}); setAvail(next) }}/></div> })}<button className="btn block" onClick={saveAvail}>Save availability</button></div></div></>
}

/* ---------- PUBLIC BOOKING ---------- */
function PublicBooking({ slug }){
  const [data, setData] = useState(null); const [err, setErr] = useState('')
  const [serviceId, setServiceId] = useState(''); const [date, setDate] = useState(new Date().toISOString().slice(0,10)); const [slots, setSlots] = useState([]); const [slot, setSlot] = useState(null)
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi')
  const [form, setForm] = useState({ clientName:'', clientEmail:'', clientPhone:'', notes:'' }); const [done, setDone] = useState(null); const [teamId, setTeamId] = useState('')
  useEffect(()=>{ api(`/api/public/${slug}`).then(d=>{ setData(d); if(d.services[0]) setServiceId(d.services[0].id) }).catch(e=>setErr(e.message)) },[slug])
  useEffect(()=>{ if(!serviceId || !date) return; api(`/api/public/${slug}/slots?date=${date}&serviceId=${serviceId}`).then(r=>setSlots(r.slots)).catch(()=>setSlots([])) },[slug, serviceId, date])
  async function book(e){ e.preventDefault(); if(!slot) return alert('Pick a time slot first'); const r = await api(`/api/public/${slug}/book`,{method:'POST', body: JSON.stringify({ serviceId, start: slot.start, timezone: tz, teamMemberId: teamId||undefined, ...form })}); localStorage.setItem('bf_client_email', form.clientEmail); setDone(r) }
  if(err) return <div className="auth-wrap"><div className="auth-card"><h2>Not found</h2><p>{err}</p><p>Try the demo: <a href="#/book/mindful-therapy">/book/mindful-therapy</a></p></div></div>
  if(!data) return <div className="center pad">Loading booking page…</div>
  const biz = data.business; const svc = data.services.find(s=>s.id===serviceId)
  if(done) return <div className="auth-wrap"><div className="auth-card wide"><div className="success">✅</div><h2>You're booked, {done.booking.clientName.split(' ')[0]}!</h2><p><b>{svc?.name}</b> at {biz.name}<br/>{new Date(done.booking.start).toLocaleString()} ({done.booking.timezone})</p><p className="muted">Confirmation email sent to {done.booking.clientEmail} (mock log in dashboard → Emails). </p><div className="row"><a className="btn" href={`${API_BASE}/api/bookings/${done.booking.id}/ics`}>Download .ics</a><a className="btn ghost" href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent((svc?.name||'Booking')+' — '+biz.name)}&dates=${done.booking.start.replace(/[-:]/g,'').replace(/\.\d{3}/,'')}/${done.booking.end.replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`} target="_blank" rel="noreferrer">Add to Google Calendar</a></div><a className="btn block" style={{marginTop:10}} href={`#/portal/${slug}`}>📅 View my bookings &amp; my calendar</a><button className="btn ghost block" onClick={()=>{setDone(null); setSlot(null)}}>Book another</button></div></div>
  return <div className="booking-page" style={{'--brand': biz.color}}>
    <header className="book-head" style={{background: biz.color}}><div className="avatar large" style={{background:'rgba(255,255,255,.25)'}}>{biz.logoText}</div><h1>{biz.name}</h1><p>{biz.tagline}</p><small>Powered by BookFlow • White-label client portal</small><div style={{marginTop:8}}><a className="btn small" style={{background:'rgba(255,255,255,.9)',color:'#0f172a'}} href={`#/portal/${slug}`}>🧑 My bookings &amp; calendar</a></div></header>
    <div className="book-grid">
      <div className="card"><h3>1. Choose a service</h3>{data.services.map(s=><button key={s.id} className={serviceId===s.id?'service active':'service'} onClick={()=>setServiceId(s.id)}><b>{s.name}</b><span>${s.price} • {s.duration} min • +{s.bufferBefore+s.bufferAfter} min buffer</span><small>{s.description}</small></button>)}
      <h3 style={{marginTop:20}}>2. Practitioner (optional)</h3><select value={teamId} onChange={e=>setTeamId(e.target.value)}><option value="">First available</option>{data.team.map(m=><option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}</select>
      <label>Your timezone<select value={tz} onChange={e=>setTz(e.target.value)}>{TIMEZONES.map(t=><option key={t}>{t}</option>)}</select></label><p className="muted">Business is in {biz.timezone}. Times below are shown in business time — your timezone is saved with the booking so reminders are correct.</p></div>
      <div className="card"><h3>3. Pick date & time</h3><input type="date" value={date} min={new Date().toISOString().slice(0,10)} onChange={e=>{setDate(e.target.value); setSlot(null)}} />{slots.length===0?<p className="muted">No slots on this day (closed, fully booked, or buffers block the day). Try another date.</p>:<div className="slots">{slots.map(s=><button key={s.start} className={slot?.start===s.start?'slot active':'slot'} onClick={()=>setSlot(s)}>{s.label}</button>)}</div>}
      {slot && <form onSubmit={book} className="form" style={{marginTop:16}}><h3>4. Your details</h3><label>Name<input required value={form.clientName} onChange={e=>setForm({...form,clientName:e.target.value})}/></label><label>Email (confirmation goes here)<input required type="email" value={form.clientEmail} onChange={e=>setForm({...form,clientEmail:e.target.value})}/></label><label>Phone<input value={form.clientPhone} onChange={e=>setForm({...form,clientPhone:e.target.value})}/></label><label>Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><button className="btn block large" style={{background:biz.color}}>Confirm booking — {svc?.name} at {slot.label}</button></form>}</div>
    </div>
  </div>
}

/* ---------- CLIENTS (dashboard) ---------- */
function ClientsTab({ clients, bookings, biz }){
  const [q, setQ] = useState(''); const [open, setOpen] = useState('')
  const list = clients.filter(c=> (c.name+' '+c.email+' '+(c.phone||'')).toLowerCase().includes(q.toLowerCase()))
  return <div><h1>Clients</h1><p className="muted">Saved automatically whenever a client books — name, email and phone are stored from their booking. Click a client to see their bookings.</p>
  <input placeholder="Search clients…" value={q} onChange={e=>setQ(e.target.value)} style={{marginBottom:14}} />
  {list.length===0 && <div className="card">No clients yet. Share your booking link and clients will appear here after their first booking:<br/><code>{window.location.origin}{window.location.pathname}#/book/{biz?.slug}</code></div>}
  {list.map(c=>{ const mine = bookings.filter(b=> (b.clientEmail||'').toLowerCase()===c.email.toLowerCase()); return <div key={c.id} className="card" style={{marginBottom:10}}>
    <div className="booking-row" style={{cursor:'pointer'}} onClick={()=>setOpen(open===c.id?'':c.id)}>
      <div className="avatar" style={{background: biz?.color||'#0f766e'}}>{(c.name||'?').trim().charAt(0).toUpperCase()}</div>
      <div className="grow"><b>{c.name}</b><small>{c.email}{c.phone? ' • '+c.phone : ''}</small></div>
      <span className="badge confirmed">{c.totalBookings} booking{c.totalBookings===1?'':'s'}</span>
      {c.nextBooking && <span className="badge">Next: {new Date(c.nextBooking).toLocaleString()}</span>}
    </div>
    {open===c.id && <div style={{marginTop:10}}>{mine.length===0 ? <p className="muted">No bookings found.</p> : mine.map(b=><div key={b.id} className="booking-row"><div className="dot" style={{background:b.service?.color||'#0f766e'}}></div><div className="grow"><b>{b.service?.name||'Session'}</b><small>{new Date(b.start).toLocaleString()} • {b.timezone}</small></div><span className={`badge ${b.status}`}>{b.status}</span></div>)}
    <p className="muted" style={{marginTop:8}}>Client's own page: <code>{window.location.origin}{window.location.pathname}#/portal/{biz?.slug}</code> (they open it with their email)</p></div>}
  </div> })}
  </div>
}

/* ---------- CLIENT PORTAL (public) ---------- */
function ClientPortal({ slug }){
  const [email, setEmail] = useState(localStorage.getItem('bf_client_email')||'')
  const [data, setData] = useState(null); const [err, setErr] = useState(''); const [view, setView] = useState('list'); const [calDate, setCalDate] = useState(new Date())
  async function lookup(e){ e?.preventDefault(); setErr(''); try{ const d = await api(`/api/public/${slug}/my-bookings`, { method:'POST', body: JSON.stringify({ email }) }); if(!d.client && d.bookings.length===0){ setErr('No bookings found for that email at this business. Check the email you booked with.'); setData(null); return } localStorage.setItem('bf_client_email', email); setData(d) }catch(ex){ setErr(ex.message) } }
  async function cancel(id){ if(!confirm('Cancel this booking?')) return; await api(`/api/public/${slug}/cancel-booking`, { method:'POST', body: JSON.stringify({ bookingId: id, email }) }); lookup() }
  useEffect(()=>{ if(email) lookup() },[])
  const biz = data?.business
  const events = useMemo(()=> (data?.bookings||[]).filter(b=>b.status!=='cancelled').map(b=>({ id:b.id, title:`${b.service?.name||'Session'} — ${biz?.name||''}`, start:new Date(b.start), end:new Date(b.end), resource:b })),[data])
  const upcoming = (data?.bookings||[]).filter(b=> b.status!=='cancelled' && new Date(b.start) > new Date())
  const past = (data?.bookings||[]).filter(b=> b.status==='cancelled' || new Date(b.start) <= new Date())
  return <div className="booking-page" style={{'--brand': biz?.color||'#0f766e'}}>
    <header className="book-head" style={{background: biz?.color||'#0f766e'}}><div className="avatar large" style={{background:'rgba(255,255,255,.25)'}}>{biz?.logoText||'B'}</div><h1>{biz?.name||'My Bookings'}</h1><p>{biz? biz.tagline : 'Client portal'} — your bookings &amp; calendar</p><small><a style={{color:'#fff',textDecoration:'underline'}} href={`#/book/${slug}`}>← Book a new session</a></small></header>
    <div style={{maxWidth:860, margin:'22px auto', padding:'0 16px'}}>
      <form onSubmit={lookup} className="card form"><h3>Find my bookings</h3><label>Your booking email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></label><button className="btn block">Show my bookings</button>{err && <p className="error">{err}</p>}</form>
      {data && data.client && <div className="card" style={{marginTop:16}}><h3>👤 My saved details</h3><p><b>{data.client.name}</b><br/>{data.client.email}{data.client.phone? <><br/>{data.client.phone}</> : null}</p><p className="muted">These details were saved from your bookings. They are used only for your appointments with {biz?.name}.</p></div>}
      {data && <div style={{marginTop:16}}>
        <div className="row" style={{marginBottom:12}}><button className={view==='list'?'btn':'btn ghost'} onClick={()=>setView('list')}>📋 My bookings</button><button className={view==='calendar'?'btn':'btn ghost'} onClick={()=>setView('calendar')}>📅 My calendar</button></div>
        {view==='calendar' && <div className="calendar-wrap"><Calendar localizer={localizer} events={events} startAccessor="start" endAccessor="end" date={calDate} view="month" onNavigate={setCalDate} style={{height:520}} eventPropGetter={(ev)=>({ style:{ backgroundColor: ev.resource.service?.color||biz?.color||'#0f766e', borderRadius:8, border:'none' } })} /></div>}
        {view==='list' && <div>
          <h3>Upcoming</h3>{upcoming.length===0 && <p className="muted">No upcoming bookings.</p>}
          {upcoming.map(b=><div key={b.id} className="booking-row card" style={{marginBottom:8}}><div className="dot" style={{background:b.service?.color||'#0f766e'}}></div><div className="grow"><b>{b.service?.name||'Session'} — {biz?.name}</b><small>{new Date(b.start).toLocaleString()} • {b.service?.duration} min • {b.timezone}{b.teamMember? ' • with '+b.teamMember.name : ''}</small></div><a className="btn small ghost" href={`${API_BASE}/api/bookings/${b.id}/ics`}>↓ .ics</a><button className="btn small ghost" onClick={()=>cancel(b.id)}>Cancel</button></div>)}
          {past.length>0 && <><h3 style={{marginTop:18}}>Past &amp; cancelled</h3>{past.map(b=><div key={b.id} className="booking-row card" style={{marginBottom:8,opacity:.65}}><div className="dot" style={{background:'#94a3b8'}}></div><div className="grow"><b>{b.service?.name||'Session'}</b><small>{new Date(b.start).toLocaleString()}</small></div><span className={`badge ${b.status}`}>{b.status}</span></div>)}</>}
        </div>}
      </div>}
    </div>
  </div>
}

