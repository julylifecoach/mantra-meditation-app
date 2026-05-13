import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const QUIZZES = [
    { key: 'nlp_submodality', label: 'NLP Submodality' },
    { key: 'ego_check', label: 'Ego Check' },
    { key: 'resilience', label: 'Resilience' },
    { key: 'social_anxiety_pattern_v3', label: 'Social Anxiety' },
    { key: 'procrastination_type_v1', label: 'Procrastination' },
    { key: 'perception_map_v1', label: 'Perception Map' },
    { key: 'reaction_mirror', label: 'Reaction Mirror' },
];

export default function QuizAnalytics() {
    const navigate = useNavigate();
    const [currentQuiz, setCurrentQuiz] = useState(QUIZZES[0].key);
    const [stats, setStats] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedRow, setExpandedRow] = useState(null);

    const token = localStorage.getItem('aura_token');

    const fetchData = async (quizName) => {
        setLoading(true);
        setError(null);
        setExpandedRow(null);
        try {
            const [statsRes, exportRes] = await Promise.all([
                fetch(`/api/quiz-results/stats/${quizName}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/quiz-results/export/${quizName}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!statsRes.ok || !exportRes.ok) throw new Error('Access denied');

            const statsData = await statsRes.json();
            const exportData = await exportRes.json();
            setStats(statsData);
            setResults(exportData);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentQuiz);
    }, [currentQuiz]);

    const handleExportCSV = () => {
        if (!results.length) return;
        const headers = ['ID', 'Date', 'Verdict', 'Scores'];
        const rows = results.map(r => [
            r.id,
            new Date(r.createdAt).toLocaleString(),
            r.verdict || '—',
            JSON.stringify(r.scores?.totals || r.scores || {})
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `quiz-results-${currentQuiz}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    // Compute verdict distribution
    const verdictCounts = {};
    results.forEach(r => {
        const v = r.verdict || 'unknown';
        verdictCounts[v] = (verdictCounts[v] || 0) + 1;
    });

    const s = {
        panel: {
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: '12px', padding: '1.25rem',
        },
        statLabel: {
            fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--text-tertiary)', marginBottom: '0.5rem',
        },
        statValue: { fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' },
        tab: (active) => ({
            padding: '8px 18px', borderRadius: '100px',
            border: `1.5px solid ${active ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
            background: active ? 'rgba(194, 124, 90, 0.1)' : 'transparent',
            color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', fontWeight: 500,
        }),
        smallBtn: {
            padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '0.78rem', fontWeight: 500,
        },
    };

    if (error) return (
        <div style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--text-secondary)' }}>
            <h2>Access Denied</h2>
            <p>{error}</p>
        </div>
    );

    return (
        <div style={{ padding: '2rem', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem', animation: 'fadeIn 0.6s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h2 style={{ fontSize: '2rem' }}>Quiz Analytics</h2>
                    <button onClick={() => navigate('/admin')} style={{
                        ...s.smallBtn, color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)',
                    }}>← Admin Panel</button>
                </div>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                    View quiz completions across all July resources
                </p>
            </header>

            {/* Quiz Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                {QUIZZES.map(q => (
                    <button key={q.key} onClick={() => setCurrentQuiz(q.key)}
                        style={s.tab(currentQuiz === q.key)}>
                        {q.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>Loading...</div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={s.panel}>
                            <div style={s.statLabel}>Total Completions</div>
                            <div style={s.statValue}>{stats?.count || 0}</div>
                        </div>
                        <div style={s.panel}>
                            <div style={s.statLabel}>Avg Score</div>
                            <div style={s.statValue}>{stats?.averageScore || '—'}</div>
                            {stats?.maxPossible > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>/ {stats.maxPossible}</div>}
                        </div>
                        <div style={s.panel}>
                            <div style={s.statLabel}>First Result</div>
                            <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                                {stats?.oldest ? new Date(stats.oldest).toLocaleDateString() : '—'}
                            </div>
                        </div>
                        <div style={s.panel}>
                            <div style={s.statLabel}>Latest Result</div>
                            <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                                {stats?.newest ? new Date(stats.newest).toLocaleDateString() : '—'}
                            </div>
                        </div>
                    </div>

                    {/* Verdict Distribution */}
                    {Object.keys(verdictCounts).length > 0 && (
                        <div style={{ ...s.panel, marginBottom: '2rem' }}>
                            <div style={{ ...s.statLabel, marginBottom: '1rem' }}>Result Distribution</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {Object.entries(verdictCounts).sort((a, b) => b[1] - a[1]).map(([verdict, count]) => {
                                    const pct = Math.round(count / results.length * 100);
                                    return (
                                        <div key={verdict} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ minWidth: '80px', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{verdict}</span>
                                            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                                            </div>
                                            <span style={{ minWidth: '60px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{count} ({pct}%)</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Results Table */}
                    <div style={{ ...s.panel, padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--glass-border)' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Individual Results ({results.length})</h3>
                            <button onClick={handleExportCSV} style={s.smallBtn}>Export CSV</button>
                        </div>
                        {results.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No results yet for this quiz.</div>
                        ) : (
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            {['#', 'Date', 'Verdict', 'Details'].map(h => (
                                                <th key={h} style={{
                                                    textAlign: 'left', padding: '0.6rem 1rem',
                                                    color: 'var(--text-tertiary)', fontWeight: 500,
                                                    fontSize: '0.75rem', textTransform: 'uppercase',
                                                    letterSpacing: '1px', position: 'sticky', top: 0,
                                                    background: 'var(--glass-bg)',
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((r, i) => (
                                            <React.Fragment key={r.id}>
                                                <tr style={{
                                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                    cursor: 'pointer',
                                                    background: expandedRow === r.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                                                }} onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}>
                                                    <td style={{ padding: '0.6rem 1rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{i + 1}</td>
                                                    <td style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                        {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        <span style={{ marginLeft: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                                                            {new Date(r.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.6rem 1rem' }}>
                                                        <span style={{
                                                            background: 'rgba(194, 124, 90, 0.15)', color: 'var(--accent-primary)',
                                                            padding: '3px 10px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 500,
                                                        }}>{r.verdict || '—'}</span>
                                                    </td>
                                                    <td style={{ padding: '0.6rem 1rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                                                        {expandedRow === r.id ? '▾ collapse' : '▸ expand'}
                                                    </td>
                                                </tr>
                                                {expandedRow === r.id && (
                                                    <tr>
                                                        <td colSpan={4} style={{ padding: '0.75rem 1rem 1rem', background: 'rgba(0,0,0,0.15)' }}>
                                                            <pre style={{
                                                                fontSize: '0.8rem', color: 'var(--text-secondary)',
                                                                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                                                fontFamily: 'monospace', margin: 0,
                                                                maxHeight: '200px', overflow: 'auto',
                                                            }}>
                                                                {JSON.stringify(r.scores, null, 2)}
                                                            </pre>
                                                            {r.metadata && (
                                                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                                    Meta: {JSON.stringify(r.metadata)}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
