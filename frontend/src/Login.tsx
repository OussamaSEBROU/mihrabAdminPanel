import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const api_url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const res = await axios.post(`${api_url}/admin/login`, { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('role', res.data.role);
            onLogin();
        } catch (err: any) {
            setError(err.response?.data || 'Login Failed');
        }
    };

    return (
        <div style={containerStyle}>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel" 
                style={panelStyle}
            >
                <h1 style={titleStyle}>Sanctuary Admin</h1>
                <p style={subtitleStyle}>Professional Management Console</p>
                
                <form onSubmit={handleSubmit} style={formStyle}>
                    <div style={inputGroup}>
                        <label style={labelStyle}>ADMIN EMAIL</label>
                        <input 
                            type="email" 
                            style={inputStyle} 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@mahrab.com"
                        />
                    </div>
                    <div style={inputGroup}>
                        <label style={labelStyle}>PASSWORD</label>
                        <input 
                            type="password" 
                            style={inputStyle} 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                        />
                    </div>
                    {error && <p style={errorStyle}>{error}</p>}
                    <button type="submit" className="glow-btn" style={btnStyle}>ACCESS DASHBOARD</button>
                </form>
            </motion.div>
        </div>
    );
};

const containerStyle: React.CSSProperties = {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
};

const panelStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '450px',
    padding: '40px',
    textAlign: 'center'
};

const titleStyle: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: '8px',
    letterSpacing: '-0.5px'
};

const subtitleStyle: React.CSSProperties = {
    color: 'var(--text-dim)',
    fontSize: '0.9rem',
    marginBottom: '32px'
};

const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    textAlign: 'left'
};

const inputGroup: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-dim)',
    letterSpacing: '1px'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: 'white',
    outline: 'none',
    transition: 'all 0.3s ease'
};

const btnStyle: React.CSSProperties = {
    marginTop: '10px',
    padding: '16px'
};

const errorStyle: React.CSSProperties = {
    color: '#ff3c3c',
    fontSize: '0.85rem',
    textAlign: 'center'
};

export default Login;
