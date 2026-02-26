import React, { useState, useEffect } from 'react';

export default function CalendarTrack() {
    const [history, setHistory] = useState([]);
    const [publicBoard, setPublicBoard] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        // Load personal history
        const local = localStorage.getItem('aura_reflections');
        if (local) {
            setHistory(JSON.parse(local));
        }

        // Load public board to simulate fetching others' reflections for that day
        const fetchPublic = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/reflections/public');
                if (res.ok) {
                    const data = await res.json();
                    setPublicBoard(data);
                } else {
                    const localPub = localStorage.getItem('aura_public');
                    if (localPub) setPublicBoard(JSON.parse(localPub));
                }
            } catch (e) {
                const localPub = localStorage.getItem('aura_public');
                if (localPub) setPublicBoard(JSON.parse(localPub));
            }
        };
        fetchPublic();
    }, []);

    const generateCalendarDays = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = new Date(year, month, i).toISOString().split('T')[0];
            const hasMeditated = history.some(entry => entry.date && entry.date.startsWith(dateStr));
            days.push({ day: i, dateStr, hasMeditated });
        }
        return days;
    };

    const days = generateCalendarDays();

    // Filters for selected date
    const myReflection = history.find(entry => entry.date && entry.date.startsWith(selectedDate));
    const othersReflections = publicBoard.filter(entry => entry.date && entry.date.startsWith(selectedDate)); // Use date as fallback for createdAt in mock

    // Parse the date nicely for display
    const formattedDate = new Date(selectedDate + "T12:00:00").toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>

            {/* Left Column: Calendar */}
            <div style={{ flex: '1 1 300px' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Track</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Your consistency creates calm.</p>
                </header>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                            <div key={d} style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600 }}>{d}</div>
                        ))}

                        {/* Empty slots for start of month - Simplified for prototype */}
                        {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} />
                        ))}

                        {days.map((d) => (
                            <div
                                key={d.day}
                                onClick={() => setSelectedDate(d.dateStr)}
                                style={{
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    background: d.dateStr === selectedDate ? 'var(--accent-primary)' : (d.hasMeditated ? 'rgba(139, 92, 246, 0.2)' : 'transparent'),
                                    color: d.dateStr === selectedDate ? '#fff' : (d.hasMeditated ? 'var(--accent-secondary)' : 'var(--text-secondary)'),
                                    transition: 'var(--transition-fast)',
                                    fontWeight: d.hasMeditated ? 600 : 400,
                                    border: d.hasMeditated && d.dateStr !== selectedDate ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent'
                                }}
                            >
                                {d.day}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Reflections details */}
            <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--accent-secondary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                    {formattedDate}
                </h3>

                {/* My Reflection */}
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(139, 92, 246, 0.05)', borderLeft: '4px solid var(--accent-primary)' }}>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Journey</h4>
                    {myReflection ? (
                        <>
                            {myReflection.mantra && (
                                <p style={{ color: 'var(--accent-glow)', fontStyle: 'italic', marginBottom: '1rem', fontSize: '1.1rem' }}>
                                    "{myReflection.mantra}"
                                </p>
                            )}
                            <p style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{myReflection.content}</p>
                        </>
                    ) : (
                        <p style={{ color: 'var(--text-tertiary)' }}>You did not meditate on this day.</p>
                    )}
                </div>

                {/* Others Reflections */}
                <div>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Community Echoes</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {othersReflections.length > 0 ? (
                            othersReflections.map((entry, idx) => (
                                <div key={idx} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                                    <p style={{ color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '0.5rem', fontSize: '0.95rem' }}>"{entry.content}"</p>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>- {entry.user?.displayName || 'Anonymous'}</span>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: 'var(--text-tertiary)' }}>No community reflections for this day.</p>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
