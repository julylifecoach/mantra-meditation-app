import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Extract playlist ID from full URL or return as-is if already an ID
function extractPlaylistId(input) {
    if (!input) return null;
    try {
        const url = new URL(input);
        return url.searchParams.get('list') || input;
    } catch { return input; }
}

const WATCHED_KEY = 'bizcoach_watched';

function getWatched() {
    try { return JSON.parse(localStorage.getItem(WATCHED_KEY) || '[]'); }
    catch { return []; }
}
function markWatched(videoId) {
    const w = getWatched();
    if (!w.includes(videoId)) { w.push(videoId); localStorage.setItem(WATCHED_KEY, JSON.stringify(w)); }
}

// Simple markdown-ish renderer: headers, bold, links, lists, paragraphs
function renderMarkdown(text) {
    if (!text) return null;
    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Headers
        if (line.startsWith('### ')) {
            elements.push(<h4 key={i} style={{ fontSize: '1.05rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{line.slice(4)}</h4>);
        } else if (line.startsWith('## ')) {
            elements.push(<h3 key={i} style={{ fontSize: '1.2rem', marginTop: '2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{line.slice(3)}</h3>);
        } else if (line.startsWith('# ')) {
            elements.push(<h2 key={i} style={{ fontSize: '1.4rem', marginTop: '2rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{line.slice(2)}</h2>);
        }
        // List items
        else if (line.match(/^[-*] /)) {
            elements.push(
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--accent-primary)' }}>•</span>
                    <span dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(2)) }} />
                </div>
            );
        }
        // Empty line
        else if (line.trim() === '') {
            elements.push(<div key={i} style={{ height: '0.5rem' }} />);
        }
        // Regular paragraph
        else {
            elements.push(
                <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '0.5rem' }}
                   dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
            );
        }
        i++;
    }
    return elements;
}

function inlineFormat(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" style="color:var(--accent-primary);text-decoration:underline">$1</a>');
}

export default function ProgramPage({ userProfile }) {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [program, setProgram] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('materials');

    // Video state
    const [videos, setVideos] = useState([]);
    const [videosLoading, setVideosLoading] = useState(false);
    const [activeVideo, setActiveVideo] = useState(null);
    const [watched, setWatchedState] = useState(getWatched());

    useEffect(() => {
        const token = localStorage.getItem('aura_token');
        fetch(`/api/programs/${slug}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.status === 403) throw new Error('not_enrolled');
                if (!res.ok) throw new Error('Failed to load program');
                return res.json();
            })
            .then(data => setProgram(data))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [slug]);

    // Load recordings when tab switches to recordings
    useEffect(() => {
        if (tab === 'recordings' && program?.playlistId && videos.length === 0) {
            setVideosLoading(true);
            const token = localStorage.getItem('aura_token');
            const plId = extractPlaylistId(program.playlistId);
            fetch(`/api/youtube/playlist/${plId}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
                .then(res => res.json())
                .then(data => setVideos(data))
                .catch(e => console.error('Failed to load videos:', e))
                .finally(() => setVideosLoading(false));
        }
    }, [tab, program]);

    const handlePlay = (video) => {
        setActiveVideo(video);
        markWatched(video.videoId);
        setWatchedState(getWatched());
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '8rem', color: 'var(--text-secondary)' }}>Loading...</div>;

    if (error === 'not_enrolled') {
        return (
            <div style={{ textAlign: 'center', marginTop: '8rem', animation: 'fadeIn 0.6s ease-out' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Access Required</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                    You need to be enrolled in this program to view its content.
                </p>
                <button onClick={() => navigate('/bizcoach')} style={{
                    marginTop: '2rem', padding: '10px 24px', borderRadius: '100px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}>← Back to BizCoach</button>
            </div>
        );
    }

    if (error || !program) {
        return (
            <div style={{ textAlign: 'center', marginTop: '8rem', color: '#ef4444' }}>
                {error || 'Program not found'}
            </div>
        );
    }

    return (
        <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', paddingBottom: '6rem' }}>
            {/* Header */}
            <header style={{ marginBottom: '2rem', animation: 'fadeIn 0.6s ease-out' }}>
                <button onClick={() => navigate('/bizcoach')} style={{
                    background: 'none', border: 'none', color: 'var(--text-tertiary)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.85rem',
                    marginBottom: '1rem', padding: 0,
                }}>← Back to BizCoach</button>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{program.title}</h2>
                {program.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>{program.description}</p>
                )}
                {program.startDate && (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Started {new Date(program.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                )}
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '2rem', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--glass-border)', maxWidth: '300px' }}>
                <button onClick={() => setTab('materials')} style={{
                    flex: 1, padding: '0.6rem', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', fontWeight: 600,
                    background: tab === 'materials' ? 'var(--accent-primary)' : 'transparent',
                    color: tab === 'materials' ? '#fff' : 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer', transition: 'var(--transition-fast)',
                }}>Materials</button>
                {program.playlistId && (
                    <button onClick={() => setTab('recordings')} style={{
                        flex: 1, padding: '0.6rem', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', fontWeight: 600,
                        background: tab === 'recordings' ? 'var(--accent-primary)' : 'transparent',
                        color: tab === 'recordings' ? '#fff' : 'var(--text-secondary)',
                        border: 'none', cursor: 'pointer', transition: 'var(--transition-fast)',
                    }}>Recordings</button>
                )}
            </div>

            {/* Materials Tab */}
            {tab === 'materials' && (
                <div className="glass-panel" style={{ padding: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
                    {program.materials ? (
                        <div>{renderMarkdown(program.materials)}</div>
                    ) : (
                        <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
                            No materials have been added yet.
                        </p>
                    )}
                </div>
            )}

            {/* Recordings Tab */}
            {tab === 'recordings' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    {/* Active Player */}
                    {activeVideo && (
                        <div className="glass-panel" style={{ marginBottom: '2rem', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                                <iframe
                                    src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1`}
                                    title={activeVideo.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                />
                            </div>
                            <div style={{ padding: '1.25rem 1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{activeVideo.title}</h3>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                    {new Date(activeVideo.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Video Grid */}
                    {videosLoading ? (
                        <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>Loading recordings...</div>
                    ) : videos.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-tertiary)' }}>No recordings available yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                            {videos.map((video, i) => {
                                const isWatched = watched.includes(video.videoId);
                                const isActive = activeVideo?.videoId === video.videoId;
                                return (
                                    <div key={video.videoId} onClick={() => handlePlay(video)} className="glass-panel" style={{
                                        cursor: 'pointer', borderRadius: '14px', overflow: 'hidden',
                                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                                        border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                                        animation: `fadeIn 0.4s ease-out ${i * 0.03}s both`,
                                    }}
                                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <div style={{ position: 'relative' }}>
                                            <img src={video.thumbnail} alt={video.title} style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} loading="lazy" />
                                            {isWatched && (
                                                <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(16,185,129,0.9)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'white' }}>✓</div>
                                            )}
                                            {isActive && (
                                                <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'var(--accent-primary)', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600, color: 'white' }}>NOW PLAYING</div>
                                            )}
                                        </div>
                                        <div style={{ padding: '0.85rem 1rem' }}>
                                            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem', color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{video.title}</h4>
                                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
                                                {new Date(video.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
