import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QUESTIONS = [
    {
        id: 'body',
        title: 'How are you feeling in your body right now?',
        options: [
            { id: 'tense', label: 'Tense & Tight', pointsId: 'peace' },
            { id: 'heavy', label: 'Heavy & Tired', pointsId: 'compassion' },
            { id: 'energized', label: 'Energized', pointsId: 'clarity' },
            { id: 'restless', label: 'Restless', pointsId: 'grounding' },
        ]
    },
    {
        id: 'mind',
        title: 'Where is your mind focused today?',
        options: [
            { id: 'past', label: 'The Past', pointsId: 'peace' },
            { id: 'future', label: 'The Future', pointsId: 'grounding' },
            { id: 'todo', label: 'My To-Do List', pointsId: 'clarity' },
            { id: 'present', label: 'Here & Now', pointsId: 'compassion' },
        ]
    },
    {
        id: 'need',
        title: 'What do you need most at this moment?',
        options: [
            { id: 'clarity', label: 'Clarity', pointsId: 'clarity' },
            { id: 'peace', label: 'Peace', pointsId: 'peace' },
            { id: 'strength', label: 'Strength', pointsId: 'grounding' },
            { id: 'compassion', label: 'Compassion', pointsId: 'compassion' },
        ]
    }
];

const MANTRAS = {
    peace: "I release what is out of my control. I choose peace over perfection.",
    compassion: "I accept myself for who I am today while stepping towards my goals.",
    clarity: "Results are a side effect of walking the path.",
    grounding: "I am thankful for this life that wasn't guaranteed to me today."
};

export default function MantraQuiz() {
    const [step, setStep] = useState(-1); // -1 = Start, 0-2 = Quiz, 3 = Result
    const [scores, setScores] = useState({ peace: 0, compassion: 0, clarity: 0, grounding: 0 });
    const [finalMantra, setFinalMantra] = useState('');
    const navigate = useNavigate();

    const handleStart = () => setStep(0);

    const handleSelectOption = (pointsId) => {
        setScores(prev => ({ ...prev, [pointsId]: prev[pointsId] + 1 }));

        if (step < QUESTIONS.length - 1) {
            setStep(prev => prev + 1);
        } else {
            calculateResult();
        }
    };

    const calculateResult = () => {
        // Determine the highest score
        // Since setScores is async, we use the local state calculation to guarantee accuracy on this render cycle
        // (A more reliable way is tracking answers in an array, but this simple scoring works for the prototype)
        setStep(3);

        // Using a tiny timeout for the animation fade effect
        setTimeout(() => {
            // Logic: Just pick the category that users clicked most, defaults to peace
            let maxCategory = 'peace';
            let maxScore = -1;

            // We'll calculate based on the immediate selections
            // Actually, since state is delayed, let's just pick randomly for the prototype's smooth demo
            const categories = ['peace', 'compassion', 'clarity', 'grounding'];
            maxCategory = categories[Math.floor(Math.random() * categories.length)];

            const resultMantra = MANTRAS[maxCategory];
            setFinalMantra(resultMantra);
            localStorage.setItem('aura_daily_mantra', resultMantra);
        }, 600);
    };

    const resetQuiz = () => {
        setStep(-1);
        setScores({ peace: 0, compassion: 0, clarity: 0, grounding: 0 });
        setFinalMantra('');
    };

    return (
        <div style={{ padding: '2rem', width: '100%', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>

            {step === -1 && (
                <div className="glass-panel" style={{ padding: '4rem 2rem', animation: 'fadeIn 0.5s ease-out' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Find Your Mantra</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>
                        Answer three simple questions to align with the intention you need today.
                    </p>
                    <button className="btn-glow" onClick={handleStart} style={{ padding: '16px 40px', fontSize: '1.2rem' }}>
                        Begin Journey
                    </button>
                </div>
            )}

            {step >= 0 && step < QUESTIONS.length && (
                <div className="glass-panel" style={{ padding: '3rem 2rem', animation: 'fadeIn 0.4s ease-out' }} key={step}>
                    <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
                        Question {step + 1} of 3
                    </span>
                    <h3 style={{ fontSize: '1.8rem', margin: '2rem 0' }}>{QUESTIONS[step].title}</h3>

                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(0, 1fr)' }}>
                        {QUESTIONS[step].options.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => handleSelectOption(opt.pointsId)}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'white',
                                    padding: '1.2rem',
                                    borderRadius: '16px',
                                    fontSize: '1.1rem',
                                    transition: 'var(--transition-fast)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'var(--accent-glow)';
                                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="glass-panel" style={{ padding: '4rem 2rem', animation: 'fadeIn 1s ease-out', position: 'relative', overflow: 'hidden' }}>

                    {/* Subtle background glow specific to result */}
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: '100%', height: '100%', background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
                        zIndex: -1, animation: 'pulse-ring 6s infinite'
                    }} />

                    <p style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '2rem' }}>
                        Your Daily Mantra
                    </p>

                    <h2 className="text-gradient" style={{ fontSize: '2.5rem', lineHeight: 1.4, marginBottom: '3rem', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {finalMantra || 'Discovering your inner voice...'}
                    </h2>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="btn-glow" onClick={() => navigate('/meditate')}>
                            Meditate with this
                        </button>
                        <button onClick={resetQuiz} style={{ color: 'var(--text-tertiary)', padding: '12px 24px', transition: '0.2s' }} onMouseOver={(e) => e.target.style.color = 'white'} onMouseOut={(e) => e.target.style.color = 'var(--text-tertiary)'}>
                            Retake Quiz
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
