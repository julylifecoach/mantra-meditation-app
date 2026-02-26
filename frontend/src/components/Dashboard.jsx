import React, { useState, useEffect } from 'react';

// Mock data fallback if backend is not connected
const MOCK_REFLECTIONS = [
    { id: 1, content: "I felt a lot of resistance at first, but settling into the breath brought a deep sense of calm by the end.", date: new Date(Date.now() - 86400000).toISOString() },
    { id: 2, content: "Today's mantra 'I choose peace over perfection' really resonated. The 15 minutes flew by.", date: new Date(Date.now() - 172800000).toISOString() },
];

export default function Dashboard() {
    const [reflection, setReflection] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [history, setHistory] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Attempt to load from localStorage first for hybrid prototype
        const local = localStorage.getItem('aura_reflections');
        if (local) {
            setHistory(JSON.parse(local));
        } else {
            setHistory(MOCK_REFLECTIONS);
        }

        // In a fully connected app, we would fetch from /api/reflections here
    }, []);

    const handleSave = async () => {
        if (!reflection.trim()) return;

        setIsSaving(true);

        const newEntry = {
            id: Date.now().toString(),
            content: reflection,
            isPublic,
            date: new Date().toISOString()
        };

        // 1. Save locally for the prototype
        const updatedHistory = [newEntry, ...history];
        setHistory(updatedHistory);
        localStorage.setItem('aura_reflections', JSON.stringify(updatedHistory));

        // 2. If it's public, add it to the mock public board storage
        if (isPublic) {
            const publicFeed = JSON.parse(localStorage.getItem('aura_public') || '[]');
            localStorage.setItem('aura_public', JSON.stringify([newEntry, ...publicFeed]));
        }

        // 3. Attempt backend save gracefully (Will fail silently if DB not connected yet)
        try {
            // Assuming a valid JWT token in localStorage if they signed in
            const token = localStorage.getItem('aura_token');
            if (token) {
                await fetch('/api/reflections', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ content: reflection, isPublic })
                });
            }
        } catch (e) {
            console.log('Backend save bypassed for local prototype mode.');
        }

        setReflection('');
        setIsPublic(false);
        setIsSaving(false);
    };

    const formatDate = (isoString) => {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Your Journal</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Reflect on your meditation and track your inner journey.</p>
            </header>

            {/* New Reflection Form */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem', animation: 'fadeIn 0.5s ease-out' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>New Entry</h3>

                <textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="How did your meditation feel today? What thoughts arose?"
                    style={{
                        width: '100%',
                        minHeight: '140px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        padding: '1.2rem',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '1rem',
                        resize: 'vertical',
                        marginBottom: '1.5rem',
                        transition: 'var(--transition-fast)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                        />
                        Share anonymously to Public Board
                    </label>

                    <button
                        className="btn-glow"
                        onClick={handleSave}
                        disabled={!reflection.trim() || isSaving}
                        style={{ opacity: (!reflection.trim() || isSaving) ? 0.5 : 1 }}
                    >
                        {isSaving ? 'Saving...' : 'Save Entry'}
                    </button>
                </div>
            </div>

            {/* History */}
            <div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Past Reflections</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {history.length === 0 ? (
                        <p style={{ color: 'var(--text-tertiary)' }}>No reflections yet. Complete a meditation to start writing.</p>
                    ) : (
                        history.map((entry) => (
                            <div key={entry.id} className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-primary)' }}>
                                <p style={{ fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1rem' }}>{entry.content}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                                    <span>{formatDate(entry.date)}</span>
                                    {entry.isPublic && <span style={{ color: 'var(--accent-secondary)' }}>Shared Publicly</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
