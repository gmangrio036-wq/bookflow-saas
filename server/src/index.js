require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { load, save } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { return res.status(401).json({ error: 'Invalid token' }); }
}
function slugify(s){ return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function sendEmail(db, to, subject, body) {
  const email = { id: uuidv4(), to, subject, body, at: new Date().toISOString(), provider: process.env.SMTP_HOST ? 'smtp' : 'mock-console' };
  db.emails.push(email);
  console.log(`\n📧 [EMAIL ${email.provider}] To: ${to} | ${subject}\n${body}\n`);
  return email;
}
function seedDemo(db) {
  if (db.users.length) return;
  const hash = bcrypt.hashSync('demo1234', 10);
  const userId = uuidv4();
  const bizId = uuidv4();
  db.users.push({ id: userId, email: 'demo@bookflow.app', passwordHash: hash, name: 'Dr. Sarah Khan', createdAt: new Date().toISOString() });
  db.businesses.push({ id: bizId, ownerId: userId, name: 'Mindful Therapy Studio', slug: 'mindful-therapy', tagline: 'Therapy that fits your life', color: '#0f766e', logoText: 'M', timezone: 'Asia/Karachi', plan: 'free', stripeCustomerId: null });
  const svc1 = uuidv4(), svc2 = uuidv4(), svc3 = uuidv4();
  db.services.push(
    { id: svc1, businessId: bizId, name: 'Individual Therapy', duration: 50, price: 80, bufferBefore: 10, bufferAfter: 10, color: '#0f766e', description: 'One-to-one session, in-person or video.', active: true },
    { id: svc2, businessId: bizId, name: 'Couples Counselling', duration: 75, price: 120, bufferBefore: 15, bufferAfter: 15, color: '#7c3aed', description: 'For couples — communication & conflict.', active: true },
    { id: svc3, businessId: bizId, name: 'Initial Consultation', duration: 30, price: 0, bufferBefore: 5, bufferAfter: 5, color: '#ea580c', description: 'Free discovery call.', active: true },
  );
  // availability Mon-Fri 9-17
  [1,2,3,4,5].forEach(dow => db.availability.push({ id: uuidv4(), businessId: bizId, dayOfWeek: dow, start: '09:00', end: '17:00', enabled: true }));
  db.team.push(
    { id: uuidv4(), businessId: bizId, name: 'Dr. Sarah Khan', email: 'demo@bookflow.app', role: 'Owner / Therapist', color: '#0f766e' },
    { id: uuidv4(), businessId: bizId, name: 'James Patel', email: 'james@mindful.example', role: 'Psychologist', color: '#2563eb' },
    { id: uuidv4(), businessId: bizId, name: 'Aisha Noor', email: 'aisha@mindful.example', role: 'Counsellor', color: '#db2777' },
  );
  const now = new Date();
  const mk = (days, hour, svc, client) => { const d = new Date(now); d.setDate(d.getDate()+days); d.setHours(hour,0,0,0); const e = new Date(d.getTime()+50*60000); return { id: uuidv4(), businessId: bizId, serviceId: svc, clientName: client, clientEmail: client.toLowerCase().replace(/\s/g,'')+'@example.com', start: d.toISOString(), end: e.toISOString(), timezone: 'Asia/Karachi', status: 'confirmed', notes: '' }; };
  db.bookings.push(mk(0,10,svc1,'Emma Wilson'), mk(0,14,svc2,'Liam & Sofia Chen'), mk(1,11,svc1,'Noah Ahmed'), mk(2,9,svc3,'Olivia Brown'), mk(3,15,svc1,'Mia Johnson'));
  save(db);
}
{ const db = load(); seedDemo(db); }

// --- Health ---
app.get('/api/health', (req,res)=> res.json({ ok:true, stripe: !!stripe, time: new Date().toISOString() }));

// --- Auth ---
app.post('/api/auth/register', (req,res)=>{
  const { email, password, name, businessName } = req.body || {};
  if(!email || !password || !name) return res.status(400).json({ error:'Name, email, password required' });
  const db = load();
  if(db.users.find(u=>u.email===email.toLowerCase())) return res.status(400).json({ error:'Email already registered' });
  const userId = uuidv4(); const bizId = uuidv4();
  const hash = bcrypt.hashSync(password,10);
  const bizName = businessName || `${name}'s Practice`;
  let slug = slugify(bizName); let i=1; while(db.businesses.find(b=>b.slug===slug)){ slug = slugify(bizName)+'-'+(++i); }
  db.users.push({ id:userId, email: email.toLowerCase(), passwordHash: hash, name, createdAt: new Date().toISOString() });
  db.businesses.push({ id: bizId, ownerId: userId, name: bizName, slug, tagline:'Book in under a minute', color:'#0f766e', logoText: bizName[0]||'B', timezone:'Asia/Karachi', plan:'free', stripeCustomerId:null });
  [1,2,3,4,5].forEach(dow=> db.availability.push({ id: uuidv4(), businessId: bizId, dayOfWeek:dow, start:'09:00', end:'17:00', enabled:true }));
  db.team.push({ id: uuidv4(), businessId: bizId, name, email: email.toLowerCase(), role:'Owner', color:'#0f766e' });
  db.services.push({ id: uuidv4(), businessId: bizId, name:'Standard Session', duration:60, price:60, bufferBefore:10, bufferAfter:10, color:'#0f766e', description:'Your first service — edit me.', active:true });
  save(db);
  const token = jwt.sign({ userId, email, businessId: bizId }, JWT_SECRET, { expiresIn:'7d' });
  res.json({ token, user:{ id:userId, name, email }, business: db.businesses.find(b=>b.id===bizId) });
});
app.post('/api/auth/login', (req,res)=>{
  const { email, password } = req.body||{};
  const db = load(); const user = db.users.find(u=>u.email===(email||'').toLowerCase());
  if(!user || !bcrypt.compareSync(password||'', user.passwordHash)) return res.status(401).json({ error:'Invalid email or password. Try demo@bookflow.app / demo1234' });
  const biz = db.businesses.find(b=>b.ownerId===user.id);
  const token = jwt.sign({ userId:user.id, email:user.email, businessId: biz?.id }, JWT_SECRET, { expiresIn:'7d' });
  res.json({ token, user:{ id:user.id, name:user.name, email:user.email }, business: biz });
});
app.get('/api/me', auth, (req,res)=>{ const db=load(); const user=db.users.find(u=>u.id===req.user.userId); const biz=db.businesses.find(b=>b.id===req.user.businessId); res.json({ user:{id:user.id,name:user.name,email:user.email}, business:biz }); });

// --- Business / Branding ---
app.get('/api/business', auth, (req,res)=>{ const db=load(); res.json(db.businesses.find(b=>b.id===req.user.businessId)); });
app.patch('/api/business', auth, (req,res)=>{ const db=load(); const biz=db.businesses.find(b=>b.id===req.user.businessId); Object.assign(biz, req.body); save(db); res.json(biz); });

// --- Services ---
app.get('/api/services', auth, (req,res)=>{ const db=load(); res.json(db.services.filter(s=>s.businessId===req.user.businessId)); });
app.post('/api/services', auth, (req,res)=>{ const db=load(); const svc={ id:uuidv4(), businessId:req.user.businessId, active:true, bufferBefore:10, bufferAfter:10, ...req.body }; db.services.push(svc); save(db); res.json(svc); });
app.patch('/api/services/:id', auth, (req,res)=>{ const db=load(); const s=db.services.find(x=>x.id===req.params.id); if(!s) return res.status(404).json({error:'Not found'}); Object.assign(s, req.body); save(db); res.json(s); });
app.delete('/api/services/:id', auth, (req,res)=>{ const db=load(); db.services=db.services.filter(x=>x.id!==req.params.id); save(db); res.json({ok:true}); });

// --- Availability ---
app.get('/api/availability', auth, (req,res)=>{ const db=load(); res.json(db.availability.filter(a=>a.businessId===req.user.businessId)); });
app.put('/api/availability', auth, (req,res)=>{ const db=load(); db.availability=db.availability.filter(a=>a.businessId!==req.user.businessId); (req.body||[]).forEach(a=> db.availability.push({ id:uuidv4(), businessId:req.user.businessId, ...a })); save(db); res.json(db.availability.filter(a=>a.businessId===req.user.businessId)); });

// --- Team ---
app.get('/api/team', auth, (req,res)=>{ const db=load(); res.json(db.team.filter(t=>t.businessId===req.user.businessId)); });
app.post('/api/team', auth, (req,res)=>{ const db=load(); const biz=db.businesses.find(b=>b.id===req.user.businessId); if(biz.plan==='free' && db.team.filter(t=>t.businessId===biz.id).length>=2) return res.status(402).json({ error:'Free plan: 2 team members max. Upgrade to Pro for unlimited team.' }); const m={ id:uuidv4(), businessId:req.user.businessId, color:'#0f766e', ...req.body }; db.team.push(m); save(db); res.json(m); });
app.delete('/api/team/:id', auth, (req,res)=>{ const db=load(); db.team=db.team.filter(t=>t.id!==req.params.id); save(db); res.json({ok:true}); });

// --- Bookings (owner) ---
app.get('/api/bookings', auth, (req,res)=>{ const db=load(); const list=db.bookings.filter(b=>b.businessId===req.user.businessId).sort((a,b)=> new Date(a.start)-new Date(b.start)); res.json(list.map(b=> ({...b, service: db.services.find(s=>s.id===b.serviceId)}))); });
app.patch('/api/bookings/:id', auth, (req,res)=>{ const db=load(); const b=db.bookings.find(x=>x.id===req.params.id); if(!b) return res.status(404).json({error:'Not found'}); Object.assign(b, req.body); save(db); res.json(b); });
app.delete('/api/bookings/:id', auth, (req,res)=>{ const db=load(); db.bookings=db.bookings.filter(x=>x.id!==req.params.id); save(db); res.json({ok:true}); });

// --- Public booking ---
app.get('/api/public/:slug', (req,res)=>{
  const db=load(); const biz=db.businesses.find(b=>b.slug===req.params.slug);
  if(!biz) return res.status(404).json({ error:'Business not found' });
  res.json({ business:biz, services: db.services.filter(s=>s.businessId===biz.id && s.active), availability: db.availability.filter(a=>a.businessId===biz.id), team: db.team.filter(t=>t.businessId===biz.id) });
});
app.get('/api/public/:slug/slots', (req,res)=>{
  const { date, serviceId } = req.query; // date YYYY-MM-DD
  const db=load(); const biz=db.businesses.find(b=>b.slug===req.params.slug); if(!biz) return res.status(404).json({error:'Not found'});
  const svc=db.services.find(s=>s.id===serviceId); if(!svc) return res.status(400).json({error:'Service required'});
  const d = new Date(date+'T12:00:00'); const dow = d.getDay();
  const avail = db.availability.find(a=>a.businessId===biz.id && a.dayOfWeek===dow && a.enabled);
  if(!avail) return res.json({ slots: [] });
  const slots=[];
  const [sh,sm]=avail.start.split(':').map(Number); const [eh,em]=avail.end.split(':').map(Number);
  let cur = new Date(date+'T00:00:00'); cur.setHours(sh,sm,0,0);
  const endDay = new Date(date+'T00:00:00'); endDay.setHours(eh,em,0,0);
  const dayBookings = db.bookings.filter(b=> b.businessId===biz.id && b.status!=='cancelled' && b.start.startsWith(date));
  while(true){
    const slotEnd = new Date(cur.getTime() + svc.duration*60000);
    if(slotEnd > endDay) break;
    const bufferedStart = new Date(cur.getTime() - (svc.bufferBefore||0)*60000);
    const bufferedEnd = new Date(slotEnd.getTime() + (svc.bufferAfter||0)*60000);
    const clash = dayBookings.some(b=> { const bs=new Date(b.start), be=new Date(b.end); return bufferedStart < be && bufferedEnd > bs; });
    const isPast = cur < new Date();
    if(!clash && !isPast) slots.push({ start: cur.toISOString(), end: slotEnd.toISOString(), label: cur.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) });
    cur = new Date(cur.getTime() + 30*60000); // 30-min grid
  }
  res.json({ slots, timezone: biz.timezone, service: svc });
});
app.post('/api/public/:slug/book', (req,res)=>{
  const { serviceId, start, clientName, clientEmail, clientPhone, notes, timezone, teamMemberId } = req.body||{};
  const db=load(); const biz=db.businesses.find(b=>b.slug===req.params.slug); if(!biz) return res.status(404).json({error:'Not found'});
  const svc=db.services.find(s=>s.id===serviceId); if(!svc) return res.status(400).json({error:'Service not found'});
  if(!clientName || !clientEmail || !start) return res.status(400).json({error:'Name, email and time required'});
  const startD=new Date(start); const endD=new Date(startD.getTime()+svc.duration*60000);
  const booking={ id:uuidv4(), businessId:biz.id, serviceId, teamMemberId: teamMemberId||null, clientName, clientEmail, clientPhone:clientPhone||'', start:startD.toISOString(), end:endD.toISOString(), timezone: timezone||biz.timezone, status:'confirmed', notes:notes||'' };
  db.bookings.push(booking);
  if(!db.clients) db.clients=[];
  const _ck = clientEmail.toLowerCase();
  let _cl = db.clients.find(c=>c.businessId===biz.id && (c.email||'').toLowerCase()===_ck);
  if(_cl){ _cl.name=clientName; if(clientPhone) _cl.phone=clientPhone; if(notes) _cl.notes=notes; _cl.updatedAt=new Date().toISOString(); }
  else db.clients.push({ id:uuidv4(), businessId:biz.id, name:clientName, email:clientEmail, phone:clientPhone||'', notes:notes||'', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
  const email = sendEmail(db, clientEmail, `Booking confirmed — ${svc.name} at ${biz.name}`, `Hi ${clientName},\n\nYou're booked!\n${svc.name} with ${biz.name}\nWhen: ${startD.toLocaleString()} (${booking.timezone})\nDuration: ${svc.duration} min\n\nAdd to calendar: ${process.env.CLIENT_URL||'http://localhost:5173'}/api/bookings/${booking.id}/ics\n\n— ${biz.name} via BookFlow`);
  sendEmail(db, biz.name, `New booking: ${clientName} — ${svc.name}`, `New booking from your public page.\nClient: ${clientName} (${clientEmail})\nService: ${svc.name}\nWhen: ${startD.toLocaleString()}`);
  save(db);
  res.json({ booking, emailPreview: email });
});


// --- Clients (saved automatically from bookings) ---
function clientStats(db, bizId, email){
  const bs = db.bookings.filter(b=>b.businessId===bizId && (b.clientEmail||'').toLowerCase()===email.toLowerCase());
  const live = bs.filter(b=>b.status!=='cancelled');
  const upcoming = live.filter(b=> new Date(b.start) > new Date()).sort((a,b)=> new Date(a.start)-new Date(b.start));
  return { totalBookings: live.length, upcomingCount: upcoming.length, nextBooking: upcoming[0]?.start||null, lastBooking: bs.length? bs.slice().sort((a,b)=> new Date(b.start)-new Date(a.start))[0].start : null };
}
app.get('/api/clients', auth, (req,res)=>{
  const db=load(); const bizId=req.user.businessId; if(!db.clients) db.clients=[];
  const byEmail = new Map();
  for(const c of db.clients.filter(c=>c.businessId===bizId)) byEmail.set(c.email.toLowerCase(), { ...c });
  for(const b of db.bookings.filter(x=>x.businessId===bizId)){
    const k=(b.clientEmail||'').toLowerCase(); if(!k) continue;
    if(!byEmail.has(k)) byEmail.set(k, { id:'derived-'+k, businessId:bizId, name:b.clientName, email:b.clientEmail, phone:b.clientPhone||'', notes:b.notes||'', createdAt:b.start, updatedAt:b.start });
  }
  const list=[...byEmail.values()].map(c=> ({ ...c, ...clientStats(db, bizId, c.email) }));
  res.json(list.sort((a,b)=> (b.upcomingCount-a.upcomingCount) || (b.totalBookings-a.totalBookings)));
});

// --- Client portal (public): clients see their own bookings + calendar ---
app.post('/api/public/:slug/my-bookings', (req,res)=>{
  const { email } = req.body||{}; const db=load(); const biz=db.businesses.find(b=>b.slug===req.params.slug);
  if(!biz) return res.status(404).json({error:'Not found'}); if(!email) return res.status(400).json({error:'Email required'});
  const key=email.toLowerCase();
  const list=db.bookings.filter(b=>b.businessId===biz.id && (b.clientEmail||'').toLowerCase()===key)
    .sort((a,b)=> new Date(a.start)-new Date(b.start))
    .map(b=> ({ ...b, service: db.services.find(s=>s.id===b.serviceId)||null, teamMember: db.team.find(t=>t.id===b.teamMemberId)||null }));
  const stored=(db.clients||[]).find(c=>c.businessId===biz.id && (c.email||'').toLowerCase()===key);
  const client = stored || (list[0] ? { name:list[0].clientName, email, phone:list[0].clientPhone||'' } : null);
  res.json({ business: biz, client, bookings: list });
});
app.post('/api/public/:slug/cancel-booking', (req,res)=>{
  const { bookingId, email } = req.body||{}; const db=load(); const biz=db.businesses.find(b=>b.slug===req.params.slug);
  if(!biz) return res.status(404).json({error:'Not found'});
  const b=db.bookings.find(x=>x.id===bookingId && x.businessId===biz.id);
  if(!b || (b.clientEmail||'').toLowerCase()!==(email||'').toLowerCase()) return res.status(404).json({error:'Booking not found for that email'});
  b.status='cancelled'; save(db); res.json({ ok:true });
});

// --- Calendar sync / ICS ---
app.get('/api/bookings/:id/ics', (req,res)=>{
  const db=load(); const b=db.bookings.find(x=>x.id===req.params.id); if(!b) return res.status(404).send('Not found');
  const svc=db.services.find(s=>s.id===b.serviceId); const biz=db.businesses.find(x=>x.id===b.businessId);
  const fmt=(iso)=> iso.replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BookFlow//EN','BEGIN:VEVENT',`UID:${b.id}@bookflow`,`DTSTAMP:${fmt(new Date().toISOString())}`,`DTSTART:${fmt(b.start)}`,`DTEND:${fmt(b.end)}`,`SUMMARY:${svc?.name||'Booking'} — ${biz?.name||''}`,`DESCRIPTION:Client: ${b.clientName} ${b.clientEmail}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  res.setHeader('Content-Type','text/calendar'); res.setHeader('Content-Disposition',`attachment; filename=booking-${b.id}.ics`); res.send(ics);
});
app.get('/api/calendar/feed/:slug.ics', (req,res)=>{
  const db=load(); const biz=db.businesses.find(b=>b.slug===req.params.slug); if(!biz) return res.status(404).send('Not found');
  const fmt=(iso)=> iso.replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  let events=db.bookings.filter(b=>b.businessId===biz.id && b.status!=='cancelled').map(b=>{ const svc=db.services.find(s=>s.id===b.serviceId); return ['BEGIN:VEVENT',`UID:${b.id}@bookflow`,`DTSTAMP:${fmt(new Date().toISOString())}`,`DTSTART:${fmt(b.start)}`,`DTEND:${fmt(b.end)}`,`SUMMARY:${svc?.name||'Booking'} — ${b.clientName}`,'END:VEVENT'].join('\r\n'); }).join('\r\n');
  res.setHeader('Content-Type','text/calendar'); res.send(['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BookFlow//EN',events,'END:VCALENDAR'].join('\r\n'));
});

// --- Billing / Stripe test mode ---
app.get('/api/billing/plans', (req,res)=> res.json([
  { id:'free', name:'Free', price:0, features:['1 calendar','Up to 30 bookings/mo','Public booking page','Email confirmations'] },
  { id:'pro', name:'Pro', price:19, priceId: process.env.STRIPE_PRICE_PRO||null, features:['Unlimited bookings','Buffer times','White-label branding','Calendar sync (.ics + Google)','Client portal'] },
  { id:'team', name:'Team', price:49, priceId: process.env.STRIPE_PRICE_TEAM||null, features:['Everything in Pro','Unlimited team members','Subscription packages for clients','API access','Priority support'] },
]));
app.post('/api/billing/checkout', auth, async (req,res)=>{
  const { plan } = req.body||{}; const db=load(); const biz=db.businesses.find(b=>b.id===req.user.businessId); const user=db.users.find(u=>u.id===req.user.userId);
  if(!stripe){
    // Demo mode: instantly upgrade locally so MVP is testable without keys
    biz.plan = plan; save(db);
    return res.json({ demoMode:true, message:'Stripe not configured — upgraded in DEMO mode. Add STRIPE_SECRET_KEY for real test checkout.', business: biz });
  }
  try{
    const priceId = plan==='team' ? process.env.STRIPE_PRICE_TEAM : process.env.STRIPE_PRICE_PRO;
    if(!priceId) return res.status(400).json({ error:'Set STRIPE_PRICE_PRO / STRIPE_PRICE_TEAM in server/.env' });
    const session = await stripe.checkout.sessions.create({ mode:'subscription', customer_email: user.email, line_items:[{ price: priceId, quantity:1 }], success_url:(process.env.CLIENT_URL||'http://localhost:5173')+'/?billing=success', cancel_url:(process.env.CLIENT_URL||'http://localhost:5173')+'/?billing=cancelled', metadata:{ businessId: biz.id, plan } });
    res.json({ url: session.url });
  }catch(e){ res.status(500).json({ error: e.message }); }
});
app.get('/api/emails', auth, (req,res)=>{ const db=load(); res.json(db.emails.slice(-20).reverse()); });

// Serve built client in production
const clientDist = path.join(__dirname, '../../client/dist');
if(fs.existsSync(clientDist)){ app.use(express.static(clientDist)); app.get('*', (req,res)=>{ if(req.path.startsWith('/api')) return res.status(404).json({error:'Not found'}); res.sendFile(path.join(clientDist,'index.html')); }); }

app.listen(PORT, ()=> console.log(`🚀 BookFlow API on http://localhost:${PORT} | Stripe: ${stripe?'TEST MODE ON':'demo mode (no key)'} | Demo login: demo@bookflow.app / demo1234`));
