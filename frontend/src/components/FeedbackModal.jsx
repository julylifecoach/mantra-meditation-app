import React, { useState } from 'react';

export default function FeedbackModal({ isOpen, onClose, appSource }) {
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, replyTo, appSource })
      });

      if (!res.ok) throw new Error('Failed to send feedback');

      setStatus('success');
      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
          setReplyTo('');
        }, 300);
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '2rem',
        position: 'relative',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: '1.5rem',
            cursor: 'pointer',
            lineHeight: 1
          }}
        >
          &times;
        </button>

        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Send Feedback</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Have a suggestion, found a bug, or just want to say hi? Let us know below.
        </p>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
            <h3 style={{ color: 'var(--accent-primary)' }}>Thank you!</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Your message has been sent.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Message <span style={{ color: '#f87171' }}>*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                placeholder="What's on your mind?"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Email for reply (Optional)
              </label>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {status === 'error' && (
              <p style={{ color: '#f87171', fontSize: '0.85rem', margin: 0 }}>{errorMsg}</p>
            )}

            <button 
              type="submit" 
              className="btn-glow"
              disabled={status === 'loading' || !message.trim()}
              style={{
                marginTop: '1rem',
                opacity: (status === 'loading' || !message.trim()) ? 0.7 : 1,
                cursor: (status === 'loading' || !message.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              {status === 'loading' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
