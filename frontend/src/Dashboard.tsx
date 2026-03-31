import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, Clock, LogOut, ChevronRight, Smartphone, BookOpen, Layers, X, Calendar, Download } from 'lucide-react';

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null); // المستخدم المختار لرؤية تفاصيله
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
                axios.get(`${api_url}/admin/detailed-metrics`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setUsers(usersRes.data);
            setStats(metricsRes.data);
            setLoading(false);
        } catch (err) {}
    };

    if (loading) return <div style={centerStyle}>NEURAL SYNC IN PROGRESS...</div>;

    return (
        <div style={layoutStyle}>
            {/* Sidebar & Navigation */}
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

            {/* Main Area */}
            <main style={{ marginLeft: '300px', flex: 1, padding: '40px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>Global Pulse Archive</h1>
                        <p style={{ color: 'var(--text-dim)' }}>Active System Nodes: {users.length}</p>
                    </div>
                </header>

                {/* Top Metrics Cards */}
                <div style={metricsGrid}>
                    <MetricCard title="Total Installs" value={stats?.totalInstalls || 0} icon={<Smartphone color="#ff3c3c"/>} />
                    <MetricCard title="Active Today" value={stats?.activeToday || 0} icon={<Activity color="#ff3c3c"/>} />
                    <MetricCard title="Est. Uninstalled" value={stats?.likelyUninstalled || 0} icon={<X color="#f97316"/>} />
                </div>

                {/* Users List Body */}
                <div className="glass-panel" style={{ padding: '30px', marginTop: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                         <h3>User Intelligence Nodes</h3>
                         <input type="text" placeholder="Filter node ID..." style={inputStyle} value={filter} onChange={(e)=>setFilter(e.target.value)} />
                    </div>
                    {users.filter(u => u.deviceId.includes(filter)).map((user) => (
                        <motion.div 
                            key={user._id} 
                            onClick={() => setSelectedUser(user)}
                            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }} 
                            style={userRowStyle}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={userAvatar}><Smartphone size={18}/></div>
                                <div>
                                    <h4 style={{ fontSize: '1rem', color: '#fff' }}>Node_{user.deviceId.slice(0, 10)}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'rgba(60, 255, 100, 1)' }}>{user.activeStatus}</p>
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

            {/* --- USER DETAIL EXPLORER (MODAL) --- */}
            <AnimatePresence>
            {selectedUser && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={modalOverlay}>
                    <motion.div 
                        initial={{ y: 50 }} animate={{ y: 0 }} 
                        className="glass-panel" 
                        style={modalContent}
                    >
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <Smartphone size={30} color="var(--accent)"/>
                                <div>
                                    <h2>Device ID: {selectedUser.deviceId}</h2>
                                    <p style={{ color: 'var(--text-dim)' }}><Calendar size={14}/> First Sync/Install: {new Date(selectedUser.installDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} style={closeBtn}><X size={24}/></button>
                        </header>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                            {/* Shelves & Books List */}
                            <div>
                                <h3 style={{ marginBottom: '20px' }}>Archive/Shelves Structure</h3>
                                {selectedUser.shelves?.map((shelf: any) => (
                                    <div key={shelf.id} style={shelfCard}>
                                        <div style={{...shelfTag, backgroundColor: shelf.color}}><Layers size={14}/> {shelf.name}</div>
                                        <div style={bookList}>
                                            {selectedUser.books?.filter((b: any) => b.shelfId === shelf.id).map((book: any) => (
                                                <div key={book.id} style={bookItem}>
                                                    <span>{book.title}</span>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{Math.round(book.timeSpentSeconds / 60)} min</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Analytics View */}
                            <div>
                                <h3 style={{ marginBottom: '20px' }}>Activity Heatmap (Peak Times)</h3>
                                <div className="glass-panel" style={{ padding: '20px', height: '
