import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UserHub({ userProfile }) {
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (userProfile?.accessClientPortal) {
            setLoadingSessions(true);
            const token = localStorage.getItem('aura_token');
            fetch('/api/user/coaching-sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setSessions(data);
                })
                .catch(e => console.error('Failed to load sessions:', e))
                .finally(() => setLoadingSessions(false));
        }
    }, [userProfile]);

    return (
        <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '2.5rem', animation: 'fadeIn 0.6s ease-out' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Your Hub</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Welcome back to your July Ecosystem portal.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>

                {/* Apps & Progress */}
                <section className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏔️ Ecosystem Apps
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <a href="https://tools.julylifecoach.com" target="_blank" rel="noreferrer"
                            style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', textDecoration: 'none', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', display: 'block', transition: 'var(--transition-fast)' }}>
                            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Daily Quizzes</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>NLP & Resilience checks</p>
                        </a>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>French Vocabulary</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>A1-B1 Practice sets</p>
                        </div>
                    </div>
                </section>

                {/* Subscriptions & Edu */}
                <section className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📚 Education
                    </h3>

                    {userProfile?.accessSelfCoaching ? (
                        <div 
                            onClick={() => navigate('/self-coaching-wiki')}
                            style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '1rem', cursor: 'pointer' }}>
                            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem', color: '#10b981' }}>Self-Coaching Program</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Buddhist Happiness Wiki & 108-Day Challenge unlocked.</p>
                        </div>
                    ) : (
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--glass-border)', marginBottom: '1rem', opacity: 0.6 }}>
                            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Self-Coaching Program</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Locked. Enroll to access.</p>
                        </div>
                    )}

                    {userProfile?.accessContentCreator ? (
                        <div
                            onClick={() => navigate('/content-creator-wiki')}
                            style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)', cursor: 'pointer' }}
                        >
                            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem', color: '#8b5cf6' }}>Content Creator</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Companion guide and strategies unlocked.</p>
                        </div>
                    ) : (
                        <div
                            onClick={() => navigate('/content-creator')}
                            style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--glass-border)', opacity: 0.6, cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.opacity = 1}
                            onMouseOut={e => e.currentTarget.style.opacity = 0.6}
                        >
                            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Content Creator</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Locked. Click to view program info.</p>
                        </div>
                    )}
                </section>
            </div>

            {/* Client Portal Section for Coaching Clients */}
            {userProfile?.accessClientPortal && (
                <section className="glass-panel" style={{ padding: '2rem', animation: 'fadeIn 0.8s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-secondary)' }}>1:1 Client Portal</h3>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>{sessions.length} sessions</span>
                    </div>

                    {loadingSessions ? (
                        <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem 0' }}>Loading session history...</p>
                    ) : sessions.length === 0 ? (
                        <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No coaching sessions recorded yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {sessions.map((sess) => (
                                <div key={sess.id} style={{
                                    padding: '1.2rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderLeft: '4px solid var(--accent-secondary)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{sess.mainTopics}</h4>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                                            {new Date(sess.sessionDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        Topics discussed: {sess.mainTopics}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
