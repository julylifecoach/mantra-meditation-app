import React, { useState } from 'react';

export default function ConsentModal({ onComplete }) {
    const [agreedToTos, setAgreedToTos] = useState(false);
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!agreedToTos) return;
        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('aura_token');
            const res = await fetch('/api/user/consent', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ agreedToTos: true, marketingOptIn }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save consent');
            }

            const data = await res.json();
            onComplete(data.user);
        } catch (e) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.3s ease-out',
        }}>
            <div className="glass-panel" style={{
                maxWidth: '460px', width: '90%',
                padding: '2.5rem',
                textAlign: 'center',
            }}>
                <h2 style={{
                    fontSize: '1.5rem',
                    color: 'var(--text-primary)',
                    marginBottom: '0.75rem',
                }}>
                    Welcome to Practice
                </h2>
                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.95rem',
                    marginBottom: '2rem',
                    lineHeight: 1.6,
                }}>
                    Before we get started, please review and accept our terms.
                </p>

                {/* ToS Checkbox */}
                <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    textAlign: 'left', cursor: 'pointer',
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: agreedToTos ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${agreedToTos ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                    transition: 'all 0.2s ease',
                }}>
                    <input
                        type="checkbox"
                        checked={agreedToTos}
                        onChange={(e) => setAgreedToTos(e.target.checked)}
                        style={{ marginTop: '3px', accentColor: 'var(--accent-primary)' }}
                    />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                        I agree to the{' '}
                        <a href="/terms" target="_blank" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" target="_blank" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                            Privacy Policy
                        </a>
                        . <span style={{ color: 'var(--text-tertiary)' }}>(Required)</span>
                    </span>
                </label>

                {/* Marketing Checkbox */}
                <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    textAlign: 'left', cursor: 'pointer',
                    marginBottom: '1.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: marketingOptIn ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${marketingOptIn ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                    transition: 'all 0.2s ease',
                }}>
                    <input
                        type="checkbox"
                        checked={marketingOptIn}
                        onChange={(e) => setMarketingOptIn(e.target.checked)}
                        style={{ marginTop: '3px', accentColor: 'var(--accent-primary)' }}
                    />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                        Send me daily mindfulness insights and updates from July Life Coach.{' '}
                        <span style={{ color: 'var(--text-tertiary)' }}>(Optional)</span>
                    </span>
                </label>

                {error && (
                    <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={!agreedToTos || submitting}
                    style={{
                        width: '100%',
                        padding: '0.85rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: agreedToTos
                            ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                            : 'rgba(255,255,255,0.05)',
                        color: agreedToTos ? 'white' : 'var(--text-tertiary)',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: agreedToTos ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        fontFamily: 'var(--font-sans)',
                    }}
                >
                    {submitting ? 'Saving...' : 'Continue'}
                </button>
            </div>
        </div>
    );
}
