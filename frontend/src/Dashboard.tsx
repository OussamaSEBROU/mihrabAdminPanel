import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, Clock, LogOut, ChevronRight, Smartphone, BookOpen, Layers, X, Calendar, Download } from 'lucide-react';

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const api_url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [usersRes, metricsRes] = await Promise.all([
                axios.get(`${api_url}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${api_url}/admin/metrics`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setUsers(usersRes.data);
            setStats(metricsRes.data);
            setLoading(false);
        } catch (err) {}
    };

    if (loading) return <div style={centerStyle}>NEURAL SYNC IN PROGRESS...</div>;

    const filteredUsers = users.filter(u => u.deviceId.toLowerCase().includes(filter.toLowerCase()));

    return (
        <div style={layoutStyle}>
            {/* Sidebar */}
            <aside className="glass-panel" style={sidebarStyle}>
                <div style={{ padding: '30px' }}>
                     <div style={logoStyle}>S</div>
                     <nav style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '40px' }}>
                        <div style={navItemActive}><Activity size={20} /> Control Center</div>
                        <div style={navItem}><Smartphone size={20} /> Device Nodes</div>
                     </nav>
                </div>
                <button onClick={onLogout} style={logoutBtnStyle}><LogOut size={20}/> Logoff</button>
            </aside>

            {/* Main Content */}
            <main style={{ marginLeft: '300px', flex: 1, padding: '40px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>Global Pulse Archive</h1>
                        <p style={{ color: 'var(--text-dim)' }}>Active System Nodes: {users.length}</p>
                    </div>
                </header>

                <div style={metricsGrid}>
                    <MetricCard title="Total Installs" value={stats?.totalInstalls || 0} icon={<Smartphone color="#ff3c3c"/>} />
                    <MetricCard title="Active Today" value={stats?.activeToday || 0} icon={<Activity color="#ff3c3c"/>} />
                    <MetricCard title="Est. Uninstalled" value={stats?.likelyUninstalled || 0} icon={<X color="#f97316"/>} />
                </div>

                <div className="glass-panel" style={{ padding: '30px', marginTop: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                         <h3>User Intelligence Nodes</h3>
                         <input type="text" placeholder="Filter node ID..." style={inputStyle} value={filter} onChange={(e)=>setFilter(e.target.value)} />
                    </div>
                    {filteredUsers.map((user) => (
                        <motion.div key={user._id} onClick={() => setSelectedUser(user)} whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }} style={userRowStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={userAvatar}><Smartphone size={18}/></div>
                                <div>
                                    <h4 style={{ fontSize: '1rem', color: '#fff' }}>Node_{user.deviceId.slice(0, 10)}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'rgba(60, 255, 100, 1)' }}>{user.activeStatus || 'Stationary'}</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                 <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Last Pulsed: {new Date(user.lastSync).toLocaleTimeString()}</p>
                            </div>
                            <ChevronRight size={20} color="var(--text-dim)"/>
                        </motion.div>
                    ))}
                </div>
            </main>

            {/* User Detail Explorer */}
            <AnimatePresence>
            {selectedUser && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={modalOverlay}>
                    <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="glass-panel" style={modalContent}>
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <Smartphone size={30} color="var(--accent)"/>
                                <div>
                                    <h2 style={{ fontSize: '1.4rem' }}>Device ID: {selectedUser.deviceId}</h2>
                                    <p style={{ color: 'var(--text-dim)' }}>First Sync/Install: {new Date(selectedUser.installDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} style={closeBtn}><X size={24}/></button>
                        </header>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                            <div>
                                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Archive/Shelves Structure</h3>
                                {selectedUser.shelves?.map((shelf: any) => (
                                    <div key={shelf.id} style={shelfCard}>
                                        <div style={{...shelfTag, backgroundColor: shelf.color || 'var(--accent)'}}><Layers size={14}/> {shelf.name}</div>
                                        <div style={bookList}>
                                            {selectedUser.books?.filter((b: any) => b.shelfId === shelf.id).map((book: any) => (
                                                <div key={book.id} style={bookItem}>
                                                    <span>{book.title}</span>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{Math.round((book.timeSpentSeconds || 0) / 60)} min</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Node Intelligence</h3>
                                <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                                     <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>CUMULATIVE READING TIME</p>
                                     <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>{Math.round(selectedUser.readingStats?.totalMinutes || 0)} <span style={{fontSize:'1rem'}}>MIN</span></h2>
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

const MetricCard = ({ title, value, icon }: any) => (
    <div className="glass-panel" style={{ padding: '25px', flex: 1, display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>{icon}</div>
        <div>
            <p style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>{title}</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{value}</h2>
        </div>
    </div>
);

const layoutStyle: React.CSSProperties = { display: 'flex', background: '#050505', minHeight: '100vh', color: '#fff' };
const sidebarStyle: React.CSSProperties = { width: '300px', height: '100vh', position: 'fixed', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' };
const logoStyle: React.CSSProperties = { width: '50px', height: '50px', background: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900 };
const navItem = { display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-dim)', transition: '0.3s' };
const navItemActive = { ...navItem, background: 'rgba(255,60,60,0.1)', color: 'var(--accent)', fontWeight: 700 };
const logoutBtnStyle: React.CSSProperties = { padding: '40px', border: 'none', background: 'none', color: '#ff3c3c', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 };
const metricsGrid: React.CSSProperties = { display: 'flex', gap: '20px' };
const userRowStyle: React.CSSProperties = { padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderRadius: '15px', borderBottom: '1px solid rgba(255,255,255,0.03)' };
const userAvatar: React.CSSProperties = { width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' };
const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '10px', color: '#fff', outline: 'none' };
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
const modalContent: React.CSSProperties = { width: '900px', maxHeight: '90vh', padding: '40px', position: 'relative', overflowY: 'auto', borderRadius: '24px' };
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#fff', cursor: 'pointer' };
const shelfCard: React.CSSProperties = { marginBottom: '20px', paddingLeft: '15px', borderLeft: '2px solid rgba(255,255,255,0.1)' };
const shelfTag: React.CSSProperties = { padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, width: 'fit-content', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' };
const bookList: React.CSSProperties = { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' };
const bookItem: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.85rem' };
const centerStyle: React.CSSProperties = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: '#050505', letterSpacing: '2px' };

export default Dashboard;
