import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Activity, Clock, LogOut, ChevronRight, Download, Search, Settings, Shield 
} from 'lucide-react';

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const api_url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Live update every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [metricsRes, usersRes] = await Promise.all([
                axios.get(`${api_url}/admin/metrics`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${api_url}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setStats(metricsRes.data);
            setUsers(usersRes.data);
            setLoading(false);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    const downloadCSV = () => {
        const headers = ["Device ID", "Last Sync", "Total Minutes", "Streak"];
        const rows = users.map(u => [u.deviceId, u.lastSync, u.readingStats?.totalMinutes || 0, u.habit?.streak || 0]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sanctuary_users.csv';
        a.click();
    };

    if (loading) return <div style={centerStyle}>INITIALIZING ARCHIVE...</div>;

    return (
        <div style={layoutStyle}>
            {/* Sidebar */}
            <aside className="glass-panel" style={sidebarStyle}>
                <div style={{ padding: '30px' }}>
                    <div style={logoStyle}>S</div>
                    <nav style={navStyle}>
                        <div style={navItemActive}><Activity size={20} /> Overview</div>
                        <div style={navItem}><Users size={20} /> Users</div>
                        <div style={navItem}><Shield size={20} /> Security</div>
                        <div style={navItem}><Settings size={20} /> System</div>
                    </nav>
                </div>
                <button onClick={() => { localStorage.clear(); onLogout(); }} style={logoutBtn}>
                    <LogOut size={20} /> Logout
                </button>
            </aside>

            {/* Main Content */}
            <main style={mainStyle}>
                <header style={headerStyle}>
                    <h1>Neural Dashboard</h1>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={downloadCSV} className="glass-panel" style={iconBtnStyle}>
                            <Download size={18} /> Export CSV
                        </button>
                        <div className="glass-panel" style={searchStyle}>
                            <Search size={18} color="#888" />
                            <input 
                                type="text" 
                                placeholder="Search Device ID..." 
                                style={searchInput}
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </header>

                {/* Stats Cards */}
                <div style={gridStyle}>
                    <StatCard icon={<Users color="#ff3c3c" />} label="Total Synchronized" value={stats?.totalUsers || 0} />
                    <StatCard icon={<Activity color="#ff3c3c" />} label="Active Sessions (sec)" value={stats?.activeCount || 0} isPulse />
                    <StatCard icon={<Clock color="#ff3c3c" />} label="Cumulative Reading" value={`${Math.round(stats?.totalMinutes || 0)}m`} />
                </div>

                {/* Chart */}
                <div className="glass-panel" style={chartContainerStyle}>
                    <h3 style={{ marginBottom: '20px' }}>Engagement Fluctuations</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={users.length > 0 ? users.slice(0, 10).reverse() : []}>
                                <defs>
                                    <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff3c3c" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ff3c3c" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="deviceId" hide />
                                <YAxis stroke="rgba(255,255,255,0.3)" />
                                <Tooltip 
                                    contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '10px' }}
                                    itemStyle={{ color: '#ff3c3c' }}
                                />
                                <Area type="monotone" dataKey="readingStats.totalMinutes" stroke="#ff3c3c" fillOpacity={1} fill="url(#colorMin)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* User List */}
                <div className="glass-panel" style={tableContainerStyle}>
                    <h3 style={{ padding: '20px' }}>Synchronized Nodes</h3>
                    <table style={tableStyle}>
                        <thead>
                            <tr style={tableHeaderRow}>
                                <th style={thStyle}>DEVICE_ID</th>
                                <th style={thStyle}>STATUS</th>
                                <th style={thStyle}>SESSION_TIME</th>
                                <th style={thStyle}>STREAK</th>
                                <th style={thStyle}>SYNC_AT</th>
                                <th style={thStyle}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.filter(u => u.deviceId.includes(filter)).map((user, i) => (
                                <tr key={i} style={trStyle}>
                                    <td style={tdStyle}>{user.deviceId.substring(0, 16)}...</td>
                                    <td style={tdStyle}>
                                        <span style={user.activeStatus !== 'Idle' ? activeBadge : idleBadge}>
                                            {user.activeStatus}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{Math.round(user.readingStats?.totalMinutes || 0)} min</td>
                                    <td style={tdStyle}>{user.habit?.streak || 0} days</td>
                                    <td style={tdStyle}>{new Date(user.lastSync).toLocaleTimeString()}</td>
                                    <td style={tdStyle}><ChevronRight size={18} color="#888" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

const StatCard: React.FC<{ icon: any, label: string, value: string | number, isPulse?: boolean }> = ({ icon, label, value, isPulse }) => (
    <motion.div 
        whileHover={{ scale: 1.02 }}
        className="glass-panel" 
        style={statCardStyle}
    >
        <div style={statIconStyle}>{icon}</div>
        <div>
            <p style={statLabelStyle}>{label}</p>
            <h2 style={statValueStyle}>{value} {isPulse && <span className="pulse-dot" />}</h2>
        </div>
    </motion.div>
);

// --- CSS Objects ---
const layoutStyle: React.CSSProperties = { display: 'flex', minHeight: '100vh', background: '#050505' };
const sidebarStyle: React.CSSProperties = { width: '280px', position: 'fixed', height: '100vh', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' };
const mainStyle: React.CSSProperties = { marginLeft: '280px', flex: 1, padding: '40px' };
const logoStyle: React.CSSProperties = { width: '45px', height: '45px', background: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: '50px' };
const navStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '15px' };
const navItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-dim)', transition: 'all 0.2s' };
const navItemActive: React.CSSProperties = { ...navItem, background: 'rgba(255, 60, 60, 0.1)', color: 'var(--accent)', fontWeight: 600 };
const logoutBtn: React.CSSProperties = { padding: '30px', display: 'flex', alignItems: 'center', gap: '10px', color: '#ff3131', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' };
const statCardStyle: React.CSSProperties = { padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' };
const statIconStyle: React.CSSProperties = { width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(255, 60, 60, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const statLabelStyle: React.CSSProperties = { fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' };
const statValueStyle: React.CSSProperties = { fontSize: '1.8rem', fontWeight: 700 };
const chartContainerStyle: React.CSSProperties = { padding: '30px', marginBottom: '30px' };
const tableContainerStyle: React.CSSProperties = { overflow: 'hidden' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '15px 20px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', borderBottom: '1px solid var(--glass-border)' };
const tdStyle: React.CSSProperties = { padding: '18px 20px', fontSize: '0.9rem', color: 'var(--text-main)', borderBottom: '1px solid rgba(255,255,255,0.03)' };
const trStyle: React.CSSProperties = { transition: 'background 0.2s' };
const activeBadge: React.CSSProperties = { background: 'rgba(50, 255, 50, 0.1)', color: '#32ff32', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 };
const idleBadge: React.CSSProperties = { background: 'rgba(255, 255, 255, 0.05)', color: '#888', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 };
const iconBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' };
const searchStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 15px', width: '250px' };
const searchInput: React.CSSProperties = { background: 'none', border: 'none', color: 'white', outline: 'none', width: '100%', padding: '10px 0' };
const centerStyle: React.CSSProperties = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '2px', color: '#ff3c3c' };
const tableHeaderRow: React.CSSProperties = { background: 'rgba(255,255,255,0.02)' };

export default Dashboard;
