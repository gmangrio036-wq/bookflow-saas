import { mockApi } from './mock'
const BASE = import.meta.env.VITE_API_URL || '';
export function getToken(){ return localStorage.getItem('bf_token'); }
export function setAuth(data){ localStorage.setItem('bf_token', data.token); localStorage.setItem('bf_user', JSON.stringify(data.user)); localStorage.setItem('bf_biz', JSON.stringify(data.business)); }
export function clearAuth(){ localStorage.removeItem('bf_token'); localStorage.removeItem('bf_user'); localStorage.removeItem('bf_biz'); }
export function getBiz(){ try{ return JSON.parse(localStorage.getItem('bf_biz')); }catch{ return null; } }
export function isDemoMode(){ return sessionStorage.getItem('bf_demo_mode')==='1' }
export async function api(path, opts={}){
  // If backend already known unreachable, go straight to demo fallback
  if (isDemoMode()) return mockApi(path, opts);
  const token = getToken();
  try {
    const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 6000);
    const res = await fetch(BASE+path, { ...opts, signal: ctrl.signal, headers:{ 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}), ...(opts.headers||{}) } });
    clearTimeout(t);
    const ct = res.headers.get('content-type')||'';
    // Render returns plain "Not Found" (non-JSON) when service doesn't exist — treat as backend not live
    if (!ct.includes('application/json')) throw new TypeError('Failed to fetch');
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (e) {
    if (e instanceof TypeError || e.name==='AbortError') {
      console.warn('[BookFlow] Backend unreachable — switching to demo mode (data saved in this browser until Render is live)', path);
      sessionStorage.setItem('bf_demo_mode','1');
      return mockApi(path, opts);
    }
    throw e;
  }
}
export const TIMEZONES = ['Asia/Karachi','Asia/Dubai','Europe/London','Europe/Berlin','America/New_York','America/Chicago','America/Los_Angeles','Australia/Sydney','Asia/Kolkata','UTC'];
