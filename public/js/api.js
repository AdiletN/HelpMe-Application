const token = () => localStorage.getItem('helpme_token');
const currentUser = () => { try { return JSON.parse(localStorage.getItem('helpme_user') || 'null'); } catch { return null; } };
function saveSession(data) { localStorage.setItem('helpme_token', data.token); localStorage.setItem('helpme_user', JSON.stringify(data.user)); }
function logout() { localStorage.removeItem('helpme_token'); localStorage.removeItem('helpme_user'); location.href = '/login.html'; }
function requireLogin() { if (!token()) { location.replace('/login.html'); return false; } return true; }
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token() && !path.startsWith('/auth/')) { logout(); throw new Error('Session expired.'); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const $ = id => document.getElementById(id);
const initials = name => String(name || 'S').trim().split(/\s+/).slice(0,2).map(n => n[0]?.toUpperCase()).join('');
const fmtDate = str => { if (!str) return ''; const d = new Date(str + 'T12:00:00'); return isNaN(d) ? str : d.toLocaleDateString('en-US', { month:'short',day:'numeric',year:'numeric' }); };
const fmtDay = str => new Date(str + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long' });
const statusBadge = s => `<span class="badge ${esc(s)}">${esc(s.charAt(0).toUpperCase()+s.slice(1))}</span>`;
const avatar = (name, size='') => `<span class="avatar ${size}">${esc(initials(name))}</span>`;
const icons = {
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', help:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 list:'<path d="M9 6h13M9 12h13M9 18h13"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
 inbox:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 13h5l2 3h4l2-3h5"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5zM4 19.5v-13A2.5 2.5 0 0 1 6.5 4"/>',
 check:'<path d="M20 6 9 17l-5-5"/>',
 sparkles:'<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM20 17l.5 1.5L22 19l-1.5.5L20 21l-.5-1.5L18 19l1.5-.5z"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
 star:'<path d="m12 2 3 6.3 7 .9-5 4.9 1.3 7-6.3-3.3-6.3 3.3 1.3-7-5-4.9 7-.9z"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 filter:'<path d="M4 7h16M7 12h10M10 17h4"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/>',
 pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
 refresh:'<path d="M3 12a9 9 0 0 1 15-6l3 3M21 3v6h-6M21 12a9 9 0 0 1-15 6l-3-3M3 21v-6h6"/>',
 award:'<circle cx="12" cy="8" r="6"/><path d="m8 13-1 9 5-3 5 3-1-9"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.help}</svg>`;
function showMsg(id, message, type='error') { const el=$(id); if (!el) return; el.textContent=message; el.className='msg '+type; el.scrollIntoView({block:'nearest',behavior:'smooth'}); }
const emptyState = (title, detail, link='', text='') => `<div class="empty">${icon('inbox')}<h3>${esc(title)}</h3><p>${esc(detail)}</p>${link?`<a href="${link}" class="btn soft small">${esc(text||'Get started')} ${icon('arrow')}</a>`:''}</div>`;
function renderNav(active) {
  const me=currentUser()||{};
  const links=[['dashboard.html','Dashboard','home'],['feed.html','Help requests','inbox'],['need-help.html','Ask for help','help'],['helpers.html','Find helpers','users'],['offer-help.html','Offer help','sparkles'],['requests.html','My activity','list'],['profile.html','My profile','user']];
  $('nav').innerHTML=`<div id="scrim" class="scrim"></div><aside id="sidebar" class="sidebar"><a class="brand" href="dashboard.html"><span class="brand-mark">H<small>+</small></span> HelpMe<span style="color:#365cf5">.</span></a><div class="side-label">WORKSPACE</div><div class="side-links">${links.map(([href,title,i])=>`<a class="${active===href?'active':''}" href="${href}">${icon(i)} ${title}</a>`).join('')}</div><div class="side-foot"><a href="#" id="logoutBtn">${icon('logout')} Log out</a><div class="side-foot-note">Students helping students ✦</div></div></aside><header class="topbar"><div class="inline"><button class="mobile-menu" id="menuToggle" aria-label="Open navigation">${icon('menu')}</button><span class="topbar-title">${esc(links.find(v=>v[0]===active)?.[1]||'HelpMe')}</span></div><div class="top-right"><span class="top-tag">${icon('shield')} ${esc(me.specialization||'Student')}</span><a href="profile.html" title="My profile">${avatar(me.full_name)}</a></div></header>`;
  $('logoutBtn').onclick=e=>{e.preventDefault();logout()};
  $('menuToggle').onclick=()=>{$('sidebar').classList.toggle('open');$('scrim').classList.toggle('show');};
  $('scrim').onclick=()=>{$('sidebar').classList.remove('open');$('scrim').classList.remove('show');};
}
const requestMeta = r => `<span>${icon('calendar')} ${esc(fmtDate(r.preferred_date))}</span><span>${icon('clock')} ${esc(r.preferred_time)}</span>${r.study_format?`<span>${icon('pin')} ${esc(r.study_format)}</span>`:''}`;
const personMini = (name, subtitle) => `<div class="person">${avatar(name)} <span><b>${esc(name||'Student')}</b><br>${esc(subtitle||'')}</span></div>`;
