import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, LogOut, Smartphone, BookOpen, Layers, X, ChevronRight, Download, FileSpreadsheet, FileJson, Clock, ShieldCheck, MapPin, RefreshCw, Globe, BarChart3, Library } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://mihrab-backend.onrender.com/api';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ===== HELPER FUNCTIONS =====
const fmt = (ts: any) => ts ? new Date(ts).toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fmtDate = (ts: any) => ts ? new Date(ts).toLocaleDateString('ar-DZ') : '—';
const secToMin = (s: number) => Math.round((s || 0) / 60);
const ago = (ts: any) => {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'الآن';
  if (diff < 3600000) return `منذ ${Math.floor(diff/60000)} د`;
  if (diff < 86400000) return `منذ ${Math.floor(diff/3600000)} س`;
  return `منذ ${Math.floor(diff/86400000)} يوم`;
};

// ===== PER-USER CSV/JSON EXPORT =====
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
  lines.push('', '"Shelf","Color","Books Count"');
  u.shelves?.forEach((s:any) => {
    const cnt = u.books?.filter((b:any)=>b.shelfId===s.id).length||0;
    lines.push(`"${s.name}","${s.color}","${cnt}"`);
  });
  dl(lines.join('\n'), `User_${u.deviceId.slice(0,8)}.csv`, 'text/csv;charset=utf-8;');
};

const exportUserJSON = (u: any) => {
  dl(JSON.stringify(u, null, 2), `User_${u.deviceId.slice(0,8)}.json`, 'application/json');
};

const dl = (content: string, name: string, type: string) => {
  const b = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
};

// ===== GLOBAL CSV EXPORT =====
const exportGlobalCSV = (users: any[]) => {
  const hdr = ["DeviceID","InstallDate","LastSync","Status","TotalMinutes","Books","Shelves","Downloads","AppVersion","Updated","Country","City","AllBooks_Detail"];
  const rows = users.map(u => {
    const booksDetail = (u.books||[]).map((b:any)=>`${b.title}(${secToMin(b.timeSpentSeconds)}m)`).join(' | ');
    return [u.deviceId, fmtDate(u.installDate), fmt(u.lastSync), u.activeStatus||'Idle',
      u.readingStats?.totalMinutes||0, u.books?.length||0, u.shelves?.length||0, u.totalDownloads||0,
      u.appVersion||'?', u.hasUpdated?'Yes':'No', u.location?.country||'?', u.location?.city||'?',
      `"${booksDetail}"`];
  });
  dl('\uFEFF'+[hdr,...rows].map(e=>e.join(',')).join('\n'), `Mihrab_Export_${new Date().toISOString().split('T')[0]}.csv`, `text/csv;charset=utf-8;`);
};

const exportGlobalJSON = (users: any[]) => {
  dl(JSON.stringify(users, null, 2), `Mihrab_Backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
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

// ===== MAIN DASHBOARD =====
const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [view, setView] = useState<'overview'|'users'>('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
      // If a user detail is open, refresh it
      if (sel) {
        const fresh = (uRes.data||[]).find((u:any) => u.deviceId === sel.deviceId);
        if (fresh) setSel(fresh);
      }
    } catch {} finally { setLoading(false); setSyncing(false); }
  }, [sel]);

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 15000); return () => clearInterval(iv); }, []);

  if (loading) return <div style={centerSt}>جاري تهيئة النظام...</div>;

  return (
    <div style={layoutSt}>
      {/* Sidebar */}
      <aside className="glass-panel" style={sidebarSt}>
        <div style={{ padding: '24px' }}>
          <div style={logoSt}>م</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'center' }}>Mihrab Admin</p>
          <nav style={{ marginTop: '30px' }}>
            <div onClick={() => setView('overview')} style={view === 'overview' ? navAct : navIt}><Activity size={18}/> نظرة عامة</div>
            <div onClick={() => setView('users')} style={view === 'users' ? navAct : navIt}><Users size={18}/> المستخدمون</div>
          </nav>
        </div>
        <div style={{ padding: '0 20px 24px' }}>
          <button onClick={() => exportGlobalCSV(users)} style={expBtn}><FileSpreadsheet size={16}/> تصدير CSV</button>
          <button onClick={() => exportGlobalJSON(users)} style={{...expBtn, marginTop:'8px'}}><FileJson size={16}/> نسخ احتياطي JSON</button>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'16px', color: syncing?'#3cff64':'var(--text-dim)', fontSize:'0.75rem' }}>
            <RefreshCw size={14} className={syncing?'spin':''}/> {syncing ? 'مزامنة...' : `آخر تحديث: ${new Date().toLocaleTimeString('ar-DZ')}`}
          </div>
          <button onClick={onLogout} style={logoutSt}><LogOut size={18}/> خروج</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '280px', flex: 1, padding: '30px', overflowY: 'auto' }}>
        <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>لوحة تحكم المحراب</h1>
            <p style={{ color: '#3cff64', fontSize: '0.85rem' }}>متصل: {users.length} مستخدم</p>
          </div>
          <button onClick={fetchData} className="glow-btn" style={{ padding: '10px 20px', fontSize: '0.85rem' }}><RefreshCw size={16}/> تحديث</button>
        </header>

        <AnimatePresence mode="wait">
          {view === 'overview' ? (
            <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <MetricCard title="التثبيتات" value={stats.totalInstalls||0} icon={<Smartphone color="#ff3a3a"/>}/>
                <MetricCard title="نشط اليوم" value={stats.activeToday||0} icon={<Activity color="#3cff64"/>} sub={`${stats.activeNow||0} الآن`}/>
                <MetricCard title="الدقائق الكلية" value={stats.globalMinutes||0} icon={<Clock color="#ff3a3a"/>}/>
                <MetricCard title="الكتب" value={stats.globalBooks||0} icon={<BookOpen color="#ff9f43"/>}/>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <MetricCard title="الرفوف" value={stats.globalShelves||0} icon={<Library color="#a855f7"/>}/>
                <MetricCard title="محدّثون" value={stats.updatedUsers||0} icon={<ShieldCheck color="#3cff64"/>}/>
                <MetricCard title="هذا الأسبوع" value={stats.activeThisWeek||0} icon={<BarChart3 color="#38bdf8"/>}/>
              </div>
              {/* Recent Users */}
              <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
                <h3 style={{ marginBottom: '16px' }}>آخر النشاطات</h3>
                {users.slice(0, 8).map(u => (
                  <div key={u._id} onClick={() => { setSel(u); setView('users'); }} style={rowSt}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                      <div style={avSt}><Smartphone size={16}/></div>
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.deviceId?.slice(0,12)}...</h4>
                        <p style={{ fontSize: '0.75rem', color: '#999' }}>{ago(u.lastSync)} • {u.books?.length||0} كتاب • {secToMin(u.books?.reduce((a:number,b:any)=>a+(b.timeSpentSeconds||0),0)||0)} د</p>
                      </div>
                    </div>
                    <span style={{ color: u.activeStatus?.startsWith('Reading')?'#3cff64':'#666', fontSize:'0.75rem', fontWeight:800 }}>{u.activeStatus||'Idle'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="us" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '20px' }}>جميع المستخدمين ({users.length})</h3>
                {users.map(u => (
                  <div key={u._id} style={rowSt}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px', flex:1, cursor:'pointer' }} onClick={() => setSel(u)}>
                      <div style={avSt}><Smartphone size={16}/></div>
                      <div style={{ flex:1 }}>
                        <h4 style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.deviceId?.slice(0,14)}</h4>
                        <p style={{ fontSize: '0.72rem', color: '#999' }}>
                          {ago(u.lastSync)} • {u.books?.length||0} كتاب • {u.shelves?.length||0} رف • {u.readingStats?.totalMinutes||0} د قراءة
                          {u.location?.country ? ` • 📍${u.location.country}` : ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                      <span style={{ color: u.activeStatus?.startsWith('Reading')?'#3cff64':'#666', fontSize:'0.7rem', fontWeight:800, marginRight:'8px' }}>{u.activeStatus||'Idle'}</span>
                      <button onClick={(e) => { e.stopPropagation(); exportUserCSV(u); }} style={smBtn} title="CSV"><FileSpreadsheet size={14}/></button>
                      <button onClick={(e) => { e.stopPropagation(); exportUserJSON(u); }} style={smBtn} title="JSON"><FileJson size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* User Detail Modal */}
      <AnimatePresence>
        {sel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={ovSt}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-panel" style={mdSt}>
              <div style={{ position:'absolute', top:20, right:20, display:'flex', gap:'10px' }}>
                <button onClick={() => exportUserCSV(sel)} style={smBtn} title="CSV"><FileSpreadsheet size={18}/></button>
                <button onClick={() => exportUserJSON(sel)} style={smBtn} title="JSON"><FileJson size={18}/></button>
                <div style={{ cursor:'pointer' }} onClick={() => setSel(null)}><X size={26}/></div>
              </div>

              <h2 style={{ fontSize: '1.3rem', marginBottom: '6px', fontWeight: 900 }}>تفاصيل المستخدم</h2>
              <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: '24px', wordBreak: 'break-all' }}>{sel.deviceId}</p>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                  ['تاريخ التثبيت', fmtDate(sel.installDate)],
                  ['آخر مزامنة', ago(sel.lastSync)],
                  ['الحالة', sel.activeStatus||'Idle'],
                  ['إجمالي القراءة', `${sel.readingStats?.totalMinutes||0} دقيقة`],
                  ['الكتب', sel.books?.length||0],
                  ['الرفوف', sel.shelves?.length||0],
                  ['إصدار التطبيق', sel.appVersion||'غير معروف'],
                  ['محدّث', sel.hasUpdated?'✅ نعم':'❌ لا'],
                  ['الموقع', sel.location?.country ? `${sel.location.city}, ${sel.location.country}` : 'غير متوفر'],
                  ['المنطقة الزمنية', sel.location?.timezone||'—'],
                ].map(([k,v], i) => (
                  <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</p>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Books List */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h3 style={{ marginBottom: '14px', fontSize: '1rem' }}><BookOpen size={16} style={{verticalAlign:'middle'}}/> الكتب ({sel.books?.length||0})</h3>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {sel.books?.length ? sel.books.map((b:any) => {
                      const shelf = sel.shelves?.find((s:any) => s.id === b.shelfId);
                      return (
                        <div key={b.id} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '8px', borderLeft: `3px solid ${shelf?.color||'#ff3c3c'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{b.title}</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: '0.85rem' }}>{secToMin(b.timeSpentSeconds)} د</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <span>📁 {shelf?.name||b.shelfId}</span>
                            <span>⭐ {b.stars||0}</span>
                            <span>📖 آخر قراءة: {b.lastReadAt ? ago(b.lastReadAt) : '—'}</span>
                            {b.lastReadDate && <span>📅 {b.lastReadDate}</span>}
                          </div>
                        </div>
                      );
                    }) : <p style={{ color: '#666', fontSize: '0.85rem' }}>لا توجد كتب</p>}
                  </div>
                </div>

                {/* Shelves + Stats */}
                <div>
                  <h3 style={{ marginBottom: '14px', fontSize: '1rem' }}><Layers size={16} style={{verticalAlign:'middle'}}/> الرفوف ({sel.shelves?.length||0})</h3>
                  {sel.shelves?.map((s:any) => {
                    const sBooks = sel.books?.filter((b:any) => b.shelfId === s.id) || [];
                    const sMins = sBooks.reduce((a:number, b:any) => a + (b.timeSpentSeconds||0), 0);
                    return (
                      <div key={s.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '8px', borderLeft: `3px solid ${s.color}` }}>
                        <p style={{ fontWeight: 800, color: s.color }}>{s.name}</p>
                        <p style={{ fontSize: '0.75rem', color: '#999' }}>{sBooks.length} كتاب • {secToMin(sMins)} دقيقة قراءة</p>
                        {sBooks.map((b:any) => (
                          <div key={b.id} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingLeft: '12px' }}>
                            <span>{b.title}</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{secToMin(b.timeSpentSeconds)} د</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {/* Total Focus */}
                  <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(60,255,100,0.05)', borderRadius: '18px', marginTop: '16px' }}>
                    <p style={{ color: '#3cff64', fontSize: '0.75rem', letterSpacing: '2px' }}>إجمالي وقت القراءة</p>
                    <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>{sel.readingStats?.totalMinutes||0}<span style={{ fontSize: '1rem' }}> دقيقة</span></h2>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
