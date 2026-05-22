import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

export default function UserHub({ userProfile }) {
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (userProfile?.accessClientPortal || userProfile?.accessBizCoach || userProfile?.role === 'admin') {
            setLoadingSessions(true);
            const token = localStorage.getItem('july_token');
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

    // Parse playlist URL into embeddable format
    const getPlaylistEmbed = (url) => {
        if (!url) return null;
        try {
            if (url.includes('youtube.com/playlist') || url.includes('youtube.com/watch')) {
                const urlObj = new URL(url);
                const listId = urlObj.searchParams.get('list');
                const videoId = urlObj.searchParams.get('v');
                if (listId) return { type: 'youtube', src: `https://www.youtube.com/embed/videoseries?list=${listId}` };
                if (videoId) return { type: 'youtube', src: `https://www.youtube.com/embed/${videoId}` };
            } else if (url.includes('youtu.be/')) {
                return { type: 'youtube', src: `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split('?')[0]}` };
            } else if (url.includes('spotify.com')) {
                return { type: 'spotify', src: url.replace('open.spotify.com/', 'open.spotify.com/embed/') };
            }
        } catch { }
        return { type: 'link', src: url };
    };

    const playlistEmbed = getPlaylistEmbed(userProfile?.playlistUrl);

    return (
        <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '2.5rem', animation: 'fadeIn 0.6s ease-out' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Your Hub</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Welcome back to your July Ecosystem portal.</p>
            </header>

            {/* Primary Notes */}
            {userProfile?.primaryNotes && userProfile.primaryNotes.trim() && (
                <section className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', animation: 'fadeIn 0.6s ease-out 0.05s both' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📝 Your Overview
                    </h3>
                    <div style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                        <ReactMarkdown
                            components={{
                                h1: ({ children }) => <h1 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{children}</h1>,
                                h2: ({ children }) => <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{children}</h2>,
                                h3: ({ children }) => <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{children}</h3>,
                                p: ({ children }) => <p style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>{children}</p>,
                                ul: ({ children }) => <ul style={{ margin: '0.5rem 0 1rem 1.5rem' }}>{children}</ul>,
                                ol: ({ children }) => <ol style={{ margin: '0.5rem 0 1rem 1.5rem' }}>{children}</ol>,
                                li: ({ children }) => <li style={{ marginBottom: '0.25rem' }}>{children}</li>,
                                blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--accent-primary)', paddingLeft: '1rem', color: 'var(--text-tertiary)', margin: '1rem 0' }}>{children}</blockquote>,
                                code: ({ inline, children }) => inline
                                    ? <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.4rem', borderRadius: '3px', fontSize: '0.85em' }}>{children}</code>
                                    : <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', overflow: 'auto', marginBottom: '1rem' }}><code>{children}</code></pre>,
                                strong: ({ children }) => <strong style={{ color: 'var(--text-primary)' }}>{children}</strong>,
                            }}
                        >{userProfile.primaryNotes}</ReactMarkdown>
                    </div>
                </section>
            )}

            {/* Playlist */}
            {playlistEmbed && (
                <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', animation: 'fadeIn 0.6s ease-out 0.1s both' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🎵 Your Playlist
                    </h3>
                    {playlistEmbed.type === 'link' ? (
                        <a href={playlistEmbed.src} target="_blank" rel="noreferrer"
                            style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
                            Open Playlist ↗
                        </a>
                    ) : (
                        <iframe
                            src={playlistEmbed.src}
                            title="Playlist"
                            width="100%"
                            height={playlistEmbed.type === 'spotify' ? 352 : 300}
                            style={{ border: 'none', borderRadius: '12px' }}
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                        />
                    )}
                </section>
            )}

            {/* Session Logs */}
            {sessions.length > 0 && (
                <section className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', animation: 'fadeIn 0.6s ease-out 0.15s both' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📋 Session Logs
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {sessions.map(s => (
                            <div
                                key={s.id}
                                onClick={() => navigate(`/hub/session/${s.id}`)}
                                style={{
                                    padding: '1rem 1.25rem', borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    transition: 'var(--transition-fast)',
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'none'; }}
                            >
                                <div>
                                    <strong style={{ fontSize: '0.95rem' }}>{s.mainTopics}</strong>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                                    {new Date(s.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

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

                    {/* Self-Coaching Program - Coming Soon */}
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--glass-border)', marginBottom: '1rem', opacity: 0.6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <h4 style={{ fontSize: '1.05rem' }}>Self-Coaching Program</h4>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--text-tertiary)', color: 'var(--bg-primary)', borderRadius: '4px', fontWeight: 600 }}>COMING SOON</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>The Buddhist Happiness Wiki & 108-Day Challenge are currently under development.</p>
                    </div>

                    {userProfile?.accessContentCreator || userProfile?.role === 'admin' ? (
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

                    {/* BizCoach Program */}
                    {userProfile?.accessBizCoach || userProfile?.role === 'admin' ? (
                        <div
                            onClick={() => navigate('/bizcoach')}
                            style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)', cursor: 'pointer', marginTop: '1rem' }}
                        >
                            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem', color: '#f59e0b' }}>BizCoach</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Video library and program materials.</p>
                        </div>
                    ) : (
                        <div
                            style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--glass-border)', opacity: 0.6, marginTop: '1rem' }}
                        >
                            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>BizCoach</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Locked. Contact Billy to enroll.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
