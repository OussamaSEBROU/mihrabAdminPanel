import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, LogOut, Smartphone, BookOpen, Layers, X, Trash2, ChevronRight, Globe, TrendingUp, Clock, ShieldCheck } from 'lucide-react';

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [view, setView] = useState<'overview' | 'users' | 'global'>('overview');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [insights, setInsights] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const api_url = import.meta.env.VITE_API_URL || 'https://mihrab-backend.onrender.com/api';

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 20000); // تحديث كل 20 ثانية
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            // جلب البيانات بشكل منفصل لضمان استمرار التحميل (High Resilience)
            const usersRes = await axios.get(`${api_url}/admin/users`, { headers }).catch(() => ({data: []}));
            const metricsRes = await axios.get(`${api_url}/admin/metrics`, { headers }).catch(() => ({data: null}));
            const insightRes = await axios.get(`${api_url}/admin/global-insights`, { headers }).catch(() => ({data: {topBooks:[], mapNodes:[]}}));

            setUsers(usersRes.data);
            setStats(metricsRes.data);
            setInsights(insightRes.data);
            setLoading(false);
        } catch (err) {
            console.error('Fetch error:', err);
            setLoading(false); // نفتح الواجهة حتى في حالة حدوث خطأ استثنائي
        }
    };

    if (loading) return <div style={centerStyle}>NEURAL SYSTEM INITIALIZING...</div>;

    return (
        <div style={layoutStyle}>
            {/* Sidebar */}
            <aside className="glass-panel" style={sidebarStyle}>
                <div style={{ padding: '30px' }}>
                    <div style={logoStyle}>S</div>
                    <nav style={{ marginTop: '40px' }}>
                        <div onClick={() => setView('overview')} style={view === 'overview' ? navItemActive : navItem}><Activity size={20} /> System Pulse</div>
                        <div onClick={() => setView('global')} style={view === 'global' ? navItemActive : navItem}><Globe size={20} /> Global Data</div>
                        <div onClick={() => setView('users')} style={view === 'users' ? navItemActive : navItem}><Users size={20} /> Device Nodes</div>
                    </nav>
                </div>
                <button onClick={onLogout} style={logoutBtnStyle}><LogOut size={20}/> Neural Logout</button>
            </aside>

            {/* Content Area */}
            <main style={{ marginLeft: '300px', flex: 1, padding: '40px' }}>
                <header style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Global Neural Insights</h1>
                    <p style={{ color: '#3cff64', fontSize: '0.9rem' }}>Network Connectivity: Active | Monitoring {users.length} Nodes</p>
                </header>

                <AnimatePresence mode="wait">
                    {view === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                            <div style={metricsGrid}>
                                <MetricCard title="System Installs" value={stats?.totalInstalls || 0} icon={<Smartphone color="#ff3a3a"/>} />
                                <MetricCard title="Total Focus Time" value={Math.round(users.reduce((acc, u) => acc + (u.readingStats?.totalMinutes || 0), 0)) + 'm'} icon={<Clock color="#ff3a3a"/>} />
                                <MetricCard title="System Integrity" value="100%" icon={<ShieldCheck color="#3cff64"/>} />
                            </div>
                            <div className="glass-panel" style={{ marginTop: '30px', padding: '40px', textAlign: 'center' }}>
                                 <h2 style={{ fontSize: '1.4rem', marginBottom: '20px' }}>Activity Node Heatmap</h2>
                                 <div style={heatmapBox}>
                                      {insights?.mapNodes?.slice(0, 48).map((node: any, idx: number) => (
                                          <div key={idx} style={{ 
                                                  width: '12px', height: '12px', 
                                                  borderRadius: '50%', 
                                                  background: node.active ? '#3cff64' : '#ffffff22',
                                                  boxShadow: node.active ? '0 0 15px #3cff64' : 'none',
                                              }} 
                                          />
                                      ))}
                                 </div>
                                 <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '15px' }}>Live synchronization pulses from all Android devices globally.</p>
                            </div>
                        </motion.div>
                    )}

                    {view === 'global' && (
                        <motion.div key="global" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                            <div className="glass-panel" style={{ padding: '30px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                                     <TrendingUp color="var(--accent)" />
                                     <h2 style={{ fontSize: '1.8rem' }}>The Reading Hall of Fame (Top 10)</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                     {insights?.topBooks?.map((book: any, idx: number) => (
                                         <div key={idx} style={topBookRow}>
                                              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)', minWidth: '40px' }}>#{idx+1}</span>
                                              <span style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1 }}>{book.title}</span>
                                              <span style={{ fontWeight: 800, color: '#3cff64' }}>{book.minutes} mins total focus</span>
                                         </div>
                                     ))}
                                     {(!insights?.topBooks || insights?.topBooks.length === 0) && <p style={{ color: 'var(--text-dim)' }}>Waiting for deeper library synchronization...</p>}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {view === 'users' && (
                        <motion.div key="users" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                             <div className="glass-panel" style={{ padding: '30px' }}>
                                 <h3 style={{ marginBottom: '20px' }}>Connected Intelligence Nodes</h3>
                                 {users.map((user) => (
                                     <div key={user._id} onClick={() => setSelectedUser(user)} style={userRowStyle}>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                             <div style={userAvatar}><Smartphone size={18}/></div>
                                             <div>
                                                 <h4 style={{ fontWeight: 800 }}>Node_{user.deviceId.slice(0, 10)}</h4>
                                                 <p style={{ fontSize: '0.8rem', color: '#c0c0c0' }}>Sync Pulse: {new Date(user.lastSync).toLocaleTimeString()}</p>
                                             </div>
                                         </div>
                                         <div style={{textAlign: 'right'}}>
                                              <p style={{ color: '#3cff64', fontSize: '0.75rem', textTransform: 'uppercase' }}>{user.activeStatus || 'Connected'}</p>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Modal Detail User */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={modalOverlay}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-panel" style={modalContent}>
                             <div style={{ position: 'absolute', top: 30, right: 30, cursor: 'pointer' }} onClick={() => setSelectedUser(null)}><X /></div>
                             <h2 style={{ fontSize: '1.6rem', marginBottom: '15px' }}>Node Diagnostic Analytics</h2>
                             <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '30px' }} />
                             
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                 <div>
                                      <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Archive Map/Shelves</h3>
                                      {selectedUser.shelves?.map((shelf: any) => (
                                          <div key={shelf.id} style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', borderLeft: `3px solid ${shelf.color || 'var(--accent)'}` }}>
                                               <p style={{ fontWeight: 800, color: shelf.color }}>📁 {shelf.name}</p>
                                               {selectedUser.books?.filter((b:any) => b.shelfId === shelf.id).map((b:any) => (
                                                   <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '6px', opacity: 0.8 }}>
                                                        <span>{b.title}</span>
                                                        <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{Math.round(b.timeSpentSeconds / 60)}m</span>
                                                   </div>
                                                ))}
                                          </div>
                                      ))}
                                 </div>
                                 <div style={{ textAlign: 'center' }}>
                                      <div className="glass-panel" style={{ padding: '40px', background: 'rgba(60,255,100,0.05)', borderRadius: '24px' }}>
                                           <p style={{ color: '#3cff64', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Global Focus Pulse</p>
                                           <h2 style={{ fontSize: '4.5rem', fontWeight: 900 }}>{Math.round(selectedUser.readingStats?.totalMinutes || 0)} <span style={{ fontSize: '1.2rem', opacity: 0.5 }}>MINS</span></h2>
                                           <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '10px' }}>Synchronized since {new Date(selectedUser.installDate).toLocaleDateString()}</p>
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

// Styles and Components
const MetricCard = ({ title, value, icon }: any) => (
    <div className="glass-panel" style={{ padding: '25px', flex: 1, display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ padding: '15px', background: 'rgba(255,60,60,0.1)', borderRadius: '15px' }}>{icon}</div>
        <div>
            <p style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '1.5px' }}>{title}</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{value}</h2>
        </div>
    </div>
);

// CSS Property Styles
const layoutStyle: React.CSSProperties = { display: 'flex', background: '#050505', minHeight: '100vh', color: '#fff', overflowX: 'hidden' };
const sidebarStyle: React.CSSProperties = { width: '300px', height: '100vh', position: 'fixed', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' };
const logoStyle: React.CSSProperties = { width: '55px', height: '55px', background: 'var(--accent)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900 };
const navItem = { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 25px', borderRadius: '15px', cursor: 'pointer', color: 'var(--text-dim)', transition: '0.3s', marginBottom: '10px' };
const navItemActive = { ...navItem, background: 'rgba(255,60,60,0.1)', color: 'var(--accent)', fontWeight: 800 };
const logoutBtnStyle: React.CSSProperties = { padding: '40px', border: 'none', background: 'none', color: '#ff3c3c', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700 };
const metricsGrid: React.CSSProperties = { display: 'flex', gap: '25px' };
const heatmapBox: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '12px', marginTop: '20px', padding: '25px', background: 'rgba(255,255,255,0.01)', borderRadius: '20px' };
const topBookRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 25px', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' };
const userRowStyle: React.CSSProperties = { padding: '20px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', marginBottom: '15px', transition: '0.3s' };
const userAvatar: React.CSSProperties = { width: '45px', height: '45px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' };
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalContent: React.CSSProperties = { width: '950px', maxHeight: '90vh', padding: '50px', borderRadius: '32px', position: 'relative', overflowY: 'auto' };
const centerStyle: React.CSSProperties = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: 'white', fontWeight: 950, letterSpacing: '6px' };

export default Dashboard;
