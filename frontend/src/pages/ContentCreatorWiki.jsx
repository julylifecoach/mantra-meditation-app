import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BookOpen, Video, PenTool, Smartphone, Target, LayoutTemplate, Lock, Menu, X } from 'lucide-react';

export default function ContentCreatorWiki({ userProfile }) {
    const [activeSection, setActiveSection] = useState('intro');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Redirect if they don't have access
    if (!userProfile?.accessContentCreator && userProfile?.role !== 'admin') {
        return (
            <div style={{ textAlign: 'center', padding: '5rem 1rem', animation: 'fadeIn 0.5s ease-out' }}>
                <Lock size={48} color="#f87171" style={{ margin: '0 auto 1.5rem auto' }} />
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Restricted Access</h2>
                <p style={{ color: 'var(--text-secondary)' }}>You need to enroll in the Content Creator Coaching program to view the Wiki.</p>
            </div>
        );
    }

    const sections = {
        'intro': {
            title: 'Why Content Creation?',
            icon: <Target size={20} />,
            content: (
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--accent-secondary)' }}>Why Content Creation?</h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem' }}>
                        In 2025 we have the greatest number of jobs and career possibilities. With the advancement of civilization there always comes new careers and professions, and among them our focus for this guide is: content creation.
                    </p>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Income Generation</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                        More and more people are getting burned out from the corporate 9-5 life. Although content creation is far from a reliable income source for the majority of people, the important thing is that it is possible to generate income from content creation.
                    </p>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>The Need for Conscious Creators</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                        Part of why I'm interested in cultivating content creators is because we have a need for a bigger community of conscious content creators. People who create content for a net positive for humanity.
                    </p>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Personal Expression & Overcoming Self</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                        Content creation will not only allow you to flex that creativity muscle, but encourage you to flex it hard. Creativity has an inspirational quality to it. The more creativity you foster with your content, the more you will be inspired by yourself.
                    </p>
                </div>
            )
        },
        'skills': {
            title: 'The 3 Skill System',
            icon: <LayoutTemplate size={20} />,
            content: (
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>The 3 Skill System</h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem' }}>
                        The 3 Skill System is a system I created in response to the common patterns of content creation. It avoids burnout and the inevitable writer's block that comes from perfectionism.
                    </p>

                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid var(--accent-primary)', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Skill #1: Microposting</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            The first skill to build over any other skill is the skill of capturing inspiration and converting it into output as soon as possible. I call this "microposting" because posts made in this way are likely going to be small ideas or small parts of big ideas.
                        </p>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: '1rem' }}>
                            At that moment, you get your phone out and create that piece of content in its most basic form. No editing, no re-recording, just a simple expression and press submit.
                        </p>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid var(--accent-secondary)', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Skill #2: Skill Microdosing</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            Only after you are confident and easy-flowing with the first skill can you contemplate the second skill: the ability to capture inspiration and maintain it. Explore with options UNTIL THE MOMENT YOU FEEL THE INSPIRATION SLIPPING AWAY. Then press submit.
                        </p>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid #f59e0b', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Skill #3: Locking In</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            The third skill to build is the ability to be independent of inspiration. Buddhist practices are meant to foster focus and stamina. What would have taken old you three months would be done in two days, because you’re that focused and not drained.
                        </p>
                    </div>
                </div>
            )
        },
        'doubt': {
            title: 'Navigating Doubt',
            icon: <BookOpen size={20} />,
            content: (
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: '#10b981' }}>Navigating Doubt</h1>

                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', marginTop: '2rem' }}>To Share or Not To Share</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                        Sharing is an act that makes an inner operation cascade into the outer world. I need you to be deeply interested in your own growth, and intentionally do actions that foster your growth. Being responsible for your creations is a very certain way to foster your growth.
                    </p>

                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', marginTop: '2rem' }}>Followers Don't Matter</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                        Whether they subscribed or not has no impact on whether my video gets shown to them. What IS a useful sink of energy is to align with your intentions around WHY you want to create and WHY it's important that others see your work.
                    </p>

                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', marginTop: '2rem' }}>Is This Good?</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                        As long as you subscribe to the good/bad binary, there is no way you will escape the suffering that accompanies the binary. Creating must be your first and foremost intention, and the more you focus on creation itself the more the "good/bad" worry will naturally subside.
                    </p>
                </div>
            )
        },
        'formats': {
            title: 'Format Specific Guides',
            icon: <Video size={20} />,
            content: (
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: '#3b82f6' }}>Format Specific Guides</h1>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
                        <Smartphone size={32} color="#3b82f6" style={{ flexShrink: 0, marginTop: '4px' }} />
                        <div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Vertical Shortform Videos</h3>
                            <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: '1.5rem' }}>
                                <li>Take advantage of all the resources you have (captions, descriptions, comments).</li>
                                <li>Start with the point. Don't waste time on long intros.</li>
                                <li>15s by default. Form a personal guideline.</li>
                            </ul>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
                        <Video size={32} color="#3b82f6" style={{ flexShrink: 0, marginTop: '4px' }} />
                        <div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Longform Videos</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                Think about YouTube strategy. Use secondary channels where you're free to do whatever you want without impacting main channel health. Talk about topics with intentional brevity.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
                        <BookOpen size={32} color="#3b82f6" style={{ flexShrink: 0, marginTop: '4px' }} />
                        <div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Live Streaming</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                Prioritize developing the ability to spontaneously come up with things to say. When you are comfortable live, nothing will phase you.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
                        <PenTool size={32} color="#3b82f6" style={{ flexShrink: 0, marginTop: '4px' }} />
                        <div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Writing</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                Take advantage of microblogs. The best way to keep writing is to love your writing. Let out personal stories and illuminate the shadows of your heart. Let yourself fall in love with yourself creating.
                            </p>
                        </div>
                    </div>
                </div>
            )
        }
    };

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
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Companion Wiki</h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.keys(sections).map(key => (
                        <button
                            key={key}
                            onClick={() => { setActiveSection(key); setMobileMenuOpen(false); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '12px 1rem',
                                width: '100%',
                                textAlign: 'left',
                                border: 'none',
                                background: activeSection === key ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: activeSection === key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '1.05rem',
                                transition: 'var(--transition-fast)'
                            }}
                        >
                            {sections[key].icon}
                            {sections[key].title}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Content Area */}
            <main style={{ flex: 1, padding: '4rem 2rem', overflowY: 'auto' }} className="wiki-content">
                <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
                    {sections[activeSection].content}
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
