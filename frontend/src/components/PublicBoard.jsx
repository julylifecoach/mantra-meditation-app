import React, { useState, useEffect } from 'react';

// Soft, visually pleasing colors for the masonry/grid cards
const CARD_COLORS = [
    'rgba(139, 92, 246, 0.08)',
    'rgba(59, 130, 246, 0.08)',
    'rgba(236, 72, 153, 0.08)',
    'rgba(16, 185, 129, 0.08)'
];

const MOCK_PUBLIC = [
    { id: 101, title: "Morning Calm", content: "Finding peace in the small moments today. The breathing exercise really helped me center myself before a busy work day.", date: new Date().toISOString(), user: { displayName: "Anonymous" } },
    { id: 102, title: "Struggling but trying", content: "I struggled to sit still, my mind kept wandering to my upcoming exams. But the mantra 'I trust my intuition' gave me some unexpected clarity.", date: new Date(Date.now() - 3600000).toISOString(), user: { displayName: "StudentMind" } },
    { id: 103, content: "I've been holding onto a lot of tension in my shoulders. Just noticing it was half the battle.", date: new Date(Date.now() - 7200000).toISOString(), user: { displayName: "Anonymous" } },
    { id: 104, title: "A beautiful release", content: "Beautiful session. I cried a little bit near the end just feeling a release of weight.", date: new Date(Date.now() - 14400000).toISOString(), user: { displayName: "GraceSeeker" } },
    { id: 105, content: "First time trying this. Very calming UI.", date: new Date(Date.now() - 86400000).toISOString(), user: { displayName: "Newbie" } },
];

export default function PublicBoard({ beginnerMode }) {
    const [reflections, setReflections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [newReflection, setNewReflection] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        // Attempt backend fetch, fallback to localStorage/mocks gracefully
        const fetchBoard = async () => {
            try {
                const response = await fetch('/api/reflections/public');
                if (response.ok) {
                    const data = await response.json();
                    setReflections(data);
                } else {
                    loadLocally();
                }
            } catch (err) {
                loadLocally();
            } finally {
                setLoading(false);
            }
        };

        fetchBoard();
    }, []);

    const loadLocally = () => {
        const local = localStorage.getItem('aura_public');
        if (local) {
            setReflections(JSON.parse(local).filter(r => r.isPublic !== false));
        } else {
            setReflections(MOCK_PUBLIC);
            // Seed the local storage so it persists for the demo
            localStorage.setItem('aura_public', JSON.stringify(MOCK_PUBLIC));
        }
    };

    const getTimeAgo = (isoString) => {
        const seconds = Math.floor((new Date() - new Date(isoString)) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const isSpam = (text) => {
        if (!text) return false;
        const spamWords = ['buy now', 'discount', 'free trial', 'click here', 'subscribe', 'crypto', 'bitcoin'];
        const hasUrl = /(https?:\/\/[^\s]+)/g.test(text);
        return hasUrl || spamWords.some(word => text.toLowerCase().includes(word));
    };

    const handleSave = async () => {
        if (!newReflection.trim()) return;
        if (isSpam(newTitle) || isSpam(newReflection)) {
            alert('Your post was flagged as spam.');
            return;
        }
        setIsSaving(true);

        const newEntry = {
            id: Date.now().toString(),
            title: newTitle.trim() || null,
            content: newReflection,
            isPublic: true,
            date: new Date().toISOString(),
            user: JSON.parse(localStorage.getItem('aura_user') || '{"displayName": "Anonymous"}')
        };

        const localPub = JSON.parse(localStorage.getItem('aura_public') || '[]');
        localStorage.setItem('aura_public', JSON.stringify([newEntry, ...localPub]));

        setReflections([newEntry, ...reflections]);

        try {
            const token = localStorage.getItem('aura_token');
            if (token) {
                await fetch('/api/reflections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ title: newTitle.trim() || null, content: newReflection, isPublic: true })
                });
            }
        } catch (e) {
            console.log('Backend save bypassed for local prototype mode.');
        }

        setNewTitle('');
        setNewReflection('');
        setIsSaving(false);
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading universe...</div>;

    return (
        <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '3rem', textAlign: 'center', animation: 'fadeIn 0.6s ease-out' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Community Reflections</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Shared thoughts from a mindful collective.</p>
            </header>

            {beginnerMode && (
                <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.15)', maxWidth: '700px', margin: '0 auto 2rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        💬 <strong>Community Board:</strong> Share your thoughts with fellow practitioners. Click any post to expand and read the full reflection. Your meditation journal entries stay private — only posts you write here are shared publicly.
                    </p>
                </div>
            )}

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem', animation: 'fadeIn 0.6s ease-out' }}>
                <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Title (Optional)"
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--glass-border)',
                        padding: '0.8rem 0',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.2rem',
                        marginBottom: '1.5rem',
                        outline: 'none',
                        transition: 'var(--transition-fast)'
                    }}
                    onFocus={(e) => e.target.style.borderBottomColor = 'var(--accent-primary)'}
                    onBlur={(e) => e.target.style.borderBottomColor = 'var(--glass-border)'}
                />
                <textarea
                    value={newReflection}
                    onChange={(e) => setNewReflection(e.target.value)}
                    placeholder="Share a mindful thought or reflection with the community..."
                    style={{
                        width: '100%',
                        minHeight: '100px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        padding: '1.2rem',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '1rem',
                        resize: 'vertical',
                        marginBottom: '1rem',
                        transition: 'var(--transition-fast)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className="btn-glow"
                        onClick={handleSave}
                        disabled={!newReflection.trim() || isSaving}
                        style={{ opacity: (!newReflection.trim() || isSaving) ? 0.5 : 1, padding: '10px 24px' }}
                    >
                        {isSaving ? 'Posting...' : 'Post to Community'}
                    </button>
                </div>
            </div>

            {reflections.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '4rem' }}>
                    The board is quiet. Be the first to share a reflection.
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {reflections.map((entry, i) => {
                        const isExpanded = expandedId === (entry.id || i);
                        return (
                            <div
                                key={entry.id || i}
                                onClick={() => setExpandedId(isExpanded ? null : (entry.id || i))}
                                className="glass-panel"
                                style={{
                                    padding: '1rem 1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    background: isExpanded ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0,0,0,0.2)',
                                    border: isExpanded ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                                    animation: `fadeIn 0.5s ease-out ${(i % 6) * 0.1}s both`,
                                    cursor: 'pointer',
                                    transition: 'var(--transition-fast)'
                                }}
                            >
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(0, 1fr) 150px 100px',
                                    gap: '1rem',
                                    alignItems: 'center',
                                    width: '100%'
                                }}>
                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {entry.title || "Untitled Reflection"}
                                    </div>
                                    <div style={{ color: 'var(--accent-primary)', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {entry.user?.displayName || 'Anonymous'}
                                    </div>
                                    <div style={{ color: 'var(--text-tertiary)', textAlign: 'right', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                        {getTimeAgo(entry.date || entry.createdAt)}
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div style={{
                                        marginTop: '0.5rem',
                                        paddingTop: '1rem',
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        color: 'var(--text-secondary)',
                                        lineHeight: 1.6,
                                        fontSize: '1rem',
                                        animation: 'fadeIn 0.3s ease-out'
                                    }}>
                                        {entry.content}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
