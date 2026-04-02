import React, { useState, useEffect } from 'react';

/* ── 100 Days of Practice — Curriculum Data ── */
const CURRICULUM = [
  { week: 1,  title: 'Wake up at the same time every day',     phase: 1, phaseName: 'Foundation',  mantra: 'I will say yes and do first' },
  { week: 2,  title: 'Meditation phase 1: 5 min',              phase: 1, phaseName: 'Foundation',  mantra: 'I will say yes and do first' },
  { week: 3,  title: 'Bows phase 1: 36 bows',                  phase: 1, phaseName: 'Foundation',  mantra: 'Difficult things can be done with ease' },
  { week: 4,  title: 'Wake up at 5 AM every day',              phase: 1, phaseName: 'Foundation',  mantra: 'Difficult things can be done with ease' },
  { week: 5,  title: 'Meditation phase 2: 10 min',             phase: 2, phaseName: 'Deepening',   mantra: 'I have the freedom to do what I don\'t want to do' },
  { week: 6,  title: 'Bows phase 2: 72 bows',                  phase: 2, phaseName: 'Deepening',   mantra: 'I have the freedom to do what I don\'t want to do' },
  { week: 7,  title: 'Meditation phase 3: 15 min',             phase: 2, phaseName: 'Deepening',   mantra: 'Results are side effects of walking the path' },
  { week: 8,  title: 'Bows phase 3: 108 bows',                 phase: 2, phaseName: 'Deepening',   mantra: 'Results are side effects of walking the path' },
  { week: 9,  title: 'Deciding on a mantra',                   phase: 3, phaseName: 'Inquiry',     mantra: null },
  { week: 10, title: 'Who am I?',                              phase: 3, phaseName: 'Inquiry',     mantra: null },
  { week: 11, title: 'Why did I get angry?',                   phase: 3, phaseName: 'Inquiry',     mantra: null },
  { week: 12, title: 'What is mine?',                          phase: 3, phaseName: 'Inquiry',     mantra: null },
  { week: 13, title: 'Yong Maeng Jeong Jin: 40 min meditation', phase: 4, phaseName: 'Intensive',  mantra: null },
  { week: 14, title: 'Yong Maeng Jeong Jin: 324 bows',         phase: 4, phaseName: 'Intensive',   mantra: null },
];

const PHASE_COLORS = {
  1: '#6ee7b7',
  2: '#93c5fd',
  3: '#c4b5fd',
  4: '#fca5a5',
};

const PHASE_DESCRIPTIONS = {
  1: 'Build the habit. Starting simple — consistency is the practice.',
  2: 'Increase capacity. Your body and mind are ready for more.',
  3: 'Turn inward. The deepest practice is asking the right questions.',
  4: 'Brave and fierce effort. You\'ve earned this.',
};

function GuidedPractice({ userProfile }) {
  // State: startDate, daily check-ins
  const [startDate, setStartDate] = useState(() => {
    const saved = localStorage.getItem('guided_100_start');
    return saved ? new Date(saved) : null;
  });
  const [checkins, setCheckins] = useState(() => {
    const saved = localStorage.getItem('guided_100_checkins');
    return saved ? JSON.parse(saved) : {};
  });
  const [customMantra, setCustomMantra] = useState(() => {
    return localStorage.getItem('guided_100_mantra') || '';
  });
  const [showMantraInput, setShowMantraInput] = useState(false);

  // Persist
  useEffect(() => {
    if (startDate) localStorage.setItem('guided_100_start', startDate.toISOString());
  }, [startDate]);
  useEffect(() => {
    localStorage.setItem('guided_100_checkins', JSON.stringify(checkins));
  }, [checkins]);
  useEffect(() => {
    localStorage.setItem('guided_100_mantra', customMantra);
  }, [customMantra]);

  // Computed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDay = startDate
    ? Math.floor((today - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const currentWeek = Math.min(14, Math.ceil(currentDay / 7));
  const currentPhase = currentWeek > 0 ? CURRICULUM[Math.min(currentWeek - 1, 13)].phase : 0;
  const totalCheckins = Object.values(checkins).filter(Boolean).length;
  const progress = startDate ? Math.min(100, Math.round((totalCheckins / 100) * 100)) : 0;

  // Get date key for check-in
  const dateKey = (d) => d.toISOString().split('T')[0];
  const todayKey = dateKey(today);
  const isTodayChecked = !!checkins[todayKey];

  // Toggle today's check-in
  const toggleToday = () => {
    setCheckins(prev => ({
      ...prev,
      [todayKey]: !prev[todayKey],
    }));
  };

  // Start the program
  const handleStart = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setStartDate(now);
  };

  // Reset
  const handleReset = () => {
    if (window.confirm('Reset your 100 Days progress? This cannot be undone.')) {
      localStorage.removeItem('guided_100_start');
      localStorage.removeItem('guided_100_checkins');
      localStorage.removeItem('guided_100_mantra');
      setStartDate(null);
      setCheckins({});
      setCustomMantra('');
    }
  };

  const currentWeekData = currentWeek > 0 ? CURRICULUM[currentWeek - 1] : null;

  // ── Not Started View ──
  if (!startDate) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', animation: 'fadeIn 0.6s ease-out' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🧘</div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            100 Days of Practice
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
            A 14-week guided protocol. Wake up, sit, bow, inquire.
          </p>
        </div>

        {/* Phase Overview */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem' }}>
            The 4 Phases
          </p>
          {[1, 2, 3, 4].map(p => {
            const weeks = CURRICULUM.filter(c => c.phase === p);
            return (
              <div key={p} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: p < 4 ? '1px solid var(--glass-border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: PHASE_COLORS[p] }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {weeks[0].phaseName}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                    Weeks {weeks[0].week}–{weeks[weeks.length - 1].week}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: '1rem' }}>
                  {PHASE_DESCRIPTIONS[p]}
                </p>
              </div>
            );
          })}
        </div>

        <button onClick={handleStart} style={{
          width: '100%', padding: '1rem', borderRadius: 12,
          background: 'var(--accent-primary)', color: '#fff',
          fontSize: '1rem', fontWeight: 600, border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', transition: 'var(--transition-fast)',
        }}>
          Begin Day 1 →
        </button>
      </div>
    );
  }

  // ── Active View ──
  const isComplete = currentDay > 100;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>

      {/* ── Header / Progress ── */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.3rem' }}>
          {isComplete ? '✨ Complete' : `Day ${Math.min(currentDay, 100)} of 100`}
        </p>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          {isComplete ? 'You did it.' : currentWeekData?.title}
        </h2>

        {/* Progress bar */}
        <div style={{
          height: 6, borderRadius: 3,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden', marginBottom: '0.5rem',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${PHASE_COLORS[1]}, ${PHASE_COLORS[currentPhase || 1]})`,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          <span>{totalCheckins} days practiced</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* ── Today's Check-In ── */}
      {!isComplete && (
        <div className="glass-panel" style={{
          padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center',
          border: isTodayChecked ? '1px solid rgba(110,231,183,0.3)' : undefined,
        }}>
          <button onClick={toggleToday} style={{
            width: 64, height: 64, borderRadius: '50%',
            background: isTodayChecked ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
            border: isTodayChecked ? 'none' : '2px dashed var(--glass-border)',
            color: isTodayChecked ? '#fff' : 'var(--text-tertiary)',
            fontSize: '1.8rem', cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            {isTodayChecked ? '✓' : '○'}
          </button>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {isTodayChecked ? 'Practice complete for today' : 'Tap to mark today\'s practice'}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {currentWeekData?.title}
          </p>
        </div>
      )}

      {/* ── Mantra ── */}
      {currentWeekData && (
        <div className="glass-panel" style={{
          padding: '1.5rem', marginBottom: '1.5rem',
          borderLeft: `3px solid ${PHASE_COLORS[currentPhase]}`,
        }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.5rem' }}>
            Week {currentWeek} Mantra
          </p>
          {currentWeekData.mantra ? (
            <p style={{ fontSize: '1.15rem', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              "{currentWeekData.mantra}"
            </p>
          ) : (
            <div>
              {customMantra ? (
                <div>
                  <p style={{ fontSize: '1.15rem', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                    "{customMantra}"
                  </p>
                  <button onClick={() => setShowMantraInput(true)} style={{
                    background: 'none', border: 'none', color: 'var(--accent-primary)',
                    fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  }}>
                    Change mantra
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowMantraInput(true)} style={{
                  background: 'none', border: 'none', color: 'var(--accent-primary)',
                  fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}>
                  + Set your personal mantra
                </button>
              )}
              {showMantraInput && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    value={customMantra}
                    onChange={(e) => setCustomMantra(e.target.value)}
                    placeholder="Your mantra..."
                    autoFocus
                    style={{
                      flex: 1, padding: '8px 12px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 8, color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)', fontSize: '0.9rem',
                    }}
                  />
                  <button onClick={() => setShowMantraInput(false)} style={{
                    padding: '8px 16px', borderRadius: 8,
                    background: 'var(--accent-primary)', color: '#fff',
                    fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                  }}>
                    Save
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Week Timeline ── */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem' }}>
          This Week — Days {(currentWeek - 1) * 7 + 1}–{Math.min(currentWeek * 7, 100)}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {Array.from({ length: 7 }, (_, i) => {
            const day = (currentWeek - 1) * 7 + i + 1;
            if (day > 100) return null;
            const d = new Date(startDate);
            d.setDate(d.getDate() + day - 1);
            const key = dateKey(d);
            const done = !!checkins[key];
            const isToday = key === todayKey;
            const isPast = d < today;

            return (
              <div key={day} style={{
                textAlign: 'center', padding: '0.5rem 0',
                borderRadius: 8,
                background: isToday ? 'rgba(255,255,255,0.05)' : 'transparent',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  margin: '0 auto 0.25rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 600,
                  background: done ? PHASE_COLORS[currentPhase] : 'transparent',
                  color: done ? '#111' : (isPast ? 'var(--text-tertiary)' : 'var(--text-secondary)'),
                  border: isToday && !done ? '2px solid var(--accent-primary)' : (done ? 'none' : '1px solid var(--glass-border)'),
                }}>
                  {done ? '✓' : day}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Full Curriculum Overview ── */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem' }}>
          Full Curriculum
        </p>
        {CURRICULUM.map(w => {
          const isCurrentWeek = w.week === currentWeek;
          const isPastWeek = w.week < currentWeek;
          return (
            <div key={w.week} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 0',
              borderBottom: '1px solid var(--glass-border)',
              opacity: isPastWeek ? 0.5 : 1,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: isPastWeek ? PHASE_COLORS[w.phase] : (isCurrentWeek ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'),
                color: isPastWeek || isCurrentWeek ? '#111' : 'var(--text-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 600, flexShrink: 0,
              }}>
                {isPastWeek ? '✓' : w.week}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '0.85rem', fontWeight: isCurrentWeek ? 600 : 400,
                  color: isCurrentWeek ? 'var(--text-primary)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {w.title}
                </p>
              </div>
              <span style={{
                fontSize: '0.65rem', color: PHASE_COLORS[w.phase],
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0,
              }}>
                {w.phaseName}
              </span>
            </div>
          );
        })}
        {/* Wrap-up days */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.6rem 0',
          opacity: currentDay > 98 ? 1 : 0.5,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: isComplete ? '#fbbf24' : 'rgba(255,255,255,0.05)',
            color: isComplete ? '#111' : 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 600, flexShrink: 0,
          }}>
            {isComplete ? '★' : '∞'}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Days 99–100: Wrap-up & reflection
          </p>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ textAlign: 'center' }}>
        <button onClick={handleReset} style={{
          background: 'none', border: 'none',
          color: 'var(--text-tertiary)', fontSize: '0.8rem',
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>
          Reset progress
        </button>
      </div>
    </div>
  );
}

export default GuidedPractice;
