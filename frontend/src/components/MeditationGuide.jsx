import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MeditationGuide({ beginnerMode }) {
    // Practice mode: 'meditation' or 'prostration'
    const [practiceMode, setPracticeMode] = useState('meditation');

    // --- Meditation State ---
    const [selectedDuration, setSelectedDuration] = useState(15);
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [isActive, setIsActive] = useState(false);
    const [breathingPhase, setBreathingPhase] = useState('Ready');

    // Timestamp-based timer refs (survives mobile screen-off)
    const startTimestampRef = useRef(null);
    const elapsedBeforePauseRef = useRef(0);

    const audioRef = useRef(new Audio('/sound_bowl.m4a'));

    // --- Prostration State ---
    const [prostrationCount, setProstrationCount] = useState(0);
    const PROSTRATION_TARGET = 108;

    // --- Shared State ---
    const [showJournal, setShowJournal] = useState(false);
    const [reflection, setReflection] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();

    const savedMantra = localStorage.getItem('aura_daily_mantra') || '';

    // Handle duration changes (only when not active)
    useEffect(() => {
        if (!isActive && !showJournal) {
            setTimeLeft(selectedDuration * 60);
            elapsedBeforePauseRef.current = 0;
            startTimestampRef.current = null;
        }
    }, [selectedDuration]);

    // Timestamp-based Timer Effect (survives screen-off on mobile)
    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                const now = Date.now();
                const totalElapsed = elapsedBeforePauseRef.current + Math.floor((now - startTimestampRef.current) / 1000);
                const remaining = Math.max(0, selectedDuration * 60 - totalElapsed);
                setTimeLeft(remaining);

                if (remaining === 0) {
                    clearInterval(interval);
                    setIsActive(false);

                    // Play end sound
                    audioRef.current.currentTime = 0;
                    audioRef.current.play().catch(e => console.log('Audio error:', e));

                    setShowJournal(true);
                }
            }, 500); // Check every 500ms for better accuracy on wake
        }
        return () => clearInterval(interval);
    }, [isActive, selectedDuration]);

    // Breathing Animation Effect (4s Inhale, 2s Hold, 4s Exhale)
    useEffect(() => {
        let breathInterval = null;
        if (isActive) {
            let phaseTime = 0;
            breathInterval = setInterval(() => {
                phaseTime += 1;
                if (phaseTime <= 4) setBreathingPhase('Inhale');
                else if (phaseTime <= 6) setBreathingPhase('Hold');
                else if (phaseTime <= 10) setBreathingPhase('Exhale');
                else phaseTime = 0;
            }, 1000);
        } else {
            setBreathingPhase('Ready');
        }
        return () => clearInterval(breathInterval);
    }, [isActive]);

    const toggleTimer = () => {
        if (!isActive) {
            // Starting or resuming
            startTimestampRef.current = Date.now();
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Audio error:', e));
        } else {
            // Pausing — save elapsed time
            const now = Date.now();
            elapsedBeforePauseRef.current += Math.floor((now - startTimestampRef.current) / 1000);
        }
        setIsActive(!isActive);
    };

    const skipTimer = () => {
        setIsActive(false);
        elapsedBeforePauseRef.current = 0;
        startTimestampRef.current = null;
        setTimeLeft(0);

        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log('Audio error:', e));

        setShowJournal(true);
    };

    // --- Prostration handlers ---
    const handleProstrationTap = () => {
        if (prostrationCount < PROSTRATION_TARGET) {
            const newCount = prostrationCount + 1;
            setProstrationCount(newCount);

            if (newCount === PROSTRATION_TARGET) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.log('Audio error:', e));
                setTimeout(() => setShowJournal(true), 800);
            }
        }
    };

    const resetProstrations = () => {
        setProstrationCount(0);
    };

    const message = () => {
        if (breathingPhase !== 'Ready') return 'The timer is working. Rest assured and focus on the sensation of your breath on the tip of your nose as it enters and leaves your nostril.';
        else return 'Ready';
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getCircleTransform = () => {
        if (!isActive) return 'scale(1)';
        if (breathingPhase === 'Inhale') return 'scale(1.4)';
        if (breathingPhase === 'Hold') return 'scale(1.4)';
        if (breathingPhase === 'Exhale') return 'scale(1)';
        return 'scale(1)';
    };

    const isSpam = (text) => {
        const spamWords = ['buy now', 'discount', 'free trial', 'click here', 'subscribe', 'crypto', 'bitcoin'];
        const hasUrl = /(https?:\/\/[^\s]+)/g.test(text);
        return hasUrl || spamWords.some(word => text.toLowerCase().includes(word));
    };

    const handleSave = async () => {
        if (!reflection.trim()) return;
        if (isSpam(reflection)) {
            alert('Your reflection was flagged as spam.');
            return;
        }
        setIsSaving(true);
        const mantra = localStorage.getItem('aura_daily_mantra') || '';

        const newEntry = {
            id: Date.now().toString(),
            content: reflection,
            isPublic: false,
            mantra: mantra,
            practiceType: practiceMode,
            prostrationCount: practiceMode === 'prostration' ? PROSTRATION_TARGET : undefined,
            date: new Date().toISOString()
        };

        const local = localStorage.getItem('aura_reflections');
        const history = local ? JSON.parse(local) : [];
        const updatedHistory = [newEntry, ...history];
        localStorage.setItem('aura_reflections', JSON.stringify(updatedHistory));

        try {
            const token = localStorage.getItem('aura_token');
            if (token) {
                await fetch('/api/reflections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ content: reflection, isPublic: false, mantra: mantra })
                });
            }
        } catch (e) {
            console.log('Backend save bypassed for local prototype mode.');
        }

        setIsSaving(false);
        navigate('/track');
    };

    // ========================
    // JOURNAL VIEW (shared by both modes)
    // ========================
    if (showJournal) {
        return (
            <div style={{ padding: '2rem', width: '100%', maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.6s ease-out' }}>
                <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Your Journey Completes</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {practiceMode === 'prostration'
                            ? `You completed ${PROSTRATION_TARGET} prostrations. Capture your thoughts.`
                            : 'Take a moment to capture your thoughts after meditating.'}
                    </p>
                </header>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                    {savedMantra && (
                        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Your intention</p>
                            <p style={{ color: 'var(--accent-primary)', fontStyle: 'italic', fontSize: '1.2rem' }}>"{savedMantra}"</p>
                        </div>
                    )}

                    <textarea
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        placeholder="How did your practice feel today? What thoughts arose?"
                        style={{
                            width: '100%', minHeight: '140px',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px', padding: '1.2rem',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-sans)', fontSize: '1rem',
                            resize: 'vertical', marginBottom: '1.5rem',
                            transition: 'var(--transition-fast)'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button className="btn-glow" onClick={handleSave} disabled={!reflection.trim() || isSaving} style={{ opacity: (!reflection.trim() || isSaving) ? 0.5 : 1 }}>
                            {isSaving ? 'Saving...' : 'Save & Track'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========================
    // MODE SELECTOR
    // ========================
    const modeSelector = (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
            {['meditation', 'prostration'].map(mode => (
                <button
                    key={mode}
                    onClick={() => {
                        setPracticeMode(mode);
                        // Reset states when switching
                        setIsActive(false);
                        setProstrationCount(0);
                        elapsedBeforePauseRef.current = 0;
                        startTimestampRef.current = null;
                    }}
                    style={{
                        background: practiceMode === mode ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
                        border: practiceMode === mode ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                        color: practiceMode === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
                        padding: '10px 24px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '1rem',
                        textTransform: 'capitalize'
                    }}
                >
                    {mode}
                </button>
            ))}
        </div>
    );

    // ========================
    // PROSTRATION VIEW
    // ========================
    if (practiceMode === 'prostration') {
        const progress = (prostrationCount / PROSTRATION_TARGET) * 100;
        return (
            <div style={{ padding: '2rem', width: '100%', maxWidth: '600px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>

                {savedMantra && (
                    <div style={{ marginBottom: '2rem', animation: 'fadeIn 1s ease-out' }}>
                        <p style={{ color: '#E0E7FF', textShadow: '0 0 10px rgba(139, 92, 246, 0.6)', fontStyle: 'italic', fontSize: '1.25rem', letterSpacing: '1px' }}>
                            "{savedMantra}"
                        </p>
                    </div>
                )}

                {modeSelector}

                {beginnerMode && (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.15)', maxWidth: '500px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                            🙏 <strong>Prostration Practice:</strong> Tap the circle below with each bow. The goal is 108 prostrations — a sacred number representing wholeness. Take your time and move mindfully.
                        </p>
                    </div>
                )}

                {/* Tappable Counter Circle */}
                <div
                    onClick={handleProstrationTap}
                    style={{
                        position: 'relative',
                        width: '250px',
                        height: '250px',
                        margin: '0 auto 2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                >
                    {/* Progress ring background */}
                    <svg style={{ position: 'absolute', width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(139, 92, 246, 0.15)" strokeWidth="3" />
                        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-primary)" strokeWidth="3"
                            strokeDasharray={`${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                        />
                    </svg>
                    <div style={{ zIndex: 2, textAlign: 'center' }}>
                        <h2 style={{ fontSize: '3.5rem', fontWeight: 300, letterSpacing: '2px', color: 'var(--text-primary)' }}>
                            {prostrationCount}
                        </h2>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>of {PROSTRATION_TARGET}</p>
                    </div>
                </div>

                <p style={{ color: 'var(--accent-primary)', fontSize: '1.2rem', marginBottom: '2rem', fontWeight: 400 }}>
                    {prostrationCount === 0 ? 'Tap to begin' : prostrationCount >= PROSTRATION_TARGET ? 'Complete! 🙏' : 'Tap with each bow'}
                </p>

                {prostrationCount > 0 && prostrationCount < PROSTRATION_TARGET && (
                    <button
                        onClick={resetProstrations}
                        style={{ color: 'var(--text-tertiary)', padding: '8px 20px', transition: '0.2s', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}
                        onMouseOver={(e) => e.target.style.color = 'white'}
                        onMouseOut={(e) => e.target.style.color = 'var(--text-tertiary)'}
                    >
                        Reset Count
                    </button>
                )}
            </div>
        );
    }

    // ========================
    // MEDITATION VIEW (existing)
    // ========================
    return (
        <div style={{ padding: '2rem', width: '100%', maxWidth: '600px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>

            {savedMantra && (
                <div style={{ marginBottom: '2rem', animation: 'fadeIn 1s ease-out' }}>
                    <p style={{ color: '#E0E7FF', textShadow: '0 0 10px rgba(139, 92, 246, 0.6)', fontStyle: 'italic', fontSize: '1.25rem', letterSpacing: '1px' }}>
                        "{savedMantra}"
                    </p>
                </div>
            )}

            {!isActive && modeSelector}

            {beginnerMode && !isActive && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.15)', maxWidth: '500px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        🧘 <strong>Meditation:</strong> Select your duration, then press "Begin Journey." Focus on your breath — feel it at the tip of your nose as it enters and exits. When thoughts arise, gently return to the breath.
                    </p>
                </div>
            )}

            <div style={{
                position: 'relative', width: '250px', height: '250px',
                margin: '0 auto 4rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{
                    position: 'absolute', width: '100%', height: '100%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    transition: 'transform 4s ease-in-out',
                    transform: getCircleTransform(), zIndex: 1
                }} />
                <h2 style={{ fontSize: '3.5rem', fontWeight: 300, zIndex: 2, letterSpacing: '2px', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {formatTime(timeLeft)}
                </h2>
            </div>

            <h3 style={{ fontSize: breathingPhase !== 'Ready' ? '1.1rem' : '2.2rem', maxWidth: '80%', height: '40px', color: 'var(--accent-primary)', marginBottom: '3rem', fontWeight: 400, opacity: isActive ? 1 : 0.8, transition: 'var(--transition-normal)', lineHeight: 1.4 }}>
                {message()}
            </h3>

            {(!isActive && !showJournal && timeLeft === selectedDuration * 60) && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
                    {[5, 10, 15, 40].map(duration => (
                        <button
                            key={duration}
                            onClick={() => setSelectedDuration(duration)}
                            style={{
                                background: selectedDuration === duration ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
                                border: selectedDuration === duration ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                                color: selectedDuration === duration ? 'var(--text-primary)' : 'var(--text-secondary)',
                                padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                                transition: 'var(--transition-fast)', fontFamily: 'var(--font-sans)',
                            }}
                        >
                            {duration}m
                        </button>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-glow" onClick={toggleTimer} style={{ padding: '16px 40px', fontSize: '1.2rem' }}>
                    {isActive ? 'Pause' : (timeLeft < selectedDuration * 60 ? 'Resume' : 'Begin Journey')}
                </button>

                {(timeLeft < selectedDuration * 60) && (
                    <button
                        onClick={skipTimer}
                        style={{ color: 'var(--text-tertiary)', padding: '12px 24px', transition: '0.2s', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}
                        onMouseOver={(e) => e.target.style.color = 'white'}
                        onMouseOut={(e) => e.target.style.color = 'var(--text-tertiary)'}
                    >
                        Skip Timer
                    </button>
                )}
            </div>
        </div>
    );
}
