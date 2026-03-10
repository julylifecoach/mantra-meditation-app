import React, { useState, useEffect } from 'react';

export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Session Modal State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userSessions, setUserSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [newSessionDate, setNewSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [newSessionTopics, setNewSessionTopics] = useState('');

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

    const openSessionModal = async (user) => {
        setSelectedUser(user);
        setSessionsLoading(true);
        try {
            const token = localStorage.getItem('aura_token');
            const res = await fetch(`/api/admin/users/${user.id}/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setUserSessions(data || []);
        } catch (e) {
            console.error('Failed to load sessions', e);
        } finally {
            setSessionsLoading(false);
        }
    };

    const closeSessionModal = () => {
        setSelectedUser(null);
        setUserSessions([]);
        setNewSessionTopics('');
    };

    const handleAddSession = async () => {
        if (!newSessionTopics.trim()) return;
        try {
            const token = localStorage.getItem('aura_token');
            const res = await fetch(`/api/admin/users/${selectedUser.id}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sessionDate: newSessionDate, mainTopics: newSessionTopics })
            });
            if (res.ok) {
                const newSession = await res.json();
                setUserSessions([newSession, ...userSessions]);
                setNewSessionTopics('');

                // Update _count locally
                setUsers(prev => prev.map(u =>
                    u.id === selectedUser.id ? { ...u, _count: { ...u._count, coachingSessions: (u._count?.coachingSessions || 0) + 1 } } : u
                ));
            }
        } catch (e) { console.error('Failed to add session') }
    };

    const handleDeleteSession = async (sessionId) => {
        try {
            const token = localStorage.getItem('aura_token');
            await fetch(`/api/admin/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUserSessions(userSessions.filter(s => s.id !== sessionId));

            // Update _count locally
            setUsers(prev => prev.map(u =>
                u.id === selectedUser.id ? { ...u, _count: { ...u._count, coachingSessions: Math.max(0, (u._count?.coachingSessions || 1) - 1) } } : u
            ));
        } catch (e) { console.error('Failed to delete session') }
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

    const togglePermission = async (user, permissionField) => {
        try {
            const token = localStorage.getItem('aura_token');
            const newPermissions = {
                accessSelfCoaching: user.accessSelfCoaching,
                accessContentCreator: user.accessContentCreator,
                accessClientPortal: user.accessClientPortal,
                [permissionField]: !user[permissionField]
            };

            const res = await fetch(`/api/admin/users/${user.id}/permissions`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newPermissions)
            });

            if (res.ok) {
                setUsers(prev => prev.map(u =>
                    u.id === user.id ? { ...u, [permissionField]: !u[permissionField] } : u
                ));
            }
        } catch (e) {
            console.error('Permission toggle failed:', e);
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            {['Nickname', 'Real Name', 'Email', 'Posts', 'Write', 'Permissions', 'Joined'].map(h => (
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
                                {/* Ecosystem Permissions */}
                                <td style={{ padding: '0.8rem 1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button onClick={() => togglePermission(user, 'accessSelfCoaching')} style={{
                                            ...badgeStyle(user.accessSelfCoaching)
                                        }}>Edu</button>
                                        <button onClick={() => togglePermission(user, 'accessContentCreator')} style={{
                                            ...badgeStyle(user.accessContentCreator)
                                        }}>Creator</button>
                                        <button onClick={() => togglePermission(user, 'accessClientPortal')} style={{
                                            ...badgeStyle(user.accessClientPortal)
                                        }}>Client</button>
                                    </div>
                                </td>
                                <td style={{ padding: '0.8rem 1rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Minimal styles for the permission badges */}
            <style>{`
                .glass-panel::-webkit-scrollbar {
                    height: 8px;
                }
                .glass-panel::-webkit-scrollbar-track {
                    background: rgba(0,0,0,0.2);
                }
                .glass-panel::-webkit-scrollbar-thumb {
                    background: var(--glass-border);
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
}

// Helper for permission badges
function badgeStyle(isActive) {
    return {
        background: isActive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${isActive ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.1)'}`,
        color: isActive ? 'var(--accent-secondary)' : 'var(--text-tertiary)',
        padding: '4px 10px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '0.75rem',
        transition: 'var(--transition-fast)'
    };
}
