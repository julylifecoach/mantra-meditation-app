import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Check, Compass, Calendar, Users } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import './index.css';

import MantraQuiz from './components/MantraQuiz';
import MeditationGuide from './components/MeditationGuide';
import CalendarTrack from './components/CalendarTrack';
import PublicBoard from './components/PublicBoard';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import AdminPanel from './pages/AdminPanel';
import ConsentModal from './components/ConsentModal';

function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Mantra', icon: <Compass size={20} /> },
    { path: '/meditate', label: 'Practice', icon: <Check size={20} /> },
    { path: '/track', label: 'Track', icon: <Calendar size={20} /> },
    { path: '/community', label: 'Community', icon: <Users size={20} /> },
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
        <Link
          key={item.path}
          to={item.path}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            color: location.pathname === item.path ? 'var(--accent-primary)' : 'var(--text-secondary)',
            transition: 'var(--transition-fast)'
          }}
        >
          {item.icon}
          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{item.label}</span>
        </Link>
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
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={handleLoginError}
                theme="filled_black"
                shape="pill"
                text="signin_with"
              />
            )}
          </div>
        </header>

        <main className="main-content">
          {isAuthenticated ? (
            <Routes>
              <Route path="/" element={<MantraQuiz beginnerMode={beginnerMode} />} />
              <Route path="/meditate" element={<MeditationGuide beginnerMode={beginnerMode} />} />
              <Route path="/track" element={<CalendarTrack beginnerMode={beginnerMode} />} />
              <Route path="/community" element={<PublicBoard beginnerMode={beginnerMode} isAdmin={isAdmin} />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
            </Routes>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '10rem', animation: 'fadeIn 1s ease-out' }}>
              <h2 style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Welcome to Practice</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>Please sign in to begin your mindful journey.</p>
            </div>
          )}
        </main>

        {isAuthenticated && <Navigation />}

        {/* ToS Consent Modal */}
        {isAuthenticated && userProfile && !userProfile.agreedToTos && (
          <ConsentModal onComplete={handleConsentComplete} />
        )}
      </div>
    </Router>
  );
}

export default App;
