import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Flame, CheckCircle, Lock, Calendar, Target, Award } from 'lucide-react';

export default function AdvancedPractice108({ userProfile }) {
    const [progress, setProgress] = useState(0);
    const [streak, setStreak] = useState(0);
    const [assignedMantra, setAssignedMantra] = useState("Om Mani Padme Hum"); // Default, would be fetched from backend
    const [sessionCompletedToday, setSessionCompletedToday] = useState(false);
    const [isPracticing, setIsPracticing] = useState(false);

    useEffect(() => {
        // Load data from localStorage as a placeholder for backend fetch
        const storedProgress = localStorage.getItem('aura_108_progress');
        if (storedProgress) {
            const parsed = JSON.parse(storedProgress);
            setProgress(parsed.daysCompleted || 0);
            setStreak(parsed.streak || 0);
            setSessionCompletedToday(parsed.lastCompleted === new Date().toDateString());
        }
    }, []);

    const completeDailyPractice = () => {
        setIsPracticing(true);
        // Simulate a practice session duration
        setTimeout(() => {
            const newProgress = Math.min(progress + 1, 108);
            const newStreak = sessionCompletedToday ? streak : streak + 1;

            setProgress(newProgress);
            setStreak(newStreak);
            setSessionCompletedToday(true);
            setIsPracticing(false);

            const saveObj = {
                daysCompleted: newProgress,
                streak: newStreak,
                lastCompleted: new Date().toDateString()
            };
            localStorage.setItem('aura_108_progress', JSON.stringify(saveObj));

            // In a real app, this would also POST to the backend
        }, 2000);
    };

    // If no access (advanced logic can be implemented, checking boolean access level)
    const hasAccess = userProfile?.accessSelfCoaching || userProfile?.role === 'admin';
    if (!hasAccess && userProfile !== null) {
        return (
            <div style={{ textAlign: 'center', padding: '5rem 1rem', animation: 'fadeIn 0.5s ease-out' }}>
                <Lock size={48} color="#f87171" style={{ margin: '0 auto 1.5rem auto' }} />
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Advanced Portal Locked</h2>
                <p style={{ color: 'var(--text-secondary)' }}>You must pass the Buddhist Happiness Examination to unlock the 108-Day Challenge.</p>
            </div>
        );
    }

    const progressPercentage = (progress / 108) * 100;

    return (
        <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1.5rem', paddingBottom: '4rem' }}>
            <header style={{ textAlign: 'center', marginBottom: '4rem', animation: 'fadeIn 0.6s ease-out' }}>
                <div style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px', marginBottom: '1.5rem' }}>
                    THE 108-DAY CHALLENGE
                </div>
                <h2 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Your Devoted Practice</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                    Sustain your assigned mantra for 108 consecutive days to rewire your neural pathways and complete the self-coaching program.
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
                {/* Status Column */}
                <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center' }}>
                    <div>
                        <Target size={40} color="var(--accent-secondary)" style={{ margin: '0 auto 1rem auto' }} />
                        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Assigned Mantra</h3>
                        <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{assignedMantra}</p>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Challenge Progress</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{progress} / 108</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressPercentage}%`, height: '100%', background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))', transition: 'width 1s ease-out' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#f59e0b', marginBottom: '0.25rem' }}>
                                <Flame size={20} />
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{streak}</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Streak</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#10b981', marginBottom: '0.25rem' }}>
                                <Award size={20} />
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Milestone</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {progress >= 108 ? 'Completed' : progress >= 54 ? 'Halfway' : progress >= 21 ? 'Habit Formed' : 'Initiate'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Practice Action Column */}
                <div className="glass-panel" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    {sessionCompletedToday ? (
                        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                            <CheckCircle size={80} color="#10b981" style={{ margin: '0 auto 1.5rem auto' }} />
                            <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#10b981' }}>Practice Complete</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                You have honored your commitment today. Return tomorrow to maintain your streak and continue the 108-day journey.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <div style={{ width: '100px', height: '100px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', border: '1px solid var(--accent-primary)' }}>
                                <Calendar size={40} color="var(--accent-primary)" />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Today's Commitment</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
                                Complete 108 repetitions of your assigned mantra. This requires uninterrupted focus and intention.
                            </p>

                            <button
                                onClick={completeDailyPractice}
                                disabled={isPracticing}
                                style={{
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    padding: '16px 32px',
                                    borderRadius: '12px',
                                    fontSize: '1.2rem',
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: isPracticing ? 'default' : 'pointer',
                                    width: '100%',
                                    transition: 'all 0.2s',
                                    opacity: isPracticing ? 0.7 : 1,
                                    boxShadow: isPracticing ? 'none' : '0 4px 14px rgba(139, 92, 246, 0.4)'
                                }}
                            >
                                {isPracticing ? 'Meditating...' : 'Log Practice'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {progress >= 108 && (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', background: 'linear-gradient(to bottom right, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))', border: '1px solid rgba(16, 185, 129, 0.3)', animation: 'fadeIn 1s ease-out' }}>
                    <Award size={64} color="#10b981" style={{ margin: '0 auto 1.5rem auto' }} />
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#10b981' }}>Program Completed</h2>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        You have successfully completed the 108-Day Challenge. Your neural pathways have formed a new foundation. You embody the principles of Buddhist happiness.
                    </p>
                </div>
            )}
        </div>
    );
}
