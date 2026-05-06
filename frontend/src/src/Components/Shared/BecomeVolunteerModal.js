// ============================================================
//  Shared "Become a Volunteer" modal
//  Used by DonorProfile and ReceiverProfile to add the Volunteer
//  role to an existing account. Captures the same fields the
//  Volunteer registration flow does (vehicle / plate / birthdate
//  / gender) since those columns are NOT NULL on the Volunteer
//  table.
// ============================================================

import React, { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';

const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Bicycle', 'Van', 'Truck', 'On Foot'];

const BecomeVolunteerModal = ({ open, onClose, userId, onSuccess }) => {
    const [form, setForm] = useState({
        vehicleType: '',
        plateNumber: '',
        birthdate: '',
        gender: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!open) return null;

    const handleChange = (e) =>
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async () => {
        setError('');
        if (!form.vehicleType || !form.plateNumber.trim() || !form.birthdate || !form.gender) {
            setError('All fields are required.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(
                `http://localhost:5000/api/become-volunteer/${userId}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form)
                }
            );
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to add Volunteer role.');
                return;
            }
            // Update localStorage so sidebars / future logic see the new role
            const stored = JSON.parse(localStorage.getItem('feedhope_user') || '{}');
            stored.roles = data.roles || [...(stored.roles || []), 'Volunteer'];
            localStorage.setItem('feedhope_user', JSON.stringify(stored));

            if (onSuccess) onSuccess(data.roles);
            // Reset form for next open
            setForm({ vehicleType: '', plateNumber: '', birthdate: '', gender: '' });
            onClose();
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setSubmitting(false);
        }
    };

    // Reuse the Donor profile modal classes — they already exist on every
    // page that imports DonorProfile.css / ReceiverProfile.css, but for the
    // Receiver page we fall back to inline styles below.
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, padding: 16
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: 12, width: 'min(480px, 100%)',
                    maxHeight: '92vh', overflowY: 'auto',
                    boxShadow: '0 20px 50px rgba(0,0,0,.25)'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderBottom: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8, background: '#fef3c7',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309'
                        }}>
                            <VolunteerActivismIcon style={{ fontSize: 18 }} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>Become a Volunteer</h3>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            background: '#f1f5f9', border: 'none', borderRadius: 8,
                            width: 30, height: 30, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <CloseIcon style={{ fontSize: 18, color: '#475569' }} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '18px 20px' }}>
                    <p style={{ margin: '0 0 14px 0', color: '#475569', fontSize: 14 }}>
                        Add the Volunteer role to your account so you can deliver food
                        to receivers. You'll be able to switch between roles from the
                        sidebar at any time.
                    </p>

                    <Field label="Vehicle Type">
                        <select
                            name="vehicleType"
                            value={form.vehicleType}
                            onChange={handleChange}
                            style={inputStyle}
                        >
                            <option value="">Select vehicle…</option>
                            {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </Field>

                    <Field label="Plate Number">
                        <input
                            type="text"
                            name="plateNumber"
                            value={form.plateNumber}
                            onChange={handleChange}
                            placeholder="e.g. 123456 / B-1234"
                            style={inputStyle}
                        />
                    </Field>

                    <Field label="Birthdate">
                        <input
                            type="date"
                            name="birthdate"
                            value={form.birthdate}
                            onChange={handleChange}
                            max={new Date().toISOString().slice(0, 10)}
                            style={inputStyle}
                        />
                    </Field>

                    <Field label="Gender">
                        <select
                            name="gender"
                            value={form.gender}
                            onChange={handleChange}
                            style={inputStyle}
                        >
                            <option value="">Select gender…</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </Field>

                    {error && (
                        <p style={{ color: '#dc2626', fontSize: 13, margin: '4px 0 0 0' }}>
                            {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 20px', borderTop: '1px solid #e2e8f0',
                    display: 'flex', gap: 10, justifyContent: 'flex-end',
                    background: '#f8fafc'
                }}>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            background: '#f1f5f9', color: '#475569', border: 'none',
                            padding: '8px 16px', borderRadius: 8, fontWeight: 600,
                            cursor: submitting ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        style={{
                            background: '#f97316', color: '#fff', border: 'none',
                            padding: '8px 16px', borderRadius: 8, fontWeight: 600,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1
                        }}
                    >
                        {submitting ? 'Adding…' : 'Add Volunteer Role'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Field = ({ label, children }) => (
    <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        <span style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</span>
        {children}
    </label>
);

const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    color: '#1f2937',
    background: '#fff',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
};

export default BecomeVolunteerModal;
