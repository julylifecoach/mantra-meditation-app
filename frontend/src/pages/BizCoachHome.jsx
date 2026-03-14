import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const PLAYLIST_ID = 'PLuKhWHUzb_knzuzuCfzxRQYuEM3ru_G1t';
const WATCHED_KEY = 'bizcoach_watched';

function getWatched() {
    try {
        return JSON.parse(localStorage.getItem(WATCHED_KEY) || '[]');
    } catch { return []; }
}

function markWatched(videoId) {
    const watched = getWatched();
    if (!watched.includes(videoId)) {
        watched.push(videoId);
        localStorage.setItem(WATCHED_KEY, JSON.stringify(watched));
    }
}

export default function BizCoachHome({ userProfile }) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeVideo, setActiveVideo] = useState(null);
    const [watched, setWatchedState] = useState(getWatched());
    const [monthFilter, setMonthFilter] = useState('all');
    const navigate = useNavigate();

    const hasAccess = userProfile?.accessBizCoach || userProfile?.role === 'admin';

    useEffect(() => {
        if (!hasAccess) return;
        const token = localStorage.getItem('aura_token');
        fetch(`/api/youtube/playlist/${PLAYLIST_ID}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to load videos');
                return res.json();
            })
            .then(data => {
                setVideos(data);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [hasAccess]);

    // Extract unique month/year labels from video titles or publishedAt dates
    const monthOptions = useMemo(() => {
        const months = new Set();
        videos.forEach(v => {
            const date = new Date(v.publishedAt);
            const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            months.add(label);
        });
        return ['all', ...Array.from(months)];
    }, [videos]);

    const filteredVideos = useMemo(() => {
        if (monthFilter === 'all') return videos;
        return videos.filter(v => {
            const date = new Date(v.publishedAt);
            const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            return label === monthFilter;
        });
    }, [videos, monthFilter]);

    const handlePlay = (video) => {
        setActiveVideo(video);
        markWatched(video.videoId);
        setWatchedState(getWatched());
    };

    if (!hasAccess) {
        return (
            <div style={{ textAlign: 'center', marginTop: '8rem', animation: 'fadeIn 0.6s ease-out' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>BizCoach Program</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                    You need to be enrolled in the BizCoach program to access this content.
                </p>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        marginTop: '2rem', padding: '10px 24px', borderRadius: '100px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}
                >
                    ← Back to Hub
                </button>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', paddingBottom: '6rem' }}>
            <header style={{ marginBottom: '2rem', animation: 'fadeIn 0.6s ease-out' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>BizCoach Library</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {videos.length} recorded calls • Click to watch
                </p>
            </header>

            {/* Active Video Player */}
            {activeVideo && (
                <div className="glass-panel" style={{
                    marginBottom: '2rem', padding: '0', borderRadius: '16px', overflow: 'hidden',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                        <iframe
                            src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1`}
                            title={activeVideo.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{
                                position: 'absolute', top: 0, left: 0,
                                width: '100%', height: '100%', border: 'none'
                            }}
                        />
                    </div>
                    <div style={{ padding: '1.25rem 1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{activeVideo.title}</h3>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                            {new Date(activeVideo.publishedAt).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    style={{
                        padding: '8px 16px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem',
                        cursor: 'pointer',
                    }}
                >
                    {monthOptions.map(m => (
                        <option key={m} value={m} style={{ background: '#1a1a2e' }}>
                            {m === 'all' ? 'All Months' : m}
                        </option>
                    ))}
                </select>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                    Showing {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Video Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-secondary)' }}>
                    Loading videos...
                </div>
            ) : error ? (
                <div style={{ textAlign: 'center', marginTop: '4rem', color: '#ef4444' }}>
                    {error}
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1.25rem',
                }}>
                    {filteredVideos.map((video, i) => {
                        const isWatched = watched.includes(video.videoId);
                        const isActive = activeVideo?.videoId === video.videoId;

                        return (
                            <div
                                key={video.videoId}
                                onClick={() => handlePlay(video)}
                                className="glass-panel"
                                style={{
                                    cursor: 'pointer',
                                    borderRadius: '14px',
                                    overflow: 'hidden',
                                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                                    border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                                    animation: `fadeIn 0.4s ease-out ${i * 0.03}s both`,
                                    transform: 'scale(1)',
                                }}
                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {/* Thumbnail */}
                                <div style={{ position: 'relative' }}>
                                    <img
                                        src={video.thumbnail}
                                        alt={video.title}
                                        style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                                        loading="lazy"
                                    />
                                    {isWatched && (
                                        <div style={{
                                            position: 'absolute', top: '8px', right: '8px',
                                            background: 'rgba(16, 185, 129, 0.9)',
                                            borderRadius: '50%', width: '24px', height: '24px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '14px', color: 'white',
                                        }}>
                                            ✓
                                        </div>
                                    )}
                                    {isActive && (
                                        <div style={{
                                            position: 'absolute', bottom: '8px', left: '8px',
                                            background: 'var(--accent-primary)',
                                            borderRadius: '6px', padding: '2px 8px',
                                            fontSize: '0.7rem', fontWeight: 600, color: 'white',
                                        }}>
                                            NOW PLAYING
                                        </div>
                                    )}
                                </div>
                                {/* Info */}
                                <div style={{ padding: '0.85rem 1rem' }}>
                                    <h4 style={{
                                        fontSize: '0.9rem', marginBottom: '0.25rem',
                                        color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        lineHeight: 1.3,
                                        display: '-webkit-box', WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                    }}>
                                        {video.title}
                                    </h4>
                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
                                        {new Date(video.publishedAt).toLocaleDateString('en-US', {
                                            year: 'numeric', month: 'short', day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
