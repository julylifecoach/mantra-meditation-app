import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MeditationGuide() {
    const [selectedDuration, setSelectedDuration] = useState(15);
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [isActive, setIsActive] = useState(false);
    const audioRef = React.useRef(new Audio('/sound_bowl.m4a'));
    const [breathingPhase, setBreathingPhase] = useState('Inhale'); // Inhale, Hold, Exhale
    const [showJournal, setShowJournal] = useState(false);
    const [reflection, setReflection] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();

    // Retrieve the user's daily mantra
    const savedMantra = localStorage.getItem('aura_daily_mantra') || '';

    // Handle duration changes
    useEffect(() => {
        if (!isActive) {
            setTimeLeft(selectedDuration * 60);
        }
    }, [selectedDuration, isActive]);

    // Timer Effect
    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(timeLeft => timeLeft - 1);
            }, 1000);
        } else if (timeLeft === 0 && !showJournal) {
            clearInterval(interval);
            setIsActive(false);

            // Play end sound
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Audio error:', e));

            // Show the journal form right here
            setShowJournal(true);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, showJournal]);

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
                else phaseTime = 0; // Reset cycle
            }, 1000);
        } else {
            setBreathingPhase('Ready');
        }
        return () => clearInterval(breathInterval);
    }, [isActive]);

    const toggleTimer = () => {
        if (!isActive) {
            // Starting the timer, play sound
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Audio error:', e));
        }
        setIsActive(!isActive);
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

    // Determine circle scale based on breathing phase
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
        const savedMantra = localStorage.getItem('aura_daily_mantra') || '';

        const newEntry = {
            id: Date.now().toString(),
            content: reflection,
            isPublic: false,
            mantra: savedMantra,
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
                    body: JSON.stringify({ content: reflection, isPublic: false, mantra: savedMantra })
                });
            }
        } catch (e) {
            console.log('Backend save bypassed for local prototype mode.');
        }

        setIsSaving(false);
        navigate('/track');
    };

    if (showJournal) {
        return (
            <div style={{ padding: '2rem', width: '100%', maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.6s ease-out' }}>
                <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Your Journey Completes</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Take a moment to capture your thoughts after meditating.</p>
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

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                            className="btn-glow"
                            onClick={handleSave}
                            disabled={!reflection.trim() || isSaving}
                            style={{ opacity: (!reflection.trim() || isSaving) ? 0.5 : 1 }}
                        >
                            {isSaving ? 'Saving...' : 'Save & Track'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', width: '100%', maxWidth: '600px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>

            {savedMantra && (
                <div style={{ marginBottom: '2rem', animation: 'fadeIn 1s ease-out' }}>
                    <p style={{ color: '#E0E7FF', textShadow: '0 0 10px rgba(139, 92, 246, 0.6)', fontStyle: 'italic', fontSize: '1.25rem', letterSpacing: '1px' }}>
                        "{savedMantra}"
                    </p>
                </div>
            )}

            <div style={{
                position: 'relative',
                width: '250px',
                height: '250px',
                margin: '0 auto 4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {/* Animated Breathing Circle */}
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    transition: 'transform 4s ease-in-out',
                    transform: getCircleTransform(),
                    zIndex: 1
                }} />

                {/* Time Text */}
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
                                padding: '8px 16px',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                transition: 'var(--transition-fast)',
                                fontFamily: 'var(--font-sans)',
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

                {(!isActive && timeLeft < selectedDuration * 60) && (
                    <button
                        onClick={() => { setTimeLeft(0); }} // Dev hack to skip timer and jump to journal
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
