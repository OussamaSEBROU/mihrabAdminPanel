import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, LogOut, Smartphone, BookOpen, Layers, X, ChevronRight, Download, FileSpreadsheet, FileJson, Clock, ShieldCheck, MapPin, RefreshCw, Globe, BarChart3, Library, Languages } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://mihrab-backend.onrender.com/api';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ===== TRANSLATIONS =====
const translations = {
  ar: {
    title: "لوحة تحكم المحراب",
    overview: "نظرة عامة",
    users: "المستخدمون",
    installs: "التثبيتات",
    activeToday: "نشط اليوم",
    now: "الآن",
    totalMinutes: "الدقائق الكلية",
    books: "الكتب",
    shelves: "الرفوف",
    updatedUsers: "محدّثون",
    thisWeek: "هذا الأسبوع",
    recentActivity: "آخر النشاطات",
    connected: "متصل",
    userNode: "مستخدم",
    minutes: "دقيقة",
    idle: "خامل",
    syncing: "مزامنة...",
    lastUpdate: "آخر تحديث",
    refresh: "تحديث",
    exportCSV: "تصدير CSV",
    backupJSON: "نسخ JSON",
    logout: "خروج",
    userDetail: "تفاصيل المستخدم",
    installDate: "تاريخ التثبيت",
    lastSync: "آخر مزامنة",
    status: "الحالة",
    appVersion: "إصدار التطبيق",
    updated: "محدّث",
    location: "الموقع",
    timezone: "المنطقة الزمنية",
    yes: "نعم",
    no: "لا",
    unknown: "غير معروف",
    noBooks: "لا توجد كتب",
    lastRead: "آخر قراءة",
    added: "أضيف في",
    focusTime: "إجمالي وقت القراءة",
    downloads: "التحميلات",
    justNow: "الآن",
    minAgo: "منذ {n} د",
    hourAgo: "منذ {n} س",
    dayAgo: "منذ {n} يوم"
  },
  en: {
    title: "Mihrab Admin Panel",
    overview: "Overview",
    users: "Users",
    installs: "Installs",
    activeToday: "Active Today",
    now: "Now",
    totalMinutes: "Total Minutes",
    books: "Books",
    shelves: "Shelves",
    updatedUsers: "Updated",
    thisWeek: "This Week",
    recentActivity: "Recent Activity",
    connected: "Online",
    userNode: "Node",
    minutes: "min",
    idle: "Idle",
    syncing: "Syncing...",
    lastUpdate: "Last Update",
    refresh: "Refresh",
    exportCSV: "Export CSV",
    backupJSON: "Backup JSON",
    logout: "Logout",
    userDetail: "User Details",
    installDate: "Install Date",
    lastSync: "Last Sync",
    status: "Status",
    appVersion: "App Version",
    updated: "Updated",
    location: "Location",
    timezone: "Timezone",
    yes: "Yes",
    no: "No",
    unknown: "Unknown",
    noBooks: "No books found",
    lastRead: "Last Read",
    added: "Added",
    focusTime: "Total Focus Time",
    downloads: "Downloads",
    justNow: "Just now",
    minAgo: "{n}m ago",
    hourAgo: "{n}h ago",
    dayAgo: "{n}d ago"
  }
};

// ===== HELPER FUNCTIONS =====
const secToMin = (s: number) => Math.round((s || 0) / 60);

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [lang, setLang] = useState<'ar'|'en'>((localStorage.getItem('admin_lang') as any) || 'ar');
  const t = translations[lang];
  const isAr = lang === 'ar';

  const [view, setView] = useState<'overview'|'users'>('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fmt = (ts: any) => ts ? new Date(ts).toLocaleString(isAr ? 'ar-DZ' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const fmtDate = (ts: any) => ts ? new Date(ts).toLocaleDateString(isAr ? 'ar-DZ' : 'en-US') : '—';
  
  const ago = (ts: any) => {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return t.justNow;
    if (diff < 3600000) return t.minAgo.replace('{n}', Math.floor(diff/60000).toString());
    if (diff < 86400000) return t.hourAgo.replace('{n}', Math.floor(diff/3600000).toString());
    return t.dayAgo.replace('{n}', Math.floor(diff/86400000).toString());
  };

  const toggleLang = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLang(newLang);
    localStorage.setItem('admin_lang', newLang);
  };

  const fetchData = useCallback(async () => {
    try {
      setSyncing(true);
      const h = headers();
      const [uRes, mRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers: h }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/metrics`, { headers: h }).catch(() => ({ data: {} }))
      ]);
      setUsers(uRes.data || []);
      setStats(mRes.data || {});
      if (sel) {
        const fresh = (uRes.data||[]).find((u:any) => u.deviceId === sel.deviceId);
        if (fresh) setSel(fresh);
      }
    } catch {} finally { setLoading(false); setSyncing(false); }
  }, [sel]);

  useEffect(() => { 
    fetchData(); 
    const iv = setInterval(fetchData, 20000); 
    return () => clearInterval(iv); 
  }, [fetchData]);

  // ===== EXPORTS =====
  const dl = (content: string, name: string, type: string) => {
    const b = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = name;
    a.click();
  };

  const exportUserCSV = (u: any) => {
    const lines = ['\uFEFF"Mihrab User Report"', `"Device","${u.deviceId}"`, `"Install","${fmtDate(u.installDate)}"`,
      `"Last Sync","${fmt(u.lastSync)}"`, `"Status","${u.activeStatus||'Idle'}"`,
      `"Total Minutes","${u.readingStats?.totalMinutes||0}"`, `"Total Books","${u.books?.length||0}"`,
      `"Total Shelves","${u.shelves?.length||0}"`, `"Total Downloads","${u.totalDownloads||0}"`,
      `"App Version","${u.appVersion||'?'}"`, `"Updated","${u.hasUpdated?'Yes':'No'}"`, 
      `"Location","${u.location?.country||'?'}, ${u.location?.city||'?'}"`,
      '', '"Book Title","Shelf","Minutes","Stars","Last Read","Added"'];
    u.books?.forEach((b:any) => {
      lines.push(`"${b.title}","${u.shelves?.find((s:any)=>s.id===b.shelfId)?.name||b.shelfId}","${secToMin(b.timeSpentSeconds)}","${b.stars||0}","${b.lastReadAt?fmt(b.lastReadAt):'—'}","${b.addedAt?fmtDate(b.addedAt):'—'}"`);
    });
    dl(lines.join('\n'), `User_${u.deviceId.slice(0,8)}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportGlobalCSV = () => {
    const hdr = ["DeviceID","InstallDate","LastSync","Status","TotalMinutes","Books","Shelves","Downloads","AppVersion","Updated","Country","City","AllBooks_Detail"];
    const rows = users.map(u => [
      u.deviceId, fmtDate(u.installDate), fmt(u.lastSync), u.activeStatus||'Idle',
      Math.round(u.readingStats?.totalMinutes||0), u.books?.length||0, u.shelves?.length||0, u.totalDownloads||0,
      u.appVersion||'?', u.hasUpdated?'Yes':'No', u.location?.country||'?', u.location?.city||'?',
      `"${(u.books||[]).map((b:any)=>`${b.title}(${secToMin(b.timeSpentSeconds)}m)`).join(' | ')}"`
    ]);
    dl('\uFEFF'+[hdr,...rows].map(e=>e.join(',')).join('\n'), `Mihrab_Global_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  };

  if (loading) return <div style={centerSt}>{isAr ? 'جاري التحميل...' : 'Loading Neural System...'}</div>;

  return (
    <div style={{ ...layoutSt, direction: isAr ? 'rtl' : 'ltr' }}>
      {/* Sidebar */}
      <aside className="glass-panel" style={{ ...sidebarSt, [isAr ? 'right' : 'left']: 0, [isAr ? 'borderLeft' : 'borderRight']: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '24px' }}>
          <div style={logoSt}>{isAr ? 'م' : 'M'}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'center' }}>Mihrab Admin</p>
          <nav style={{ marginTop: '30px' }}>
            <div onClick={() => setView('overview')} style={view === 'overview' ? navAct : navIt}><Activity size={18}/> {t.overview}</div>
            <div onClick={() => setView('users')} style={view === 'users' ? navAct : navIt}><Users size={18}/> {t.users}</div>
          </nav>
        </div>
        <div style={{ padding: '0 20px 24px' }}>
          <button onClick={toggleLang} style={{...expBtn, marginBottom:'10px', color:'#3cff64'}}><Languages size={16}/> {isAr ? 'English' : 'العربية'}</button>
          <button onClick={exportGlobalCSV} style={expBtn}><FileSpreadsheet size={16}/> {t.exportCSV}</button>
          <button onClick={() => dl(JSON.stringify(users,null,2), 'Backup.json', 'application/json')} style={{...expBtn, marginTop:'8px'}}><FileJson size={16}/> {t.backupJSON}</button>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'16px', color: syncing?'#3cff64':'var(--text-dim)', fontSize:'0.7rem' }}>
            <RefreshCw size={14} className={syncing?'spin':''}/> {syncing ? t.syncing : `${t.lastUpdate}: ${new Date().toLocaleTimeString(isAr ? 'ar-DZ' : 'en-US')}`}
          </div>
          <button onClick={onLogout} style={logoutSt}><LogOut size={18}/> {t.logout}</button>
        </div>
      </aside>

      {/* Main Area */}
      <main style={{ [isAr ? 'marginRight' : 'marginLeft']: '280px', flex: 1, padding: '30px', overflowY: 'auto' }}>
        <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>{t.title}</h1>
            <p style={{ color: '#3cff64', fontSize: '0.85rem' }}>{t.connected}: {users.length} {isAr ? 'مستخدم' : 'users'}</p>
          </div>
          <button onClick={fetchData} className="glow-btn" style={{ padding: '10px 20px', fontSize: '0.85rem' }}><RefreshCw size={16}/> {t.refresh}</button>
        </header>

        <AnimatePresence mode="wait">
          {view === 'overview' ? (
            <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <MetricCard title={t.installs} value={stats.totalInstalls||0} icon={<Smartphone color="#ff3a3a"/>}/>
                <MetricCard title={t.activeToday} value={stats.activeToday||0} icon={<Activity color="#3cff64"/>} sub={`${stats.activeNow||0} ${t.now}`}/>
                <MetricCard title={t.totalMinutes} value={Math.round(stats.globalMinutes||0)} icon={<Clock color="#ff3a3a"/>}/>
                <MetricCard title={t.books} value={stats.globalBooks||0} icon={<BookOpen color="#ff9f43"/>}/>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <MetricCard title={t.shelves} value={stats.globalShelves||0} icon={<Library color="#a855f7"/>}/>
                <MetricCard title={t.updatedUsers} value={stats.updatedUsers||0} icon={<ShieldCheck color="#3cff64"/>}/>
                <MetricCard title={t.thisWeek} value={stats.activeThisWeek||0} icon={<BarChart3 color="#38bdf8"/>}/>
                <MetricCard title={t.downloads} value={stats.globalDownloads||0} icon={<Download color="#ff3a3a"/>}/>
              </div>

              <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
                <h3 style={{ marginBottom: '16px' }}>{t.recentActivity}</h3>
                {users.slice(0, 8).map(u => (
                  <div key={u._id} onClick={() => { setSel(u); setView('users'); }} style={rowSt}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                      <div style={avSt}><Smartphone size={16}/></div>
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.userNode}_{u.deviceId?.slice(0,8)}</h4>
                        <p style={{ fontSize: '0.75rem', color: '#999' }}>{ago(u.lastSync)} • {u.books?.length||0} {t.books} • {Math.round(u.readingStats?.totalMinutes||0)} {t.minutes}</p>
                      </div>
                    </div>
                    <span style={{ color: u.activeStatus?.startsWith('Reading')?'#3cff64':'#666', fontSize:'0.75rem', fontWeight:800, textAlign: isAr ? 'left' : 'right' }}>{u.activeStatus||t.idle}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="us" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '20px' }}>{t.users} ({users.length})</h3>
                {users.map(u => (
                  <div key={u._id} style={rowSt} onClick={() => setSel(u)}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px', flex:1 }}>
                      <div style={avSt}><Smartphone size={16}/></div>
                      <div style={{ flex:1 }}>
                        <h4 style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.deviceId?.slice(0,14)}</h4>
                        <p style={{ fontSize: '0.72rem', color: '#999' }}>
                          {ago(u.lastSync)} • {u.books?.length||0} {t.books} • {Math.round(u.readingStats?.totalMinutes||0)} {t.minutes}
                          {u.location?.country ? ` • 📍${u.location.country}` : ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                      <span style={{ color: u.activeStatus?.startsWith('Reading')?'#3cff64':'#666', fontSize:'0.7rem', fontWeight:800, marginInlineEnd:'8px' }}>{u.activeStatus||t.idle}</span>
                      <button onClick={(e) => { e.stopPropagation(); exportUserCSV(u); }} style={smBtn}><FileSpreadsheet size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal User Detail */}
      <AnimatePresence>
        {sel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={ovSt}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-panel" style={mdSt}>
              <div style={{ position:'absolute', top:20, [isAr ? 'left' : 'right']: 20, display:'flex', gap:'10px' }}>
                <button onClick={() => exportUserCSV(sel)} style={smBtn}><FileSpreadsheet size={18}/></button>
                <div style={{ cursor:'pointer' }} onClick={() => setSel(null)}><X size={26}/></div>
              </div>

              <h2 style={{ fontSize: '1.3rem', marginBottom: '6px', fontWeight: 900 }}>{t.userDetail}</h2>
              <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: '24px' }}>{sel.deviceId}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                  [t.installDate, fmtDate(sel.installDate)],
                  [t.lastSync, ago(sel.lastSync)],
                  [t.status, sel.activeStatus||t.idle],
                  [t.focusTime, `${Math.round(sel.readingStats?.totalMinutes||0)} ${t.minutes}`],
                  [t.appVersion, sel.appVersion||t.unknown],
                  [t.updated, sel.hasUpdated ? t.yes : t.no],
                  [t.location, sel.location?.country ? `${sel.location.city}, ${sel.location.country}` : t.unknown],
                  [t.timezone, sel.location?.timezone||'—'],
                ].map(([k,v], i) => (
                  <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase' }}>{k}</p>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}>{v}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h3 style={{ marginBottom: '14px', fontSize: '1rem' }}><BookOpen size={16}/> {t.books}</h3>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {sel.books?.map((b:any) => (
                      <div key={b.id} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '8px', borderInlineStart: `3px solid ${sel.shelves?.find((s:any)=>s.id===b.shelfId)?.color||'#ff3c3c'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{b.title}</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 900 }}>{secToMin(b.timeSpentSeconds)} {t.minutes}</span>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px' }}>{t.lastRead}: {b.lastReadAt ? ago(b.lastReadAt) : '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 style={{ marginBottom: '14px', fontSize: '1rem' }}><Layers size={16}/> {t.shelves}</h3>
                  {sel.shelves?.map((s:any) => (
                    <div key={s.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '8px', borderInlineStart: `3px solid ${s.color}` }}>
                      <p style={{ fontWeight: 800, color: s.color }}>{s.name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#999' }}>{sel.books?.filter((b:any)=>b.shelfId===s.id).length} {isAr ? 'كتب' : 'books'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== METRIC CARD =====
const MetricCard = ({ title, value, icon, sub }: any) => (
  <div className="glass-panel" style={{ padding: '22px', flex: 1, display: 'flex', gap: '16px', alignItems: 'center', minWidth: '200px' }}>
    <div style={{ padding: '12px', background: 'rgba(255,60,60,0.1)', borderRadius: '14px' }}>{icon}</div>
    <div>
      <p style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>{title}</p>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 900 }}>{value}</h2>
      {sub && <p style={{ fontSize: '0.7rem', color: '#3cff64', marginTop: '2px' }}>{sub}</p>}
    </div>
  </div>
);

// ===== STYLES =====
const sidebarSt: React.CSSProperties = { width:'280px', height:'100vh', position:'fixed', borderRight:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', justifyContent:'space-between', zIndex:10 };
const layoutSt: React.CSSProperties = { display:'flex', background:'#050505', minHeight:'100vh', color:'#fff' };
const logoSt: React.CSSProperties = { width:'50px', height:'50px', background:'#ff3c3c', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', fontWeight:900, margin:'0 auto' };
const navIt: React.CSSProperties = { display:'flex', alignItems:'center', gap:'12px', padding:'12px 20px', borderRadius:'12px', cursor:'pointer', color:'rgba(255,255,255,0.5)', transition:'0.3s', marginBottom:'6px', fontSize:'0.9rem' };
const navAct = { ...navIt, background:'rgba(255,60,60,0.1)', color:'#ff3c3c', fontWeight:800 } as React.CSSProperties;
const expBtn: React.CSSProperties = { width:'100%', padding:'10px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', borderRadius:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontSize:'0.8rem' };
const logoutSt: React.CSSProperties = { background:'none', border:'none', color:'#ff3c3c', cursor:'pointer', fontWeight:700, padding:'20px 0 0', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.85rem' };
const rowSt: React.CSSProperties = { padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', borderRadius:'14px', background:'rgba(255,255,255,0.02)', marginBottom:'8px', transition:'0.2s' };
const avSt: React.CSSProperties = { width:'40px', height:'40px', borderRadius:'50%', background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', color:'#ff3c3c' };
const ovSt: React.CSSProperties = { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.92)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' };
const mdSt: React.CSSProperties = { width:'1000px', maxWidth:'95vw', maxHeight:'90vh', padding:'40px', borderRadius:'28px', position:'relative', overflowY:'auto' };
const centerSt: React.CSSProperties = { height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#050505', color:'white', fontWeight:900, letterSpacing:'2px', fontSize:'1.2rem' };
const smBtn: React.CSSProperties = { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', borderRadius:'8px', cursor:'pointer', padding:'6px 8px', display:'flex', alignItems:'center' };

export default Dashboard;
