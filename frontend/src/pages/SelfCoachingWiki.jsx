import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, Menu, X, ExternalLink, Calendar, BookOpen } from 'lucide-react';
import wikiData from '../data/selfCoachingWiki.json';

export default function SelfCoachingWiki({ userProfile }) {
    const [activeCategory, setActiveCategory] = useState(wikiData.categories[0] || '');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

    const filteredArticles = wikiData.articles.filter(article => 
        article.categories.includes(activeCategory)
    );

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
                width: '300px',
                borderRight: '1px solid var(--glass-border)',
                background: 'rgba(0,0,0,0.2)',
                padding: '2rem 1rem',
                display: mobileMenuOpen ? 'block' : 'none',
            }} className="wiki-sidebar">
                <div style={{ marginBottom: '2rem', paddingLeft: '1rem' }}>
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Curriculum</h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {wikiData.categories.map(category => (
                        <button
                            key={category}
                            onClick={() => { setActiveCategory(category); setMobileMenuOpen(false); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '12px 1rem',
                                width: '100%',
                                textAlign: 'left',
                                border: 'none',
                                background: activeCategory === category ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: activeCategory === category ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '1.05rem',
                                transition: 'var(--transition-fast)'
                            }}
                        >
                            <BookOpen size={18} />
                            {category}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Content Area */}
            <main style={{ flex: 1, padding: '4rem 2rem', overflowY: 'auto' }} className="wiki-content">
                <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {activeCategory}
                    </h1>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {filteredArticles.map(article => (
                            <a 
                                key={article.id}
                                href={article.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="glass-panel"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '1.5rem',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    transition: 'transform 0.2s, background 0.2s',
                                    cursor: 'pointer'
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1.15rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                                        {article.title}
                                    </h3>
                                    <ExternalLink size={16} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: '4px' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                                    <Calendar size={14} />
                                    <span>{article.date || 'Unknown Date'}</span>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, flexGrow: 1 }}>
                                    {article.snippet}
                                </p>
                            </a>
                        ))}
                    </div>
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
            `}</style>
        </div>
    );
}
