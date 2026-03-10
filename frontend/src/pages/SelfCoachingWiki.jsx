import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Lock, Menu, X, BookOpen, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const WIKI_TOPICS = ["Practice", "Convergence", "Procrastination", "Karma", "Happiness", "Suffering", "Shame"];

export default function SelfCoachingWiki({ userProfile }) {
    const [activeTopic, setActiveTopic] = useState(WIKI_TOPICS[0]);
    const [markdownContent, setMarkdownContent] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch markdown content when topic changes
    useEffect(() => {
        setLoading(true);
        fetch(`/wiki_drafts/${activeTopic}.md`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load wiki draft');
                return res.text();
            })
            .then(text => setMarkdownContent(text))
            .catch(err => {
                console.error(err);
                setMarkdownContent('Error loading content.');
            })
            .finally(() => setLoading(false));
    }, [activeTopic]);

    // Handle internal link clicks in the markdown
    const handleMarkdownClick = (e) => {
        const target = e.target.closest('a');
        if (!target) return;
        
        const href = target.getAttribute('href');
        if (href && href.endsWith('.md')) {
            e.preventDefault();
            const topic = href.replace('.md', '');
            if (WIKI_TOPICS.includes(topic)) {
                setActiveTopic(topic);
                // Also scroll top
                document.querySelector('.wiki-content')?.scrollTo(0, 0);
            }
        }
    };

    // Redirect if they don't have access
    if (!userProfile?.accessSelfCoaching && userProfile?.role !== 'admin') {
        return (
            <div style={{ textAlign: 'center', padding: '5rem 1rem', animation: 'fadeIn 0.5s ease-out' }}>
                <Lock size={48} color="#f87171" style={{ margin: '0 auto 1.5rem auto' }} />
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Restricted Access</h2>
                <p style={{ color: 'var(--text-secondary)' }}>You need to enroll in the Self-Coaching Education Program to view this Wiki.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 100px)', borderTop: '1px solid var(--glass-border)', position: 'relative' }}>
            
            {/* Mobile Menu Toggle */}
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 50 }} className="mobile-menu-toggle">
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar */}
            <aside style={{
                width: '280px',
                borderRight: '1px solid var(--glass-border)',
                background: 'rgba(0,0,0,0.2)',
                padding: '2rem 1rem',
                display: mobileMenuOpen ? 'block' : 'none',
            }} className="wiki-sidebar">
                <div style={{ marginBottom: '2rem', paddingLeft: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Core Concepts</h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {WIKI_TOPICS.map(topic => (
                        <button
                            key={topic}
                            onClick={() => { setActiveTopic(topic); setMobileMenuOpen(false); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                width: '100%',
                                textAlign: 'left',
                                border: 'none',
                                background: activeTopic === topic ? 'var(--accent-primary)' : 'transparent',
                                color: activeTopic === topic ? 'white' : 'var(--text-secondary)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '1.05rem',
                                transition: 'var(--transition-fast)'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <BookOpen size={18} opacity={activeTopic === topic ? 1 : 0.6} />
                                {topic}
                            </span>
                            {activeTopic === topic && <ChevronRight size={16} />}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Content Area */}
            <main style={{ flex: 1, padding: '4rem 2rem', overflowY: 'auto' }} className="wiki-content">
                <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }} onClick={handleMarkdownClick}>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div className="loading-spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                            <p>Loading writings...</p>
                        </div>
                    ) : (
                        <div className="markdown-body">
                            <ReactMarkdown>{markdownContent}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </main>

            <style>{`
                @media (min-width: 768px) {
                    .wiki-sidebar {
                        display: block !important;
                    }
                    .mobile-menu-toggle {
                        display: none !important;
                    }
                }
                .wiki-content {
                    padding-top: 2rem !important;
                }
                @media (max-width: 767px) {
                    .wiki-content {
                        padding-top: 4rem !important;
                    }
                    .wiki-sidebar {
                        position: absolute;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        z-index: 40;
                        backdrop-filter: blur(10px);
                    }
                }
                
                /* Markdown Styling overrides */
                .markdown-body {
                    color: var(--text-primary);
                    font-size: 1.1rem;
                    line-height: 1.7;
                }
                .markdown-body h1 {
                    font-family: var(--font-serif);
                    font-size: 3rem;
                    color: var(--accent-primary);
                    margin-bottom: 0.5rem;
                }
                .markdown-body h1 + p {
                    color: var(--text-tertiary);
                    font-style: italic;
                    margin-bottom: 3rem;
                    border-bottom: 1px solid var(--glass-border);
                    padding-bottom: 1rem;
                }
                .markdown-body p {
                    margin-bottom: 2rem;
                    color: rgba(255,255,255,0.85);
                }
                .markdown-body p:has(a) {
                    margin-bottom: 1rem;
                }
                .markdown-body p:has(a):nth-of-type(even) {
                    margin-bottom: 2.5rem;
                }
                .markdown-body blockquote, .markdown-body p:has(strong) {
                    font-size: 1.15rem;
                    border-left: 3px solid var(--accent-primary);
                    padding-left: 1.5rem;
                    margin-left: -1.65rem;
                    color: var(--text-primary);
                }
                .markdown-body hr {
                    border: 0;
                    height: 1px;
                    background: var(--glass-border);
                    margin: 3rem 0;
                }
                .markdown-body a {
                    color: var(--accent-primary);
                    text-decoration: none;
                }
                .markdown-body a:hover {
                    text-decoration: underline;
                }
                .markdown-body p > em {
                    font-size: 0.9rem;
                    color: var(--text-tertiary);
                    display: block;
                    margin-top: 0.5rem;
                }
            `}</style>
        </div>
    );
}
