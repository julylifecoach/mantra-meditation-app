import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

export default function SessionView({ userProfile }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('aura_token');
        fetch(`/api/user/coaching-sessions/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Session not found');
                return res.json();
            })
            .then(data => setSession(data))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', marginTop: '8rem', color: 'var(--text-secondary)' }}>
                Loading session...
            </div>
        );
    }

    if (error || !session) {
        return (
            <div style={{ textAlign: 'center', marginTop: '8rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Session Not Found</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{error || 'This session does not exist.'}</p>
                <button onClick={() => navigate('/hub')} style={{
                    padding: '10px 24px', borderRadius: '100px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}>← Back to Hub</button>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', maxWidth: '750px', margin: '0 auto', paddingBottom: '4rem' }}>
            <button
                onClick={() => navigate('/hub')}
                style={{
                    background: 'none', border: 'none', color: 'var(--text-tertiary)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.9rem',
                    padding: 0, marginBottom: '2rem', display: 'block',
                }}
            >← Back to Hub</button>

            <header style={{ marginBottom: '2.5rem', animation: 'fadeIn 0.6s ease-out' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-display, var(--font-sans))' }}>
                    {session.mainTopics || 'Session Notes'}
                </h2>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                    {new Date(session.sessionDate).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                    })}
                </p>
            </header>

            {session.recordNotes ? (
                <div className="glass-panel" style={{ padding: '2rem', animation: 'fadeIn 0.6s ease-out 0.1s both' }}>
                    <div className="md-content" style={{ lineHeight: 1.8 }}>
                        <ReactMarkdown>{session.recordNotes}</ReactMarkdown>
                    </div>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        No notes for this session yet.
                    </p>
                </div>
            )}
        </div>
    );
}
