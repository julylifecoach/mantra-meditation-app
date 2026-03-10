import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, ChevronRight, RefreshCw } from 'lucide-react';

const QUESTIONS = [
    {
        id: 1,
        question: "True or False: In Buddhist philosophy, happiness is achieved by completely eliminating all desire and retreating from the world.",
        options: [
            "True",
            "False"
        ],
        correct: 1,
        explanation: "False. While Buddhism addresses attachment, the Middle Way encourages active participation in the world without clinging to outcomes, rather than utter isolation or suppression of all desires."
    },
    {
        id: 2,
        question: "What is the primary cause of suffering (Dukkha) according to the Four Noble Truths?",
        options: [
            "Other people's actions",
            "Lack of material wealth",
            "Craving and attachment (Tanha)",
            "Physical pain"
        ],
        correct: 2,
        explanation: "The Second Noble Truth identifies craving and clinging to temporary states and things as the root of dissatisfaction and suffering."
    },
    {
        id: 3,
        question: "How does the concept of 'Anicca' (impermanence) relate to happiness?",
        options: [
            "It means true happiness is impossible because everything fades.",
            "It teaches us to quickly grab onto good experiences before they leave.",
            "It frees us from suffering by helping us accept that all states change, allowing us to appreciate the present without clinging.",
            "It means we should ignore our feelings since they will pass anyway."
        ],
        correct: 2,
        explanation: "Understanding impermanence allows us to experience joy fully without the anxiety of trying to hold onto it permanently."
    },
    {
        id: 4,
        question: "In the context of this program, what is the purpose of regular mantra practice?",
        options: [
            "To magically manifest our desires into reality",
            "To train the mind in focus, stamina, and self-compassion, building resilience against ordinary reactions",
            "To force ourselves to feel happy even when we are sad",
            "To punish the ego"
        ],
        correct: 1,
        explanation: "Mantra practice is an active mental training tool to cultivate focus and break habitual, automatic reactions, naturally leading to greater peace."
    }
];

export default function SelfCoachingExam({ userProfile }) {
    const navigate = useNavigate();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [examComplete, setExamComplete] = useState(false);

    // Determine if they pass (e.g., getting at least 75% correct)
    const passThreshold = Math.ceil(QUESTIONS.length * 0.75);
    const isPass = score >= passThreshold;

    const currentQuestion = QUESTIONS[currentQuestionIndex];

    const handleSelectOption = (index) => {
        if (isAnswered) return;
        setSelectedAnswer(index);
    };

    const handleSubmitAnswer = () => {
        if (selectedAnswer === null) return;
        setIsAnswered(true);
        if (selectedAnswer === currentQuestion.correct) {
            setScore(prev => prev + 1);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < QUESTIONS.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
        } else {
            setExamComplete(true);
        }
    };

    const handleRetake = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setScore(0);
        setExamComplete(false);
    };

    const unlockPracticePortal = async () => {
        // In a real implementation, this would call the backend to update user permissions/status
        // e.g., POST /api/user/unlock-advanced-practice
        alert("Advanced Practice Portal Unlocked! (Backend integration pending)");
        navigate('/108-challenge');
    };

    if (examComplete) {
        return (
            <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }} className="glass-panel">
                {isPass ? (
                    <div>
                        <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 1.5rem auto' }} />
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#10b981' }}>Examination Passed</h2>
                        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            You scored {score} out of {QUESTIONS.length}. You have demonstrated a solid understanding of the core concepts of Buddhist happiness.
                        </p>
                        <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem', lineHeight: 1.6 }}>
                            You are now ready to begin the intense 108-Day Challenge. This will replace the standard daily quizzes in your Practice Portal.
                        </p>
                        <button
                            onClick={unlockPracticePortal}
                            style={{ background: 'var(--accent-primary)', color: 'white', padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                        >
                            Enter the 108-Day Challenge <ChevronRight size={20} />
                        </button>
                    </div>
                ) : (
                    <div>
                        <XCircle size={64} color="#f87171" style={{ margin: '0 auto 1.5rem auto' }} />
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#f87171' }}>Please Review the Material</h2>
                        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            You scored {score} out of {QUESTIONS.length}. A score of {passThreshold} is required to unlock the advanced Practice Portal.
                        </p>
                        <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem', lineHeight: 1.6 }}>
                            We recommend reviewing the Self-Coaching Wiki chapters on True Happiness and Impermanence before trying again, to ensure you get the maximum value from the 108-Day Challenge.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                onClick={() => navigate('/self-coaching-wiki')}
                                style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '12px 24px', borderRadius: '8px', fontSize: '1rem', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
                            >
                                Review Wiki
                            </button>
                            <button
                                onClick={handleRetake}
                                style={{ background: 'var(--accent-secondary)', color: 'white', padding: '12px 24px', borderRadius: '8px', fontSize: '1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <RefreshCw size={18} /> Retake Exam
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1.5rem', minHeight: '60vh' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Comprehension Check</h2>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem' }}>
                    Question {currentQuestionIndex + 1} of {QUESTIONS.length}
                </span>
            </div>

            <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '2.5rem', lineHeight: 1.5 }}>
                    {currentQuestion.question}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                    {currentQuestion.options.map((option, index) => {
                        let bgColor = 'rgba(255,255,255,0.05)';
                        let borderColor = 'var(--glass-border)';

                        if (isAnswered) {
                            if (index === currentQuestion.correct) {
                                bgColor = 'rgba(16, 185, 129, 0.2)';
                                borderColor = '#10b981';
                            } else if (index === selectedAnswer && index !== currentQuestion.correct) {
                                bgColor = 'rgba(248, 113, 113, 0.2)';
                                borderColor = '#f87171';
                            }
                        } else if (selectedAnswer === index) {
                            borderColor = 'var(--accent-primary)';
                            bgColor = 'rgba(139, 92, 246, 0.1)';
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => handleSelectOption(index)}
                                disabled={isAnswered}
                                style={{
                                    padding: '16px 20px',
                                    background: bgColor,
                                    border: `1px solid ${borderColor}`,
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    fontSize: '1.1rem',
                                    textAlign: 'left',
                                    cursor: isAnswered ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                {option}
                                {isAnswered && index === currentQuestion.correct && <CheckCircle color="#10b981" size={20} />}
                                {isAnswered && index === selectedAnswer && index !== currentQuestion.correct && <XCircle color="#f87171" size={20} />}
                            </button>
                        );
                    })}
                </div>

                {isAnswered && (
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: '4px solid var(--accent-secondary)', marginBottom: '2rem', animation: 'fadeIn 0.4s ease-out' }}>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--accent-secondary)' }}>Explanation</h4>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{currentQuestion.explanation}</p>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {!isAnswered ? (
                        <button
                            onClick={handleSubmitAnswer}
                            disabled={selectedAnswer === null}
                            style={{
                                background: selectedAnswer !== null ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                                color: selectedAnswer !== null ? 'white' : 'var(--text-tertiary)',
                                padding: '12px 32px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600, border: 'none',
                                cursor: selectedAnswer !== null ? 'pointer' : 'not-allowed',
                                transition: 'var(--transition-fast)'
                            }}
                        >
                            Submit
                        </button>
                    ) : (
                        <button
                            onClick={handleNextQuestion}
                            style={{
                                background: 'white', color: 'black',
                                padding: '12px 32px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600, border: 'none',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            {currentQuestionIndex < QUESTIONS.length - 1 ? 'Next Question' : 'View Results'} <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
