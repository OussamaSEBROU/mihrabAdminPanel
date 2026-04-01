import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, LogOut, Smartphone, BookOpen, Layers, X, Trash2, ChevronRight, Download, FileSpreadsheet, FileJson, Clock, ShieldCheck } from 'lucide-react';

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [view, setView] = useState<'overview' | 'users' | 'global'>('overview');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [stats, setStats] = useState<any>({ totalInstalls: 0, activeToday: 0 });
    const [loading, setLoading] = useState(true);

    const api_url = import.meta.env.VITE_API_URL || 'https://mihrab-backend.onrender.com/api';

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 20000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const h = { Authorization: `Bearer ${token}` };
            const usersRes = await axios.get(`${api_url}/admin/users`, { headers: h }).catch(() => ({data: []}));
            const metricsRes = await axios.get(`${api_url}/admin/metrics`, { headers: h }).catch(() => ({data: null}));
            
            setUsers(usersRes.data);
            setStats(metricsRes.data);
            setLoading(false);
        } catch (err) {
            setLoading(false);
        }
    };

    // --- محرك تصدير CSV (متوافق مع Excel) ---
    const downloadCSV = () => {
        const headers = ["DeviceID", "InstallDate", "TotalMinutes", "TotalBooks", "TotalShelves", "LatestActivity"];
        const rows = users.map(u => [
            u.deviceId,
            new Date(u.installDate).toLocaleDateString(),
            Math.round(u.readingStats?.totalMinutes || 0),
            u.books?.length || 0,
            u.shelves?.length || 0,
            u.activeStatus || 'None'
        ]);

        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Sanctuary_Users_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    // --- محرك تصدير JSON ---
    const downloadJSON = () => {
        const blob = new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Sanctuary_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    if (loading) return <div style={centerStyle}>NEURAL SYSTEM INITIALIZING...</div>;

    return (
        <div style={layoutStyle}>
            {/* Sidebar */}
            <aside className="glass-panel" style={sidebarStyle}>
                <div style={{ padding: '30px' }}>
                    <div style={logoStyle}>S</div>
                    <nav style={{ marginTop: '40px' }}>
                        <div onClick={() => setView('overview')} style={view === 'overview' ? navItemActive : navItem}><Activity size={20} /> Overview</div>
                        <div onClick={() => setView('users')} style={view === 'users' ? navItemActive : navItem}><Users size={20} /> User Grid</div>
                    </nav>
                </div>
                <div style={{ padding: '0 25px 30px' }}>
                     <button onClick={downloadCSV} style={exportBtn}><FileSpreadsheet size={18}/> Export Excel</button>
                     <button onClick={downloadJSON} style={{...exportBtn, marginTop:'10px'}}><FileJson size={18}/> Backup JSON</button>
                     <button onClick={onLogout} style={logoutBtn}><LogOut size={20}/> Logout</button>
                </div>
            </aside>

            {/* Main Area */}
            <main style={{ marginLeft: '300px', flex: 1, padding: '40px' }}>
                <header style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Neural Network Admin</h1>
                    <p style={{ color: '#3cff64', fontSize: '0.9rem' }}>Nodes Online: {users.length}</p>
                </header>

                <AnimatePresence mode="wait">
                    {view === 'overview' ? (
                        <motion.div key="overview" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div style={metricsGrid}>
                                <MetricCard title="System Installs" value={stats?.totalInstalls || 0} icon={<Smartphone color="#ff3a3a"/>} />
                                <MetricCard title="Global Minutes" value={Math.round(users.reduce((acc, u) => acc + (u.readingStats?.totalMinutes || 0), 0))} icon={<Clock color="#ff3a3a"/>} />
                                <MetricCard title="Security Status" value="Shielded" icon={<ShieldCheck color="#3cff64"/>} />
                            </div>
                            <div className="glass-panel" style={{ marginTop: '30px', padding: '40px', textAlign: 'center' }}>
                                 <h2 style={{ marginBottom: '15px' }}>Device Activity Heartbeat</h2>
                                 <p style={{ color: 'var(--text-dim)' }}>Waiting for full-network synchronization pulses...</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="users" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                             <div className="glass-panel" style={{ padding: '30px' }}>
                                 <h3 style={{ marginBottom: '25px' }}>Device Identification Nodes</h3>
                                 {users.map((user) => (
                                     <div key={user._id} onClick={() => setSelectedUser(user)} style={userRowStyle}>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                             <div style={userAvatar}><Smartphone size={18}/></div>
                                             <div>
                                                 <h4 style={{ fontWeight: 800 }}>Node_{user.deviceId.slice(0, 10)}</h4>
                                                 <p style={{ fontSize: '0.8rem', color: '#c0c0c0' }}>Pulsed: {new Date(user.lastSync).toLocaleTimeString()}</p>
                                             </div>
                                         </div>
                                         <p style={{ color: '#3cff64', fontSize: '0.75rem', fontWeight: 900 }}>{user.activeStatus || 'CONNECTED'}</p>
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
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-panel" style={modalContent}>
                             <div style={{ position: 'absolute', top: 30, right: 30, cursor: 'pointer' }} onClick={() => setSelectedUser(null)}><X size={30} /></div>
                             <h2 style={{ fontSize: '1.6rem', marginBottom: '30px' }}>User Intelligence: {selectedUser.deviceId}</h2>
                             
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                 <div>
                                      <h3 style={{ marginBottom: '20px' }}><Layers size={18}/> Shelf Library</h3>
                                      {selectedUser.shelves?.map((shelf: any) => (
                                          <div key={shelf.id} style={{ marginBottom: '15px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '15px' }}>
                                               <p style={{ fontWeight: 800, color: shelf.color }}>📁 {shelf.name}</p>
                                               {selectedUser.books?.filter((b:any) => b.shelfId === shelf.id).map((b:any) => (
                                                   <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '5px' }}>
                                                        <span>{b.title}</span>
                                                        <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{Math.round(b.timeSpentSeconds / 60)}m</span>
                                                   </div>
                                                ))}
                                          </div>
                                      ))}
                                 </div>
                                 <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(60,255,100,0.05)', borderRadius: '24px' }}>
                                      <p style={{ color: '#3cff64', fontSize: '0.85rem' }}>TOTAL FOCUS TIME</p>
                                      <h2 style={{ fontSize: '4.5rem', fontWeight: 900 }}>{Math.round(selectedUser.readingStats?.totalMinutes || 0)}m</h2>
                                 </div>
                             </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Styles
const MetricCard = ({ title, value, icon }: any) => (
    <div className="glass-panel" style={{ padding: '25px', flex: 1, display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ padding: '15px', background: 'rgba(255,60,60,0.1)', borderRadius: '15px' }}>{icon}</div>
        <div>
            <p style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-dim)' }}>{title}</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{value}</h2>
        </div>
    </div>
);

const sidebarStyle: React.CSSProperties = { width: '300px', height: '100vh', position: 'fixed', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' };
const layoutStyle: React.CSSProperties = { display: 'flex', background: '#050505', minHeight: '100vh', color: '#fff' };
const logoStyle: React.CSSProperties = { width: '55px', height: '55px', background: '#ff3c3c', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900 };
const navItem = { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 25px', borderRadius: '15px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: '0.3s', marginBottom: '8px' };
const navItemActive = { ...navItem, background: 'rgba(255,60,60,0.1)', color: '#ff3c3c', fontWeight: 800 };
const exportBtn: React.CSSProperties = { width: '100%', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' };
const logoutBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#ff3c3c', cursor: 'pointer', fontWeight: 700, padding: '30px 0 0', display: 'flex', alignItems: 'center', gap: '10px' };
const metricsGrid: React.CSSProperties = { display: 'flex', gap: '25px' };
const userRowStyle: React.CSSProperties = { padding: '18px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', marginBottom: '12px' };
const userAvatar: React.CSSProperties = { width: '45px', height: '45px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff3c3c' };
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalContent: React.CSSProperties = { width: '950px', maxHeight: '90vh', padding: '50px', borderRadius: '32px', position: 'relative', overflowY: 'auto' };
const centerStyle: React.CSSProperties = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: 'white', fontWeight: 900, letterSpacing: '4px' };

export default Dashboard;
