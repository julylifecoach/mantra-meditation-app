import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Session Modal State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userSessions, setUserSessions] = useState([]);
    const [sessionPage, setSessionPage] = useState(1);
    const SESSIONS_PER_PAGE = 10;
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [newSessionDate, setNewSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [newSessionTopics, setNewSessionTopics] = useState('');
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editingNotes, setEditingNotes] = useState('');
    const [primaryNotes, setPrimaryNotes] = useState('');
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [savingPlaylist, setSavingPlaylist] = useState(false);

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
        setSessionPage(1);
        setPrimaryNotes(user.primaryNotes || '');
        setPlaylistUrl(user.playlistUrl || '');
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
        setSessionPage(1);
        setNewSessionTopics('');
        setEditingSessionId(null);
        setEditingNotes('');
        setPrimaryNotes('');
        setPlaylistUrl('');
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
            setUsers(prev => prev.map(u =>
                u.id === selectedUser.id ? { ...u, _count: { ...u._count, coachingSessions: Math.max(0, (u._count?.coachingSessions || 1) - 1) } } : u
            ));
        } catch (e) { console.error('Failed to delete session') }
    };

    const handleSaveSessionNotes = async (sessionId) => {
        try {
            const token = localStorage.getItem('aura_token');
            await fetch(`/api/admin/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ recordNotes: editingNotes })
            });
            setUserSessions(prev => prev.map(s => s.id === sessionId ? { ...s, recordNotes: editingNotes } : s));
            setEditingSessionId(null);
            setEditingNotes('');
        } catch (e) { console.error('Failed to save notes') }
    };

    const handleSavePrimaryNotes = async () => {
        setSavingNotes(true);
        try {
            const token = localStorage.getItem('aura_token');
            await fetch(`/api/admin/users/${selectedUser.id}/notes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ primaryNotes })
            });
        } catch (e) { console.error('Failed to save notes') }
        finally { setSavingNotes(false); }
    };

    const handleSavePlaylist = async () => {
        setSavingPlaylist(true);
        try {
            const token = localStorage.getItem('aura_token');
            await fetch(`/api/admin/users/${selectedUser.id}/playlist`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ playlistUrl })
            });
        } catch (e) { console.error('Failed to save playlist') }
        finally { setSavingPlaylist(false); }
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
                accessBizCoach: user.accessBizCoach,
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

    // Pagination & Search State
    const [userSearch, setUserSearch] = useState('');
    const [userPage, setUserPage] = useState(1);
    const USERS_PER_PAGE = 10;

    // ... existing init ...
    useEffect(() => {
        fetchUsers();
    }, []);

    // ... filtering and slicing ...
    const filteredUsers = users.filter(u => 
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) || 
        (u.displayName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.nickname || '').toLowerCase().includes(userSearch.toLowerCase())
    );
    const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;
    const displayedUsers = filteredUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);

    if (loading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading...</div>;
    if (error) return (
        <div style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--text-secondary)' }}>
            <h2>Access Denied</h2>
            <p>{error}</p>
        </div>
    );

    const smallBtn = {
        padding: '6px 14px',
        borderRadius: '8px',
        border: '1px solid var(--glass-border)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.85rem',
    };

    return (
        <div style={{ padding: '2rem', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2.5rem', textAlign: 'center', animation: 'fadeIn 0.6s ease-out' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Admin Panel</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {users.length} registered user{users.length !== 1 ? 's' : ''}
                </p>
                <button onClick={() => navigate('/admin/programs')} style={{
                    marginTop: '1rem', padding: '0.5rem 1.25rem', borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.3)', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 500,
                }}>📋 Manage Programs</button>
            </header>

            <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <input 
                        type="text" 
                        placeholder="Search users by name or email..." 
                        value={userSearch}
                        onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                        style={{
                            padding: '0.6rem 1rem', width: '300px', background: 'rgba(0,0,0,0.2)',
                            border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white',
                            fontFamily: 'var(--font-sans)'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button 
                            disabled={userPage === 1} 
                            onClick={() => setUserPage(p => Math.max(1, p - 1))}
                            style={{ ...smallBtn, background: 'rgba(255,255,255,0.1)', opacity: userPage === 1 ? 0.3 : 1 }}
                        >Prev</button>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Page {userPage} of {totalUserPages}</span>
                        <button 
                            disabled={userPage === totalUserPages} 
                            onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                            style={{ ...smallBtn, background: 'rgba(255,255,255,0.1)', opacity: userPage === totalUserPages ? 0.3 : 1 }}
                        >Next</button>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            {['Nickname', 'Real Name', 'Email', 'Posts', 'Write', 'Permissions', 'Joined', ''].map(h => (
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
                        {displayedUsers.map((user, i) => (
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
                                        <button onClick={() => togglePermission(user, 'accessBizCoach')} style={{
                                            ...badgeStyle(user.accessBizCoach)
                                        }}>BizCoach</button>
                                    </div>
                                </td>
                                <td style={{ padding: '0.8rem 1rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '0.8rem 1rem' }}>
                                    <button onClick={() => openSessionModal(user)} style={{
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                                        color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '8px',
                                        cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem',
                                        transition: 'var(--transition-fast)',
                                    }}>Manage ({user._count?.coachingSessions || 0})</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Session / Notes Modal */}
            {selectedUser && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
                }} onClick={closeSessionModal}>
                    <div className="glass-panel" style={{
                        maxWidth: '700px', width: '95%', maxHeight: '85vh',
                        overflow: 'auto', padding: '2rem',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.3rem' }}>Manage: {selectedUser.displayName}</h3>
                            <button onClick={closeSessionModal} style={{
                                background: 'none', border: 'none', color: 'var(--text-tertiary)',
                                fontSize: '1.5rem', cursor: 'pointer',
                            }}>×</button>
                        </div>

                        {/* Primary Notes */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                📝 Primary Notes (Markdown)
                            </label>
                            <textarea
                                value={primaryNotes}
                                onChange={e => setPrimaryNotes(e.target.value)}
                                placeholder="Write client overview notes in Markdown..."
                                rows={6}
                                style={{
                                    width: '100%', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem',
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)',
                                    borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical',
                                    lineHeight: 1.6, boxSizing: 'border-box',
                                }}
                            />
                            <button onClick={handleSavePrimaryNotes} disabled={savingNotes} style={{
                                marginTop: '0.5rem', padding: '6px 16px', borderRadius: '8px',
                                background: 'var(--accent-primary)', color: '#fff', border: 'none',
                                cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.85rem',
                                opacity: savingNotes ? 0.6 : 1,
                            }}>{savingNotes ? 'Saving...' : 'Save Notes'}</button>
                        </div>

                        {/* Playlist URL */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                🎵 Playlist URL
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="url"
                                    value={playlistUrl}
                                    onChange={e => setPlaylistUrl(e.target.value)}
                                    placeholder="YouTube or Spotify playlist URL..."
                                    style={{
                                        flex: 1, padding: '0.5rem 0.75rem',
                                        background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)',
                                        borderRadius: '8px', color: 'var(--text-primary)',
                                        fontFamily: 'var(--font-sans)', fontSize: '0.85rem',
                                    }}
                                />
                                <button onClick={handleSavePlaylist} disabled={savingPlaylist} style={{
                                    padding: '6px 16px', borderRadius: '8px',
                                    background: 'var(--accent-primary)', color: '#fff', border: 'none',
                                    cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.85rem',
                                    opacity: savingPlaylist ? 0.6 : 1,
                                }}>{savingPlaylist ? '...' : 'Save'}</button>
                            </div>
                        </div>

                        <hr style={{ border: '0', borderTop: '1px solid var(--glass-border)', margin: '1.5rem 0' }} />

                        {/* Session Logs */}
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📋 Session Logs</h4>

                        {/* Add Session */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <input type="date" value={newSessionDate} onChange={e => setNewSessionDate(e.target.value)}
                                style={{
                                    padding: '6px 10px', background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--glass-border)', borderRadius: '8px',
                                    color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.85rem',
                                }} />
                            <input type="text" value={newSessionTopics} onChange={e => setNewSessionTopics(e.target.value)}
                                placeholder="Session title / topics"
                                style={{
                                    flex: 1, minWidth: '150px', padding: '6px 10px',
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)',
                                    borderRadius: '8px', color: 'var(--text-primary)',
                                    fontFamily: 'var(--font-sans)', fontSize: '0.85rem',
                                }} />
                            <button onClick={handleAddSession} style={{
                                padding: '6px 16px', borderRadius: '8px',
                                background: 'rgba(16, 185, 129, 0.2)', color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.85rem',
                            }}>+ Add</button>
                        </div>

                        {sessionsLoading ? (
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Loading sessions...</p>
                        ) : userSessions.length === 0 ? (
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No sessions yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Showing {Math.min((sessionPage - 1) * SESSIONS_PER_PAGE + 1, userSessions.length)} - {Math.min(sessionPage * SESSIONS_PER_PAGE, userSessions.length)} of {userSessions.length}
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button 
                                            disabled={sessionPage === 1}
                                            onClick={() => setSessionPage(p => Math.max(1, p - 1))}
                                            style={{ ...smallBtn, padding: '4px 10px', fontSize: '0.8rem', opacity: sessionPage === 1 ? 0.4 : 1 }}
                                        >Prev</button>
                                        <button 
                                            disabled={sessionPage >= Math.ceil(userSessions.length / SESSIONS_PER_PAGE)}
                                            onClick={() => setSessionPage(p => Math.min(Math.ceil(userSessions.length / SESSIONS_PER_PAGE), p + 1))}
                                            style={{ ...smallBtn, padding: '4px 10px', fontSize: '0.8rem', opacity: sessionPage >= Math.ceil(userSessions.length / SESSIONS_PER_PAGE) ? 0.4 : 1 }}
                                        >Next</button>
                                    </div>
                                </div>
                                {userSessions.slice((sessionPage - 1) * SESSIONS_PER_PAGE, sessionPage * SESSIONS_PER_PAGE).map(s => (
                                    <div key={s.id} style={{
                                        padding: '1rem', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <div>
                                                <strong style={{ fontSize: '0.95rem' }}>{s.mainTopics}</strong>
                                                <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                                    {new Date(s.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => {
                                                    if (editingSessionId === s.id) {
                                                        setEditingSessionId(null); setEditingNotes('');
                                                    } else {
                                                        setEditingSessionId(s.id); setEditingNotes(s.recordNotes || '');
                                                    }
                                                }} style={{
                                                    background: 'none', border: 'none', color: 'var(--accent-primary)',
                                                    cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-sans)',
                                                }}>{editingSessionId === s.id ? 'Cancel' : 'Edit Notes'}</button>
                                                <button onClick={() => handleDeleteSession(s.id)} style={{
                                                    background: 'none', border: 'none', color: '#ef4444',
                                                    cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-sans)',
                                                }}>Delete</button>
                                            </div>
                                        </div>
                                        {editingSessionId === s.id ? (
                                            <div>
                                                <textarea
                                                    value={editingNotes}
                                                    onChange={e => setEditingNotes(e.target.value)}
                                                    rows={8}
                                                    placeholder="Session notes (Markdown)..."
                                                    style={{
                                                        width: '100%', padding: '0.75rem', fontFamily: 'monospace',
                                                        fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)',
                                                        border: '1px solid var(--glass-border)', borderRadius: '8px',
                                                        color: 'var(--text-primary)', resize: 'vertical',
                                                        lineHeight: 1.6, boxSizing: 'border-box',
                                                    }}
                                                />
                                                <button onClick={() => handleSaveSessionNotes(s.id)} style={{
                                                    marginTop: '0.5rem', padding: '6px 16px', borderRadius: '8px',
                                                    background: 'var(--accent-primary)', color: '#fff',
                                                    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                                    fontSize: '0.85rem',
                                                }}>Save Notes</button>
                                            </div>
                                        ) : s.recordNotes ? (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                                                {s.recordNotes.substring(0, 120)}{s.recordNotes.length > 120 ? '...' : ''}
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

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
