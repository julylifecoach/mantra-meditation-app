import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProgramAdmin() {
    const navigate = useNavigate();
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit/Create modal
    const [editingProgram, setEditingProgram] = useState(null); // null = closed, {} = new, {...} = editing
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    // Enrollment panel
    const [enrollmentProgram, setEnrollmentProgram] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
    const [enrollEmail, setEnrollEmail] = useState('');
    const [enrollError, setEnrollError] = useState('');

    const token = localStorage.getItem('aura_token');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    useEffect(() => { fetchPrograms(); }, []);

    const fetchPrograms = async () => {
        try {
            const res = await fetch('/api/programs/admin/all', { headers });
            if (!res.ok) throw new Error('Access denied');
            setPrograms(await res.json());
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    // === Create / Edit ===
    const openCreate = () => {
        setEditingProgram({});
        setFormData({ slug: '', title: '', description: '', materials: '', playlistId: '', includedForBizCoach: true, isPublic: false, startDate: '' });
        setFormError('');
    };

    const openEdit = (program) => {
        setEditingProgram(program);
        setFormData({
            title: program.title,
            description: program.description || '',
            materials: program.materials || '',
            playlistId: program.playlistId || '',
            includedForBizCoach: program.includedForBizCoach,
            isPublic: program.isPublic,
            startDate: program.startDate ? program.startDate.split('T')[0] : '',
        });
        setFormError('');
    };

    const handleSave = async () => {
        setSaving(true);
        setFormError('');
        try {
            const isNew = !editingProgram.id;
            const url = isNew ? '/api/programs' : `/api/programs/${editingProgram.id}`;
            const method = isNew ? 'POST' : 'PUT';
            const body = { ...formData };
            if (isNew) body.slug = formData.slug;
            if (body.startDate === '') body.startDate = null;

            const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) { setFormError(data.error || 'Save failed'); return; }

            if (isNew) {
                setPrograms([{ ...data, _count: { enrollments: 0 } }, ...programs]);
            } else {
                setPrograms(programs.map(p => p.id === data.id ? { ...p, ...data } : p));
            }
            setEditingProgram(null);
        } catch (e) { setFormError('Network error'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (program) => {
        if (!confirm(`Deactivate "${program.title}"?`)) return;
        await fetch(`/api/programs/${program.id}`, { method: 'DELETE', headers });
        setPrograms(programs.map(p => p.id === program.id ? { ...p, active: false } : p));
    };

    const handleReactivate = async (program) => {
        await fetch(`/api/programs/${program.id}`, { method: 'PUT', headers, body: JSON.stringify({ active: true }) });
        setPrograms(programs.map(p => p.id === program.id ? { ...p, active: true } : p));
    };

    // === Enrollments ===
    const openEnrollments = async (program) => {
        setEnrollmentProgram(program);
        setEnrollmentsLoading(true);
        setEnrollError('');
        try {
            const res = await fetch(`/api/programs/${program.id}/enrollments`, { headers });
            setEnrollments(await res.json());
        } catch (e) { console.error(e); }
        finally { setEnrollmentsLoading(false); }
    };

    const handleEnroll = async () => {
        if (!enrollEmail.trim()) return;
        setEnrollError('');
        try {
            const res = await fetch(`/api/programs/${enrollmentProgram.id}/enroll`, {
                method: 'POST', headers, body: JSON.stringify({ email: enrollEmail.trim() })
            });
            const data = await res.json();
            if (!res.ok) { setEnrollError(data.error || 'Failed'); return; }
            setEnrollments([data, ...enrollments]);
            setEnrollEmail('');
            // Update count
            setPrograms(programs.map(p => p.id === enrollmentProgram.id
                ? { ...p, _count: { ...p._count, enrollments: (p._count?.enrollments || 0) + 1 } } : p));
        } catch (e) { setEnrollError('Network error'); }
    };

    const handleUnenroll = async (enrollment) => {
        await fetch(`/api/programs/${enrollmentProgram.id}/enroll/${enrollment.userId}`, { method: 'DELETE', headers });
        setEnrollments(enrollments.filter(e => e.id !== enrollment.id));
        setPrograms(programs.map(p => p.id === enrollmentProgram.id
            ? { ...p, _count: { ...p._count, enrollments: Math.max(0, (p._count?.enrollments || 1) - 1) } } : p));
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Loading...</div>;
    if (error) return <div style={{ textAlign: 'center', marginTop: '5rem', color: '#ef4444' }}>{error}</div>;

    const inputStyle = {
        width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.3)',
        border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)', fontSize: '0.9rem', boxSizing: 'border-box',
    };

    return (
        <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', paddingBottom: '6rem' }}>
            <header style={{ marginBottom: '2rem', animation: 'fadeIn 0.6s ease-out', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', padding: 0, marginBottom: '0.5rem' }}>← Admin Panel</button>
                    <h2 style={{ fontSize: '2rem' }}>Programs</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{programs.filter(p => p.active).length} active programs</p>
                </div>
                <button onClick={openCreate} style={{
                    padding: '0.6rem 1.25rem', borderRadius: '10px',
                    background: 'var(--accent-primary)', color: '#fff', border: 'none',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.9rem',
                }}>+ New Program</button>
            </header>

            {/* Program List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {programs.map((prog, i) => (
                    <div key={prog.id} className="glass-panel" style={{
                        padding: '1.25rem 1.5rem', opacity: prog.active ? 1 : 0.5,
                        animation: `fadeIn 0.4s ease-out ${i * 0.05}s both`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>
                                    {prog.title}
                                    {!prog.active && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(inactive)</span>}
                                </h3>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                    /{prog.slug} • {prog._count?.enrollments || 0} enrolled
                                    {prog.includedForBizCoach && <span style={{ color: 'var(--accent-primary)', marginLeft: '0.5rem' }}>• BizCoach</span>}
                                    {prog.isPublic && <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>• Public</span>}
                                    {prog.playlistId && <span style={{ marginLeft: '0.5rem' }}>• 📹</span>}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button onClick={() => openEnrollments(prog)} style={{ ...smallBtn, background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>Enrollments</button>
                                <button onClick={() => openEdit(prog)} style={{ ...smallBtn, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>Edit</button>
                                {prog.active ? (
                                    <button onClick={() => handleDelete(prog)} style={{ ...smallBtn, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>Deactivate</button>
                                ) : (
                                    <button onClick={() => handleReactivate(prog)} style={{ ...smallBtn, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>Reactivate</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {programs.length === 0 && (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-tertiary)' }}>No programs yet. Create your first one above.</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {editingProgram !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1rem', overflowY: 'auto' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', animation: 'fadeIn 0.2s ease-out' }}>
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>{editingProgram.id ? 'Edit Program' : 'New Program'}</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {!editingProgram.id && (
                                <div>
                                    <label style={labelStyle}>Slug</label>
                                    <input value={formData.slug || ''} onChange={e => setFormData({ ...formData, slug: e.target.value })} placeholder="e.g. may-you-offer" style={inputStyle} />
                                </div>
                            )}
                            <div>
                                <label style={labelStyle}>Title</label>
                                <input value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Program title" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Description</label>
                                <input value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Short summary" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>YouTube Playlist ID</label>
                                <input value={formData.playlistId || ''} onChange={e => setFormData({ ...formData, playlistId: e.target.value })} placeholder="PLuKh..." style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Start Date</label>
                                <input type="date" value={formData.startDate || ''} onChange={e => setFormData({ ...formData, startDate: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Materials (Markdown)</label>
                                <textarea value={formData.materials || ''} onChange={e => setFormData({ ...formData, materials: e.target.value })} rows={10} placeholder="# Week 1&#10;&#10;## Introduction&#10;&#10;- Item one&#10;- Item two" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={formData.includedForBizCoach || false} onChange={e => setFormData({ ...formData, includedForBizCoach: e.target.checked })} />
                                    Included for BizCoach
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={formData.isPublic || false} onChange={e => setFormData({ ...formData, isPublic: e.target.checked })} />
                                    Public
                                </label>
                            </div>
                        </div>

                        {formError && <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '1rem' }}>{formError}</p>}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button onClick={() => setEditingProgram(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
                            <button onClick={handleSave} disabled={saving} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: saving ? 'wait' : 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enrollment Modal */}
            {enrollmentProgram && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1rem', overflowY: 'auto' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', animation: 'fadeIn 0.2s ease-out' }}>
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>{enrollmentProgram.title}</h3>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Manage Enrollments</p>

                        {/* Add User */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <input value={enrollEmail} onChange={e => setEnrollEmail(e.target.value)} placeholder="user@email.com" style={{ ...inputStyle, flex: 1 }}
                                onKeyDown={e => e.key === 'Enter' && handleEnroll()} />
                            <button onClick={handleEnroll} style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, whiteSpace: 'nowrap' }}>Add</button>
                        </div>
                        {enrollError && <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{enrollError}</p>}

                        {/* Enrolled Users List */}
                        {enrollmentsLoading ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
                        ) : enrollments.length === 0 ? (
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No users enrolled yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {enrollments.map(e => (
                                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                        <div>
                                            <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{e.user.displayName || e.user.email}</span>
                                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{e.user.email}</span>
                                        </div>
                                        <button onClick={() => handleUnenroll(e)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-sans)' }}>Remove</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button onClick={() => { setEnrollmentProgram(null); setEnrollments([]); setEnrollEmail(''); setEnrollError(''); }} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const labelStyle = {
    display: 'block', color: 'var(--text-tertiary)', fontSize: '0.8rem',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem',
};

const smallBtn = {
    padding: '0.35rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 500,
    transition: 'var(--transition-fast)',
};
