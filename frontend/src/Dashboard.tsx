import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { motion } from 'framer-motion';
import { Users, Activity, Clock, LogOut, ChevronRight, Download, Search, Settings, Shield } from 'lucide-react';

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null); // أضفنا متغير للخطأ
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
            const metricsRes = await axios.get(`${api_url}/admin/metrics`, { headers: { Authorization: `Bearer ${token}` } });
            const usersRes = await axios.get(`${api_url}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
            
            setStats(metricsRes.data);
            setUsers(usersRes.data);
            setLoading(false);
            setError(null);
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.response?.data || err.message || 'Fetch Failed');
            // لا نلغي شاشة الـ Loading في حال وجود خطأ لنظهر الرسالة
        }
    };

    const downloadCSV = () => { /* ... نفس الكود السابق ... */ };

    // إذا حدث خطأ، سنظهره هنا لنفهم ما يجري
    if (error) return (
        <div style={centerStyle}>
            <div style={{ color: '#ff3c3c', textAlign: 'center' }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>⚠️ {error}</p>
                <button onClick={() => window.location.reload()} className="glow-btn">Retry Connection</button>
            </div>
        </div>
    );

    if (loading) return <div style={centerStyle}>INITIALIZING ARCHIVE...</div>;

    return (
        <div style={layoutStyle}>
            {/* ... باقي كود الـ Dashboard هنا ... */}
             <aside className="glass-panel" style={sidebarStyle}>
                <div style={{ padding: '30px' }}>
                    <div style={{ width: '45px', height: '45px', background: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: '50px' }}>S</div>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', borderRadius: '12px', cursor: 'pointer', background: 'rgba(255, 60, 60, 0.1)', color: 'var(--accent)', fontWeight: 600 }}><Activity size={20} /> Overview</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-dim)' }}><Users size={20} /> Users</div>
                    </nav>
                </div>
                <button onClick={() => { localStorage.clear(); onLogout(); }} style={{ padding: '30px', display: 'flex', alignItems: 'center', gap: '10px', color: '#ff3131', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    <LogOut size={20} /> Logout
                </button>
            </aside>
            <main style={{ marginLeft: '280px', flex: 1, padding: '40px' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1>Neural Dashboard</h1>
                </header>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                     <div className="glass-panel" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <Users color="#ff3c3c" />
                        <div>
                             <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Users</p>
                             <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>{stats?.totalUsers || 0}</h2>
                        </div>
                     </div>
                </div>
            </main>
        </div>
    );
};

const centerStyle: React.CSSProperties = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: 'white' };
const layoutStyle: React.CSSProperties = { display: 'flex', minHeight: '100vh', background: '#050505' };
const sidebarStyle: React.CSSProperties = { width: '280px', position: 'fixed', height: '100vh', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' };

export default Dashboard;
