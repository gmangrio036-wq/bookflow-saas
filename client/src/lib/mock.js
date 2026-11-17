// In-browser demo fallback — used ONLY when the real API is unreachable
// (e.g. Netlify frontend live before Render backend). Data lives in localStorage.
const KEY = 'bf_mock_db_v1'
function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36) }
function seed(){
  const bizId = 'demo-biz', userId = 'demo-user'
  const s1=uid(), s2=uid(), s3=uid()
  const now = new Date()
  const mk=(days,hour,svc,client)=>{ const d=new Date(now); d.setDate(d.getDate()+days); d.setHours(hour,0,0,0); const e=new Date(d.getTime()+50*60000); return { id:uid(), businessId:bizId, serviceId:svc, clientName:client, clientEmail:client.toLowerCase().replace(/\s/g,'')+'@example.com', start:d.toISOString(), end:e.toISOString(), timezone:'Asia/Karachi', status:'confirmed', notes:'' } }
  return {
    users:[{id:userId,email:'demo@bookflow.app',password:'demo1234',name:'Dr. Sarah Khan'}],
    businesses:[{id:bizId,ownerId:userId,name:'Mindful Therapy Studio',slug:'mindful-therapy',tagline:'Therapy that fits your life',color:'#0f766e',logoText:'M',timezone:'Asia/Karachi',plan:'free'}],
    services:[
      {id:s1,businessId:bizId,name:'Individual Therapy',duration:50,price:80,bufferBefore:10,bufferAfter:10,color:'#0f766e',description:'One-to-one session, in-person or video.',active:true},
      {id:s2,businessId:bizId,name:'Couples Counselling',duration:75,price:120,bufferBefore:15,bufferAfter:15,color:'#7c3aed',description:'For couples — communication & conflict.',active:true},
      {id:s3,businessId:bizId,name:'Initial Consultation',duration:30,price:0,bufferBefore:5,bufferAfter:5,color:'#ea580c',description:'Free discovery call.',active:true},
    ],
    availability:[1,2,3,4,5].map(dow=>({id:uid(),businessId:bizId,dayOfWeek:dow,start:'09:00',end:'17:00',enabled:true})),
    team:[
      {id:uid(),businessId:bizId,name:'Dr. Sarah Khan',email:'demo@bookflow.app',role:'Owner / Therapist',color:'#0f766e'},
      {id:uid(),businessId:bizId,name:'James Patel',email:'james@mindful.example',role:'Psychologist',color:'#2563eb'},
      {id:uid(),businessId:bizId,name:'Aisha Noor',email:'aisha@mindful.example',role:'Counsellor',color:'#db2777'},
    ],
    clients:[],
    bookings:[mk(0,10,s1,'Emma Wilson'),mk(0,14,s2,'Liam Chen'),mk(1,11,s1,'Noah Ahmed'),mk(2,9,s3,'Olivia Brown'),mk(3,15,s1,'Mia Johnson')],
    emails:[]
  }
}
function load(){ try{ const raw=localStorage.getItem(KEY); if(raw) return JSON.parse(raw) }catch{} const db=seed(); save(db); return db }
function save(db){ try{ localStorage.setItem(KEY, JSON.stringify(db)) }catch{} }
function currentBiz(db){ try{ const b=JSON.parse(localStorage.getItem('bf_biz')); if(b && db.businesses.find(x=>x.id===b.id)) return db.businesses.find(x=>x.id===b.id) }catch{} return db.businesses[0] }
function slugify(s){ return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') }

export async function mockApi(path, opts={}){
  const db = load()
  const method = (opts.method||'GET').toUpperCase()
  const body = opts.body ? JSON.parse(opts.body) : {}
  const biz = currentBiz(db)
  const withService = b => ({...b, service: db.services.find(s=>s.id===b.serviceId)})

  if(path==='/api/billing/plans') return [
    {id:'free',name:'Free',price:0,features:['1 calendar','Up to 30 bookings/mo','Public booking page','Email confirmations']},
    {id:'pro',name:'Pro',price:19,features:['Unlimited bookings','Buffer times','White-label branding','Calendar sync (.ics + Google)','Client portal']},
    {id:'team',name:'Team',price:49,features:['Everything in Pro','Unlimited team members','Subscription packages for clients','API access','Priority support']},
  ]
  if(path==='/api/auth/login'){
    const u = db.users.find(x=>x.email===(body.email||'').toLowerCase())
    if(!u || u.password!==body.password) throw new Error('Invalid email or password. Try demo@bookflow.app / demo1234')
    const b = db.businesses.find(x=>x.ownerId===u.id) || db.businesses[0]
    return { token:'demo-mode-token', user:{id:u.id,name:u.name,email:u.email}, business:b }
  }
  if(path==='/api/auth/register'){
    if(db.users.find(x=>x.email===(body.email||'').toLowerCase())) throw new Error('Email already registered')
    const userId=uid(), bizId=uid(), bizName=body.businessName||`${body.name}'s Practice`
    db.users.push({id:userId,email:body.email.toLowerCase(),password:body.password,name:body.name})
    const nb={id:bizId,ownerId:userId,name:bizName,slug:slugify(bizName),tagline:'Book in under a minute',color:'#0f766e',logoText:bizName[0]||'B',timezone:'Asia/Karachi',plan:'free'}
    db.businesses.push(nb); [1,2,3,4,5].forEach(dow=>db.availability.push({id:uid(),businessId:bizId,dayOfWeek:dow,start:'09:00',end:'17:00',enabled:true}))
    db.team.push({id:uid(),businessId:bizId,name:body.name,email:body.email.toLowerCase(),role:'Owner',color:'#0f766e'})
    db.services.push({id:uid(),businessId:bizId,name:'Standard Session',duration:60,price:60,bufferBefore:10,bufferAfter:10,color:'#0f766e',description:'Your first service — edit me.',active:true})
    save(db); return { token:'demo-mode-token', user:{id:userId,name:body.name,email:body.email}, business:nb }
  }
  if(path==='/api/me'){ const b=biz; const u=db.users.find(x=>x.id===b.ownerId)||db.users[0]; return { user:{id:u.id,name:u.name,email:u.email}, business:b } }
  if(path==='/api/business' && method==='GET') return biz
  if(path==='/api/business' && method==='PATCH'){ Object.assign(biz, body); save(db); return biz }
  if(path==='/api/services' && method==='GET') return db.services.filter(s=>s.businessId===biz.id)
  if(path==='/api/services' && method==='POST'){ const s={id:uid(),businessId:biz.id,active:true,...body}; db.services.push(s); save(db); return s }
  const svcMatch = path.match(/^\/api\/services\/(.+)$/)
  if(svcMatch && method==='DELETE'){ db.services=db.services.filter(s=>s.id!==svcMatch[1]); save(db); return {ok:true} }
  if(svcMatch && method==='PATCH'){ const s=db.services.find(x=>x.id===svcMatch[1]); Object.assign(s,body); save(db); return s }
  if(path==='/api/availability' && method==='GET') return db.availability.filter(a=>a.businessId===biz.id)
  if(path==='/api/availability' && method==='PUT'){ db.availability=db.availability.filter(a=>a.businessId!==biz.id); (body||[]).forEach(a=>db.availability.push({id:uid(),businessId:biz.id,...a})); save(db); return db.availability.filter(a=>a.businessId===biz.id) }
  if(path==='/api/team' && method==='GET') return db.team.filter(t=>t.businessId===biz.id)
  if(path==='/api/team' && method==='POST'){ if(biz.plan==='free' && db.team.filter(t=>t.businessId===biz.id).length>=2) throw new Error('Free plan: 2 team members max. Upgrade to Pro for unlimited team. (Note: seeded demo starts with 3 — delete one first in demo mode, or upgrade)'); const m={id:uid(),businessId:biz.id,color:'#0f766e',...body}; db.team.push(m); save(db); return m }
  const teamMatch = path.match(/^\/api\/team\/(.+)$/)
  if(teamMatch && method==='DELETE'){ db.team=db.team.filter(t=>t.id!==teamMatch[1]); save(db); return {ok:true} }
  if(path==='/api/bookings' && method==='GET') return db.bookings.filter(b=>b.businessId===biz.id).sort((a,b)=>new Date(a.start)-new Date(b.start)).map(withService)
  const bkMatch = path.match(/^\/api\/bookings\/(.+)$/)
  if(bkMatch && method==='PATCH'){ const b=db.bookings.find(x=>x.id===bkMatch[1]); if(b) Object.assign(b,body); save(db); return b }
  if(bkMatch && method==='DELETE'){ db.bookings=db.bookings.filter(x=>x.id!==bkMatch[1]); save(db); return {ok:true} }
  if(path==='/api/emails') return db.emails.slice(-20).reverse()
  if(path==='/api/clients'){ if(!db.clients) db.clients=[]; const byE=new Map(); for(const c of db.clients.filter(c=>c.businessId===biz.id)) byE.set(c.email.toLowerCase(), {...c}); for(const b of db.bookings.filter(x=>x.businessId===biz.id)){ const k=(b.clientEmail||'').toLowerCase(); if(k && !byE.has(k)) byE.set(k,{id:'derived-'+k,businessId:biz.id,name:b.clientName,email:b.clientEmail,phone:b.clientPhone||'',notes:b.notes||'',createdAt:b.start,updatedAt:b.start}) } return [...byE.values()].map(c=>{ const bs=db.bookings.filter(x=>x.businessId===biz.id && (x.clientEmail||'').toLowerCase()===c.email.toLowerCase()); const live=bs.filter(x=>x.status!=='cancelled'); const up=live.filter(x=>new Date(x.start)>new Date()).sort((a,b2)=>new Date(a.start)-new Date(b2.start)); return {...c, totalBookings:live.length, upcomingCount:up.length, nextBooking:up[0]?.start||null, lastBooking: bs.length? bs.slice().sort((a,b2)=>new Date(b2.start)-new Date(a.start))[0].start : null } }).sort((a,b)=>(b.upcomingCount-a.upcomingCount)||(b.totalBookings-a.totalBookings)) }
  const myMatch = path.match(/^\/api\/public\/([^/]+)\/my-bookings$/)
  if(myMatch && method==='POST'){ const b=db.businesses.find(x=>x.slug===myMatch[1]); const key=(body.email||'').toLowerCase(); const list=db.bookings.filter(x=>x.businessId===b.id && (x.clientEmail||'').toLowerCase()===key).sort((a,b2)=>new Date(a.start)-new Date(b2.start)).map(x=>({...x, service: db.services.find(s2=>s2.id===x.serviceId)||null, teamMember: db.team.find(t=>t.id===x.teamMemberId)||null})); const stored=(db.clients||[]).find(c=>c.businessId===b.id && (c.email||'').toLowerCase()===key); return { business:b, client: stored || (list[0]? {name:list[0].clientName, email:body.email, phone:list[0].clientPhone||''} : null), bookings:list } }
  const cxMatch = path.match(/^\/api\/public\/([^/]+)\/cancel-booking$/)
  if(cxMatch && method==='POST'){ const b=db.businesses.find(x=>x.slug===cxMatch[1]); const bk=db.bookings.find(x=>x.id===body.bookingId && x.businessId===b.id); if(!bk || (bk.clientEmail||'').toLowerCase()!==(body.email||'').toLowerCase()) throw new Error('Booking not found for that email'); bk.status='cancelled'; save(db); return {ok:true} }
  if(path==='/api/billing/checkout'){ biz.plan=body.plan; save(db); return { demoMode:true, message:'Backend is in demo mode — upgraded locally. Real Stripe checkout starts once the Render backend is live.', business:biz } }

  const pubMatch = path.match(/^\/api\/public\/([^/]+)$/)
  if(pubMatch && method==='GET'){ const b=db.businesses.find(x=>x.slug===pubMatch[1]); if(!b) throw new Error('Business not found'); return { business:b, services:db.services.filter(s=>s.businessId===b.id && s.active), availability:db.availability.filter(a=>a.businessId===b.id), team:db.team.filter(t=>t.businessId===b.id) } }
  const slotsMatch = path.match(/^\/api\/public\/([^/]+)\/slots\?(.+)$/)
  if(slotsMatch){ const b=db.businesses.find(x=>x.slug===slotsMatch[1]); const q=new URLSearchParams(slotsMatch[2]); const date=q.get('date'), svc=db.services.find(s=>s.id===q.get('serviceId')); if(!b||!svc) return {slots:[]}; const dow=new Date(date+'T12:00:00').getDay(); const avail=db.availability.find(a=>a.businessId===b.id && a.dayOfWeek===dow && a.enabled); if(!avail) return {slots:[], timezone:b.timezone, service:svc}; const slots=[]; const [sh,sm]=avail.start.split(':').map(Number); const [eh,em]=avail.end.split(':').map(Number); let cur=new Date(date+'T00:00:00'); cur.setHours(sh,sm,0,0); const endDay=new Date(date+'T00:00:00'); endDay.setHours(eh,em,0,0); const dayBookings=db.bookings.filter(x=>x.businessId===b.id && x.status!=='cancelled' && x.start.startsWith(date)); while(true){ const slotEnd=new Date(cur.getTime()+svc.duration*60000); if(slotEnd>endDay) break; const bs=new Date(cur.getTime()-(svc.bufferBefore||0)*60000); const be=new Date(slotEnd.getTime()+(svc.bufferAfter||0)*60000); const clash=dayBookings.some(x=> bs < new Date(x.end) && be > new Date(x.start)); if(!clash && cur>new Date()) slots.push({start:cur.toISOString(),end:slotEnd.toISOString(),label:cur.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}); cur=new Date(cur.getTime()+30*60000) } return {slots, timezone:b.timezone, service:svc} }
  const bookMatch = path.match(/^\/api\/public\/([^/]+)\/book$/)
  if(bookMatch && method==='POST'){ const b=db.businesses.find(x=>x.slug===bookMatch[1]); const svc=db.services.find(s=>s.id===body.serviceId); const startD=new Date(body.start); const endD=new Date(startD.getTime()+svc.duration*60000); const booking={id:uid(),businessId:b.id,serviceId:svc.id,teamMemberId:body.teamMemberId||null,clientName:body.clientName,clientEmail:body.clientEmail,clientPhone:body.clientPhone||'',start:startD.toISOString(),end:endD.toISOString(),timezone:body.timezone||b.timezone,status:'confirmed',notes:body.notes||''}; db.bookings.push(booking); if(!db.clients) db.clients=[]; const _k=(body.clientEmail||'').toLowerCase(); const _c=db.clients.find(c=>c.businessId===b.id && (c.email||'').toLowerCase()===_k); if(_c){ _c.name=body.clientName; if(body.clientPhone) _c.phone=body.clientPhone; _c.updatedAt=new Date().toISOString() } else db.clients.push({id:uid(),businessId:b.id,name:body.clientName,email:body.clientEmail,phone:body.clientPhone||'',notes:body.notes||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}); const email={id:uid(),to:body.clientEmail,subject:`Booking confirmed — ${svc.name} at ${b.name}`,body:`Hi ${body.clientName},\n\nYou're booked! (demo mode — saved in this browser)\n${svc.name} with ${b.name}\nWhen: ${startD.toLocaleString()} (${booking.timezone})`,at:new Date().toISOString(),provider:'demo-mode'}; db.emails.push(email); save(db); return { booking, emailPreview: email } }

  throw new Error('Demo mode: this action is not available until the backend is live')
}
