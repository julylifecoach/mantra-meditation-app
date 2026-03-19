import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Check, Compass, Calendar, Users, BookOpen } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import './index.css';

import MantraQuiz from './components/MantraQuiz';
import MeditationGuide from './components/MeditationGuide';
import CalendarTrack from './components/CalendarTrack';
import UserHub from './components/UserHub';

import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import AdminPanel from './pages/AdminPanel';
import ContentCreatorSales from './pages/ContentCreatorSales';
import ContentCreatorWiki from './pages/ContentCreatorWiki';
import SelfCoachingExam from './pages/SelfCoachingExam';
import AdvancedPractice108 from './pages/AdvancedPractice108';
import SelfCoachingWiki from './pages/SelfCoachingWiki';
import BizCoachHome from './pages/BizCoachHome';
import ProgramPage from './pages/ProgramPage';
import ProgramAdmin from './pages/ProgramAdmin';
import SessionView from './pages/SessionView';
import ConsentModal from './components/ConsentModal';
import FeedbackModal from './components/FeedbackModal';

function Navigation({ userProfile }) {
  const location = useLocation();
  const hasClientAccess = userProfile?.accessClientPortal || userProfile?.accessBizCoach || userProfile?.accessContentCreator || userProfile?.accessSelfCoaching || userProfile?.role === 'admin';

  const navItems = [
    { path: '/', label: 'Mantra', icon: <Compass size={20} /> },
    { path: '/meditate', label: 'Practice', icon: <Check size={20} /> },
    { path: '/track', label: 'Track', icon: <Calendar size={20} /> },
    ...(hasClientAccess ? [{ path: '/hub', label: 'Hub', icon: <Users size={20} /> }] : []),
    { path: 'https://resources.julylifecoach.com/buddhist-guide/', label: 'Learn', icon: <BookOpen size={20} />, external: true },
  ];

  return (
    <nav className="glass-panel mobile-nav" style={{
      position: 'fixed',
      bottom: '2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      gap: '1.5rem',
      zIndex: 100
    }}>
      {navItems.map((item) => (
        item.external ? (
          <a
            key={item.path}
            href={item.path}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              color: 'var(--text-secondary)',
              transition: 'var(--transition-fast)',
              textDecoration: 'none'
            }}
          >
            {item.icon}
            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{item.label}</span>
          </a>
        ) : (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              color: location.pathname === item.path ? 'var(--accent-primary)' : 'var(--text-secondary)',
              transition: 'var(--transition-fast)',
              textDecoration: 'none'
            }}
          >
            {item.icon}
            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{item.label}</span>
          </Link>
        )
      ))}
    </nav>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [beginnerMode, setBeginnerMode] = useState(() => {
    return localStorage.getItem('practice_beginner_mode') === 'true';
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [nickname, setNickname] = useState('');
  const [editingNickname, setEditingNickname] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('aura_user');
    const savedToken = localStorage.getItem('aura_token');

    if (savedUser && savedToken) {
      // Optimistically show the user while we validate
      const user = JSON.parse(savedUser);
      setUserProfile(user);
      setIsAuthenticated(true);
      setNickname(user.nickname || '');

      // Validate token with backend — auto-clear if invalid/expired
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${savedToken}` },
      }).then(res => {
        if (!res.ok) {
          // Token is invalid or expired — auto-logout
          console.warn('Stored token is invalid, clearing session.');
          localStorage.removeItem('aura_user');
          localStorage.removeItem('aura_token');
          localStorage.removeItem('aura_reflections');
          localStorage.removeItem('aura_daily_mantra');
          setIsAuthenticated(false);
          setUserProfile(null);
          setNickname('');
        } else {
          // Token is valid — refresh user data from backend
          res.json().then(data => {
            if (data.user) {
              localStorage.setItem('aura_user', JSON.stringify(data.user));
              setUserProfile(data.user);
              setNickname(data.user.nickname || '');
            }
          });
        }
      }).catch(() => {
        // Network error — keep the optimistic state, don't log out
        console.warn('Could not validate token (network error), keeping session.');
      });
    }
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
        setEditingNickname(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleBeginnerMode = () => {
    const newVal = !beginnerMode;
    setBeginnerMode(newVal);
    localStorage.setItem('practice_beginner_mode', String(newVal));
  };

  const isAdmin = userProfile?.role === 'admin';

  const getDisplayName = () => {
    if (!userProfile) return '';
    const realName = userProfile.displayName || userProfile.name || '';
    const nick = nickname || userProfile.nickname;
    if (nick) return isAdmin ? `${nick} (${realName})` : nick;
    return realName;
  };

  const handleSaveNickname = async () => {
    if (!userProfile) return;
    const updatedUser = { ...userProfile, nickname };
    localStorage.setItem('aura_user', JSON.stringify(updatedUser));
    setUserProfile(updatedUser);
    setEditingNickname(false);

    // Try to persist to backend
    try {
      const token = localStorage.getItem('aura_token');
      if (token) {
        await fetch('/api/user/nickname', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ nickname })
        });
      }
    } catch (e) {
      console.log('Nickname save to backend skipped.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('aura_user');
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_reflections');
    localStorage.removeItem('aura_daily_mantra');
    setIsAuthenticated(false);
    setUserProfile(null);
    setShowProfileMenu(false);
    setNickname('');
  };

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('aura_token', data.token);
        localStorage.setItem('aura_user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setUserProfile(data.user);
        setNickname(data.user.nickname || '');
      }
    } catch (e) {
      console.error(e);
      handleLoginError();
    }
  };

  const handleConsentComplete = (updatedUser) => {
    localStorage.setItem('aura_user', JSON.stringify(updatedUser));
    setUserProfile(updatedUser);
  };

  const handleLoginError = () => {
    console.error('Login Failed');
  };

  return (
    <Router>
      <div className="app-container">

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '1.5rem' }}>Practice</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 100 }}>
            {/* Beginner Mode Toggle */}
            {isAuthenticated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={toggleBeginnerMode}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Guide</span>
                <div style={{
                  width: '36px', height: '20px',
                  borderRadius: '10px',
                  background: beginnerMode ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                  position: 'relative',
                  transition: 'var(--transition-fast)',
                }}>
                  <div style={{
                    width: '16px', height: '16px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: beginnerMode ? '18px' : '2px',
                    transition: 'var(--transition-fast)',
                  }} />
                </div>
              </div>
            )}

            {/* User Profile / Login */}
            {isAuthenticated ? (
              <div ref={profileRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  style={{
                    color: 'var(--text-secondary)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    transition: 'var(--transition-fast)',
                    background: showProfileMenu ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: '0.9rem',
                  }}
                >
                  {getDisplayName()} ▾
                </button>

                {showProfileMenu && (
                  <div className="glass-panel" style={{
                    position: 'absolute', top: '100%', right: 0,
                    marginTop: '0.5rem', padding: '1rem',
                    minWidth: '240px',
                    animation: 'fadeIn 0.2s ease-out',
                    zIndex: 200,
                  }}>
                    {/* Nickname Editor */}
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Nickname</p>
                      {editingNickname ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Enter nickname..."
                            style={{
                              flex: 1, padding: '6px 10px',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid var(--glass-border)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontFamily: 'var(--font-sans)', fontSize: '0.85rem',
                            }}
                            autoFocus
                          />
                          <button onClick={handleSaveNickname} style={{
                            padding: '6px 12px', borderRadius: '6px',
                            background: 'var(--accent-primary)', color: 'white',
                            fontSize: '0.8rem', border: 'none', cursor: 'pointer',
                          }}>Save</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingNickname(true)} style={{
                          color: 'var(--accent-primary)', fontSize: '0.85rem',
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 0, fontFamily: 'var(--font-sans)',
                        }}>
                          {nickname ? `✏️ ${nickname}` : '+ Set nickname'}
                        </button>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(userProfile?.accessClientPortal || userProfile?.accessBizCoach || userProfile?.accessContentCreator || userProfile?.accessSelfCoaching || isAdmin) && (
                        <Link to="/hub" onClick={() => setShowProfileMenu(false)} style={{
                          color: 'var(--accent-primary)', fontSize: '0.85rem',
                          textDecoration: 'none', fontFamily: 'var(--font-sans)',
                        }}>
                          🏠 My Hub
                        </Link>
                      )}
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setShowProfileMenu(false)} style={{
                          color: 'var(--accent-primary)', fontSize: '0.85rem',
                          textDecoration: 'none', fontFamily: 'var(--font-sans)',
                        }}>
                          🛡️ Admin Panel
                        </Link>
                      )}
                      <button onClick={handleLogout} style={{
                        color: '#f87171', fontSize: '0.85rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', padding: 0, textAlign: 'left',
                      }}>
                        Log Out
                      </button>
                      <button onClick={() => { setIsFeedbackOpen(true); setShowProfileMenu(false); }} style={{
                        color: 'var(--text-secondary)', fontSize: '0.85rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', padding: 0, textAlign: 'left',
                      }}>
                        Leave Feedback
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </header>

        <main className="main-content">
          {isAuthenticated ? (
            <Routes>

              <Route path="/" element={<MantraQuiz beginnerMode={beginnerMode} />} />
              <Route path="/meditate" element={<MeditationGuide beginnerMode={beginnerMode} />} />
              <Route path="/track" element={<CalendarTrack beginnerMode={beginnerMode} />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/content-creator" element={<ContentCreatorSales />} />
              <Route path="/content-creator-wiki" element={<ContentCreatorWiki userProfile={userProfile} />} />
              <Route path="/self-coaching-exam" element={<SelfCoachingExam userProfile={userProfile} />} />
              <Route path="/self-coaching-wiki" element={<SelfCoachingWiki userProfile={userProfile} />} />
              <Route path="/bizcoach" element={<BizCoachHome userProfile={userProfile} />} />
              <Route path="/bizcoach/program/:slug" element={<ProgramPage userProfile={userProfile} />} />
              <Route path="/hub" element={<UserHub userProfile={userProfile} />} />
              <Route path="/hub/session/:id" element={<SessionView userProfile={userProfile} />} />
              <Route path="/108-challenge" element={<AdvancedPractice108 userProfile={userProfile} />} />
              {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
              {isAdmin && <Route path="/admin/programs" element={<ProgramAdmin />} />}
            </Routes>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '6rem', animation: 'fadeIn 1s ease-out' }}>
              <h2 style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Welcome to Practice</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.1rem' }}>Sign in to begin your mindful journey.</p>

              {/* Auth Card */}
              <div className="glass-panel" style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem', textAlign: 'left' }}>

                {/* Toggle Tabs */}
                <div style={{ display: 'flex', marginBottom: '1.5rem', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                  <button onClick={() => { setAuthMode('login'); setAuthError(''); }} style={{
                    flex: 1, padding: '0.6rem', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', fontWeight: 600,
                    background: authMode === 'login' ? 'var(--accent-primary)' : 'transparent',
                    color: authMode === 'login' ? '#fff' : 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer', transition: 'var(--transition-fast)',
                  }}>Sign In</button>
                  <button onClick={() => { setAuthMode('register'); setAuthError(''); }} style={{
                    flex: 1, padding: '0.6rem', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', fontWeight: 600,
                    background: authMode === 'register' ? 'var(--accent-primary)' : 'transparent',
                    color: authMode === 'register' ? '#fff' : 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer', transition: 'var(--transition-fast)',
                  }}>Create Account</button>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError('');
                  setAuthLoading(true);
                  const form = e.target;
                  const email = form.email.value.trim();
                  const password = form.password.value;

                  try {
                    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
                    const body = authMode === 'login'
                      ? { email, password }
                      : { email, password, displayName: form.displayName?.value?.trim() || email.split('@')[0], agreedToTos: true };

                    const res = await fetch(endpoint, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setAuthError(data.error || 'Authentication failed');
                    } else {
                      localStorage.setItem('aura_token', data.token);
                      localStorage.setItem('aura_user', JSON.stringify(data.user));
                      setIsAuthenticated(true);
                      setUserProfile(data.user);
                      setNickname(data.user.nickname || '');
                    }
                  } catch (err) {
                    setAuthError('Network error. Please try again.');
                  } finally {
                    setAuthLoading(false);
                  }
                }}>

                  {authMode === 'register' && (
                    <input name="displayName" type="text" placeholder="Display name (optional)" style={{
                      width: '100%', padding: '0.75rem 1rem', marginBottom: '0.75rem',
                      background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)',
                      borderRadius: '8px', color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)', fontSize: '0.9rem', boxSizing: 'border-box',
                    }} />
                  )}

                  <input name="email" type="email" placeholder="Email address" required style={{
                    width: '100%', padding: '0.75rem 1rem', marginBottom: '0.75rem',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)',
                    borderRadius: '8px', color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)', fontSize: '0.9rem', boxSizing: 'border-box',
                  }} />

                  <input name="password" type="password" placeholder={authMode === 'register' ? 'Password (min 8 chars)' : 'Password'} required minLength={authMode === 'register' ? 8 : undefined} style={{
                    width: '100%', padding: '0.75rem 1rem', marginBottom: '1rem',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)',
                    borderRadius: '8px', color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)', fontSize: '0.9rem', boxSizing: 'border-box',
                  }} />

                  {authError && (
                    <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{authError}</p>
                  )}

                  <button type="submit" disabled={authLoading} style={{
                    width: '100%', padding: '0.75rem', borderRadius: '8px',
                    background: 'var(--accent-primary)', color: '#fff',
                    fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 600,
                    border: 'none', cursor: authLoading ? 'wait' : 'pointer',
                    opacity: authLoading ? 0.7 : 1, transition: 'var(--transition-fast)',
                  }}>
                    {authLoading ? '...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                  </button>
                </form>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>or</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                </div>

                {/* Google Sign-In */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <GoogleLogin
                    onSuccess={handleLoginSuccess}
                    onError={handleLoginError}
                    theme="filled_black"
                    shape="pill"
                    text="signin_with"
                  />
                </div>
              </div>

              <button
                onClick={() => setIsFeedbackOpen(true)}
                style={{
                  marginTop: '2rem', padding: '10px 20px',
                  borderRadius: '100px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'var(--transition-fast)'
                }}
              >
                Leave Feedback
              </button>
            </div>
          )}
        </main>

        {isAuthenticated && <Navigation userProfile={userProfile} />}

        {/* ToS Consent Modal */}
        {isAuthenticated && userProfile && !userProfile.agreedToTos && (
          <ConsentModal onComplete={handleConsentComplete} />
        )}

        {/* Feedback Modal */}
        <FeedbackModal 
          isOpen={isFeedbackOpen} 
          onClose={() => setIsFeedbackOpen(false)} 
          appSource="Practice App" 
        />
      </div>
    </Router>
  );
}

export default App;
