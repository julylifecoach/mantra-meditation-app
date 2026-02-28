import React, { useState, useEffect } from 'react';

export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('aura_token');
            const res = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Access denied');
            const data = await res.json();
            setUsers(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleCanWrite = async (userId, currentValue) => {
        try {
            const token = localStorage.getItem('aura_token');
            const res = await fetch(`/api/admin/users/${userId}/canWrite`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ canWrite: !currentValue })
            });
            if (res.ok) {
                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, canWrite: !currentValue } : u
                ));
            }
        } catch (e) {
            console.error('Toggle failed:', e);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading...</div>;
    if (error) return (
        <div style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--text-secondary)' }}>
            <h2>Access Denied</h2>
            <p>{error}</p>
        </div>
    );

    return (
        <div style={{ padding: '2rem', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2.5rem', textAlign: 'center', animation: 'fadeIn 0.6s ease-out' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Admin Panel</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {users.length} registered user{users.length !== 1 ? 's' : ''}
                </p>
            </header>

            <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            {['Nickname', 'Real Name', 'Email', 'Posts', 'Write', 'Joined'].map(h => (
                                <th key={h} style={{
                                    textAlign: 'left', padding: '0.8rem 1rem',
                                    color: 'var(--text-tertiary)', fontWeight: 500,
                                    fontSize: '0.85rem', textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, i) => (
                            <tr
                                key={user.id}
                                style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    animation: `fadeIn 0.4s ease-out ${i * 0.05}s both`,
                                }}
                            >
                                <td style={{ padding: '0.8rem 1rem', color: 'var(--accent-primary)', fontWeight: 500 }}>
                                    {user.nickname || '—'}
                                </td>
                                <td style={{ padding: '0.8rem 1rem', color: 'var(--text-primary)' }}>
                                    {user.displayName}
                                </td>
                                <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    {user.email}
                                </td>
                                <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                    {user._count?.reflections || 0}
                                </td>
                                <td style={{ padding: '0.8rem 1rem' }}>
                                    <button
                                        onClick={() => toggleCanWrite(user.id, user.canWrite)}
                                        disabled={user.role === 'admin'}
                                        style={{
                                            background: user.canWrite ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                            border: `1px solid ${user.canWrite ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                                            color: user.canWrite ? '#10b981' : '#ef4444',
                                            padding: '4px 14px',
                                            borderRadius: '12px',
                                            cursor: user.role === 'admin' ? 'default' : 'pointer',
                                            fontFamily: 'inherit',
                                            fontSize: '0.85rem',
                                            opacity: user.role === 'admin' ? 0.5 : 1,
                                            transition: 'var(--transition-fast)'
                                        }}
                                    >
                                        {user.canWrite ? 'Allowed' : 'Revoked'}
                                    </button>
                                </td>
                                <td style={{ padding: '0.8rem 1rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
