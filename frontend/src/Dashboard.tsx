import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, LogOut, Smartphone, BookOpen, Layers, X, Trash2, ChevronRight, Shield } from 'lucide-react';

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [view, setView] = useState<'overview' | 'users'>('overview'); // نظام التنقل
    const [users, setUsers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const api_url = import.meta.env.VITE_API_URL || 'https://mihrab-backend.onrender.com/api';

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // تحديث كل 10 ثوانٍ
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

    return (
        <div style={layoutStyle}>
            {/* Sidebar */}
            <aside className="glass-panel" style={sidebarStyle}>
                <div style={{ padding: '30px' }}>
                    <div style={logoStyle}>S</div>
                    <nav style={{ marginTop: '40px' }}>
                        <div onClick={() => setView('overview')} style={view === 'overview' ? navItemActive : navItem}><Activity size={20} /> Overview</div>
                        <div onClick={() => setView('users')} style={view === 'users' ? navItemActive : navItem}><Smartphone size={20} /> Device Nodes</div>
                    </nav>
                </div>
                <button onClick={onLogout} style={logoutBtnStyle}><LogOut size={20}/> Neural Logout</button>
            </aside>

            {/* Main Area */}
            <main style={{ marginLeft: '300px', flex: 1, padding: '40px' }}>
                <header style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 900 }}>Neural Network Centre</h1>
                    <p style={{ color: 'var(--text-dim)' }}>Status: Operational | Active Nodes: {users.length}</p>
                </header>

                <AnimatePresence mode="wait">
                    {view === 'overview' ? (
                        <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <div style={metricsGrid}>
                                <MetricCard title="SYNCHRONIZED DEVICES" value={stats?.totalInstalls || 0} icon={<Smartphone color="#ff3c3c"/>} />
                                <MetricCard title="ACTIVE NODES TODAY" value={stats?.activeToday || 0} icon={<Activity color="#ff3c3c"/>} />
                                <MetricCard title="POTENTIAL LOSS" value={stats?.likelyUninstalled || 0} icon={<X color="#f97316"/>} />
                            </div>
                            
                            <div className="glass-panel" style={{ padding: '30px', marginTop: '30px', textAlign: 'center' }}>
                                 <h3 style={{ marginBottom: '15px' }}>Node Diagnostic Tools</h3>
                                 <p style={{ color: 'var(--text-dim)', marginBottom: '20px' }}>If you see duplicate nodes, you can start a fresh sync.</p>
                                 <label style={{ fontSize: '0.8rem', opacity: 0.5 }}>Current Status: {users.length} Nodes Connected</label>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                             <div className="glass-panel" style={{ padding: '25px' }}>
                                 <h3>Intelligence Node List</h3>
                                 <div style={{ marginTop: '20px' }}>
                                    {users.map((user) => (
                                        <div key={user._id} onClick={() => setSelectedUser(user)} style={userRowStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={userAvatar}><Smartphone size={18}/></div>
                                                <div>
                                                    <p style={{ fontWeight: 700 }}>NodeID_{user.deviceId.slice(0, 10)}</p>
                                                    <p style={{ fontSize: '0.85rem', color: '#3cff64' }}>{user.activeStatus || 'Stationary'}</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} color="var(--text-dim)"/>
                                        </div>
                                    ))}
                                 </div>
                             </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* User Detail Modal (When a user is clicked) */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={modalOverlay}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-panel" style={modalContent}>
                            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <Smartphone color="var(--accent)" size={35}/>
                                    <div>
                                        <h2 style={{ fontSize: '1.4rem' }}>Node Info: {selectedUser.deviceId}</h2>
                                        <p style={{ color: 'var(--text-dim)' }}>Installed: {new Date(selectedUser.installDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={28}/></button>
                            </header>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                <div>
                                    <h4 style={{ marginBottom: '15px' }}><Layers size={16}/> User Shelves & Library</h4>
                                    {selectedUser.shelves?.map((shelf: any) => (
                                        <div key={shelf.id} style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                            <strong style={{ color: shelf.color || '#fff' }}>📁 {shelf.name}</strong>
                                            <div style={{ marginTop: '10px' }}>
                                                {selectedUser.books?.filter((b: any) => b.shelfId === shelf.id).map((book: any) => (
                                                    <div key={book.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', opacity: 0.8, marginBottom: '5px' }}>
                                                        <span>• {book.title}</span>
                                                        <span style={{ color: 'var(--accent)' }}>{Math.round(book.timeSpentSeconds / 60)}m</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <h4 style={{ marginBottom: '15px' }}><Clock size={16}/> Total Interaction</h4>
                                    <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>{Math.round(selectedUser.readingStats?.totalMinutes || 0)} <span style={{ fontSize: '1rem', opacity: 0.5 }}>MINS</span></h2>
                                    <p style={{ color: 'var(--text-dim)', marginTop: '10px' }}>Last Data Pulse: {new Date(selectedUser.lastSync).toLocaleTimeString()}</p>
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
        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>{icon}</div>
        <div>
            <p style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>{title}</p>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{value}</h2>
        </div>
    </div>
);

const sidebarStyle: React.CSSProperties = { width: '300px', height: '100vh', position: 'fixed', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' };
const layoutStyle: React.CSSProperties = { display: 'flex', background: '#050505', minHeight: '100vh', color: '#fff' };
const logoStyle: React.CSSProperties = { width: '50px', height: '50px', background: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900 };
const navItem = { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-dim)', transition: '0.3s', marginBottom: '10px' };
const navItemActive = { ...navItem, background: 'rgba(255,60,60,0.1)', color: 'var(--accent)', fontWeight: 700 };
const logoutBtnStyle: React.CSSProperties = { padding: '40px', border: 'none', background: 'none', color: '#ff3c3c', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 };
const metricsGrid: React.CSSProperties = { display: 'flex', gap: '20px' };
const userRowStyle: React.CSSProperties = { padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderRadius: '15px', background: 'rgba(255,255,255,0.02)', marginBottom: '10px' };
const userAvatar: React.CSSProperties = { width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' };
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalContent: React.CSSProperties = { width: '900px', maxHeight: '90vh', padding: '40px', overflowY: 'auto', borderRadius: '24px' };
const centerStyle: React.CSSProperties = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: '#050505', letterSpacing: '2px' };

export default Dashboard;
