import React, { useState } from 'react';
import { PenTool, Video, Mic, Smartphone, ChevronRight, CheckCircle2, PlayCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContentCreatorSales() {
    const navigate = useNavigate();
    const [hoveredSkill, setHoveredSkill] = useState(null);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', paddingBottom: '4rem' }}>
            <div style={{
                maxWidth: '900px',
                margin: '0 auto',
                padding: '4rem 1.5rem',
                textAlign: 'center'
            }}>
                <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px', marginBottom: '2rem' }}>
                    A JULY LIFE COACH GUIDEBOOK
                </div>

                <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', background: 'linear-gradient(to right, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    The Content Creator Companion
                </h1>

                <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto 3rem auto', lineHeight: 1.6 }}>
                    Join the 1% of true creators. A mindful, burnout-free system to transform your inspiration into conscious creations.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        style={{ background: 'var(--accent-primary)', color: 'white', padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)', transition: 'transform 0.2s ease' }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Get Access Now <ChevronRight size={20} />
                    </button>
                    <button
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'background 0.2s ease' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        Watch Trailer <PlayCircle size={20} style={{ display: 'inline', marginLeft: '8px' }} />
                    </button>
                </div>
            </div>

            {/* Why Create Section */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '5rem 1.5rem', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '3rem', textAlign: 'center' }}>Why Be a <span style={{ color: 'var(--accent-secondary)' }}>Content Creator?</span></h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
                        {[
                            { title: 'Income Generation', desc: 'Escape the 9-5 grind. Build a sustainable pipeline of income doing what you love.' },
                            { title: 'Conscious Creation', desc: 'The world needs more than bots and pranks. Provide a net positive for humanity.' },
                            { title: 'Personal Expression', desc: 'Flex your creativity muscle. Reclaim the humanity that corporate life suppresses.' },
                            { title: 'Overcoming Self', desc: 'Treat creation as a meditative practice. Answer the big life questions through art.' }
                        ].map((item, i) => (
                            <div key={i} className="glass-panel" style={{ padding: '2rem' }}>
                                <CheckCircle2 size={28} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>{item.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* The 3 Skill System Section */}
            <div style={{ maxWidth: '1000px', margin: '5rem auto', padding: '0 1.5rem' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>The <span style={{ color: 'var(--accent-primary)' }}>3 Skill System</span></h2>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 4rem auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
                    Avoid the inevitable burnout. This system is a diet plan keeping in mind the human tendency to desire delicious creative treats.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {[
                        {
                            num: '1',
                            title: 'Microposting',
                            desc: 'Catch a moment of inspiration and convert it into output as soon as possible. Develop the meta-skill of hitting publish without hesitation, shedding the poison of perfectionism.'
                        },
                        {
                            num: '2',
                            title: 'Skill Microdosing',
                            desc: 'Capture inspiration and maintain it. Layer specific skills over your microposts to experiment freely, holding onto the spark until it fades, then immediate release.'
                        },
                        {
                            num: '3',
                            title: 'Locking In',
                            desc: 'Become independent of inspiration. Using focus and stamina rooted in meditative practices, sit down and complete complex works by relying on what you have built.'
                        }
                    ].map((skill, index) => (
                        <div
                            key={index}
                            className="glass-panel"
                            style={{
                                display: 'flex',
                                gap: '2rem',
                                padding: '2rem',
                                alignItems: 'center',
                                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                transform: hoveredSkill === index ? 'translateY(-5px)' : 'none',
                                boxShadow: hoveredSkill === index ? '0 10px 30px rgba(0,0,0,0.5)' : 'none',
                                borderLeft: hoveredSkill === index ? '4px solid var(--accent-secondary)' : '1px solid var(--glass-border)'
                            }}
                            onMouseEnter={() => setHoveredSkill(index)}
                            onMouseLeave={() => setHoveredSkill(null)}
                        >
                            <div style={{
                                fontSize: '4rem',
                                fontWeight: 900,
                                color: hoveredSkill === index ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.1)',
                                transition: 'color 0.3s ease'
                            }}>
                                0{skill.num}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{skill.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{skill.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Format Guides */}
            <div style={{ background: 'linear-gradient(to bottom, rgba(139, 92, 246, 0.05), transparent)', padding: '5rem 1.5rem' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '3rem', textAlign: 'center' }}>Master Every Format</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <Smartphone size={40} color="var(--accent-secondary)" style={{ margin: '0 auto 1rem auto' }} />
                            <h3 style={{ marginBottom: '1rem' }}>Shortform</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Command the 15-second span. Leverage captions, descriptions, and comments.</p>
                        </div>
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <Video size={40} color="var(--accent-secondary)" style={{ margin: '0 auto 1rem auto' }} />
                            <h3 style={{ marginBottom: '1rem' }}>Longform</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Navigate YouTube strategy with secondary channels for fearless experimentation.</p>
                        </div>
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <Zap size={40} color="var(--accent-secondary)" style={{ margin: '0 auto 1rem auto' }} />
                            <h3 style={{ marginBottom: '1rem' }}>Live Streaming</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Build impenetrable nerves. Learn to spontaneously create without prepared material.</p>
                        </div>
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <PenTool size={40} color="var(--accent-secondary)" style={{ margin: '0 auto 1rem auto' }} />
                            <h3 style={{ marginBottom: '1rem' }}>Writing</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Master microblogs to uncover your hidden narratives. Learn to love yourself creating.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Stop Hiding Your Work</h2>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '3rem', lineHeight: 1.6 }}>
                    Break out of the "Is this good?" binary. Whether you get 10 views or 10,000, your creation matters. Start cultivating your skills today.
                </p>
                <div className="glass-panel" style={{ padding: '3rem', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <h3 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Lifetime Access: $99</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 auto 2rem auto', maxWidth: '300px', textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-primary)" /> Full Guidebook Vault</li>
                        <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-primary)" /> Exclusive Practice Wiki</li>
                        <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} color="var(--accent-primary)" /> Regular Updates</li>
                    </ul>
                    <button style={{ background: 'var(--accent-primary)', color: 'white', padding: '16px 48px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600, border: 'none', cursor: 'pointer', width: '100%', maxWidth: '300px' }}>
                        Enroll Now
                    </button>
                    <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Secure payment powered by Stripe.</p>
                </div>
            </div>
        </div>
    );
}
