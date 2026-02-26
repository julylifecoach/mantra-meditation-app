import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Check, Compass, Calendar, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import './index.css';

// Stub components (will build out in subsequent steps)
import MantraQuiz from './components/MantraQuiz';
import MeditationGuide from './components/MeditationGuide';
import CalendarTrack from './components/CalendarTrack';
import PublicBoard from './components/PublicBoard';

function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Mantra', icon: <Compass size={20} /> },
    { path: '/meditate', label: 'Meditate', icon: <Check size={20} /> },
    { path: '/track', label: 'Track', icon: <Calendar size={20} /> },
    { path: '/community', label: 'Community', icon: <Users size={20} /> },
  ];

  return (
    <nav className="glass-panel" style={{
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

  useEffect(() => {
    const savedUser = localStorage.getItem('aura_user');
    if (savedUser) {
      setUserProfile(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

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
      }
    } catch (e) {
      console.error(e);
      handleLoginError();
    }
  };

  const handleLoginError = () => {
    console.error('Login Failed');
  };

  return (
    <Router>
      <div className="app-container">

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '1.5rem' }}>Practice</h1>

          <div style={{ zIndex: 100 }}>
            {isAuthenticated ? (
              <span style={{ color: 'var(--text-secondary)' }}>Welcome, {userProfile?.displayName || userProfile?.name}</span>
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
              <Route path="/" element={<MantraQuiz />} />
              <Route path="/meditate" element={<MeditationGuide />} />
              <Route path="/track" element={<CalendarTrack />} />
              <Route path="/community" element={<PublicBoard />} />
            </Routes>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '10rem', animation: 'fadeIn 1s ease-out' }}>
              <h2 style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Welcome to Practice</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>Please sign in to begin your mindful journey.</p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>Login will ask for permissions to play audio for the meditation timer.</p>
            </div>
          )}
        </main>

        {isAuthenticated && <Navigation />}
      </div>
    </Router>
  );
}

export default App;
