// ============================================================
//  FeedHope — Omar & Hanan — Pages/Admin/AdminProfile.js
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import '../../Styles/Admin/AdminProfile.css';

// ── MUI Icons ────────────────────────────────────────────────
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EmailIcon         from '@mui/icons-material/Email';
import PhoneIcon         from '@mui/icons-material/Phone';
import EventIcon         from '@mui/icons-material/Event';
import LockIcon          from '@mui/icons-material/Lock';
import CloseIcon         from '@mui/icons-material/Close';
import PersonIcon        from '@mui/icons-material/Person';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

// ── Backend base URL ─────────────────────────────────────────
const BACKEND_URL = 'http://localhost:5000';

// ── Helpers ──────────────────────────────────────────────────
const getImageUrl = (picPath) => {
    if (!picPath) return null;
    if (picPath.startsWith('http')) return picPath;
    const clean = picPath.startsWith('/') ? picPath.slice(1) : picPath;
    return `${BACKEND_URL}/${clean}`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
};

const todayFormatted = () =>
    new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

// ── Main Component ────────────────────────────────────────────
const AdminProfile = () => {
    const navigate = useNavigate();

    const storedUser  = JSON.parse(localStorage.getItem('feedhope_user') || '{}');
    const userId      = storedUser.user_id  ?? null;
    const adminId     = storedUser.admin_id ?? null;

    const [profile,    setProfile]    = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState(null);

    const [showPwdModal, setShowPwdModal] = useState(false);
    const [pwdForm,      setPwdForm]      = useState({ current: '', newPwd: '', confirm: '' });
    const [pwdLoading,   setPwdLoading]   = useState(false);

    const [picLoading, setPicLoading] = useState(false);
    const [toast,      setToast]      = useState(null);

    // ── Eye toggle state ──────────────────────────────────────
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw,     setShowNewPw]     = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!userId) { navigate('/signin'); return; }
        fetchProfile();
    }, [userId]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const res  = await fetch(`${BACKEND_URL}/api/admin/profile/${userId}`);
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to load profile.'); return; }
            setProfile(data.profile);
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleUploadPicture = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('profilePicture', file);
        try {
            setPicLoading(true);
            const res  = await fetch(`${BACKEND_URL}/api/admin/upload-profile-picture/${userId}`, {
                method: 'POST',
                body:   formData,
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Upload failed.', 'error'); return; }
            setProfile(prev => ({ ...prev, profile_picture: data.profile_picture }));
            localStorage.setItem('feedhope_user', JSON.stringify({
                ...storedUser,
                profile_picture: data.profile_picture,
            }));
            window.dispatchEvent(new Event('notification-read'));
            showToast('Profile picture updated successfully!');
        } catch {
            showToast('Server error. Please try again.', 'error');
        } finally {
            setPicLoading(false);
            e.target.value = '';
        }
    };

    const handleDeletePicture = async () => {
        if (!profile?.profile_picture) return;
        try {
            setPicLoading(true);
            const res  = await fetch(`${BACKEND_URL}/api/admin/delete-profile-picture/${userId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Failed to delete picture.', 'error'); return; }
            setProfile(prev => ({ ...prev, profile_picture: null }));
            localStorage.setItem('feedhope_user', JSON.stringify({
                ...storedUser,
                profile_picture: null,
            }));
            window.dispatchEvent(new Event('notification-read'));
            showToast('Profile picture removed.');
        } catch {
            showToast('Server error. Please try again.', 'error');
        } finally {
            setPicLoading(false);
        }
    };

    const handleChangePassword = async () => {
        const { current, newPwd, confirm } = pwdForm;
        if (!current.trim())  return showToast('Please enter your current password.', 'error');
        if (!newPwd.trim())   return showToast('Please enter a new password.', 'error');
        if (newPwd.length < 3 || newPwd.length > 10)
            return showToast('New password must be 3–10 characters.', 'error');
        if (newPwd !== confirm)
            return showToast('New passwords do not match.', 'error');

        try {
            setPwdLoading(true);
            const res  = await fetch(`${BACKEND_URL}/api/admin/change-password/${userId}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ currentPassword: current, newPassword: newPwd }),
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Password change failed.', 'error'); return; }
            window.dispatchEvent(new Event('notification-read'));
            showToast('Password changed successfully!');
            setShowPwdModal(false);
            setPwdForm({ current: '', newPwd: '', confirm: '' });
            setShowCurrentPw(false);
            setShowNewPw(false);
            setShowConfirmPw(false);
        } catch {
            showToast('Server error. Please try again.', 'error');
        } finally {
            setPwdLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    const renderAvatar = (size = 'md') => {
        const picUrl = getImageUrl(profile?.profile_picture);
        const letter = (profile?.name || 'A').charAt(0).toUpperCase();
        const cls    = `ap-avatar ap-avatar--${size}`;
        if (picUrl) return <img src={picUrl} alt="Admin avatar" className={cls} />;
        return <div className={`${cls} ap-avatar--initial`}>{letter}</div>;
    };

    return (
        <div className="ap-layout">
            <AdminSidebar onLogout={handleLogout} />

            <main className="ap-main">
                <div className="ap-content-wrapper">

                    {/* ── BANNER ── */}
                    <div className="ap-banner">
                        <div className="ap-banner-left">
                            <div className="ap-banner-text">
                                <h1 className="ap-banner-title">My Profile</h1>
                                <p className="ap-banner-subtitle">
                                    View your account details and change your password
                                </p>
                            </div>
                            <div className="ap-banner-date">
                                <CalendarTodayIcon sx={{ fontSize: 15 }} />
                                {todayFormatted()}
                            </div>
                        </div>

                        <div className="ap-banner-right">
                            <div className="ap-banner-avatar-wrap">
                                {loading ? (
                                    <div className="ap-avatar ap-avatar--banner ap-avatar--initial ap-avatar--skeleton">
                                        <PersonIcon sx={{ fontSize: 40, opacity: 0.4 }} />
                                    </div>
                                ) : (
                                    renderAvatar('banner')
                                )}
                            </div>

                            {!loading && (
                                <div className="ap-banner-pic-btns">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleUploadPicture}
                                    />
                                    <button
                                        className="ap-pic-btn ap-pic-btn--change"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={picLoading}
                                    >
                                        {picLoading ? 'Uploading…' : 'Change Profile Picture'}
                                    </button>
                                    {profile?.profile_picture && (
                                        <button
                                            className="ap-pic-btn ap-pic-btn--delete"
                                            onClick={handleDeletePicture}
                                            disabled={picLoading}
                                        >
                                            Delete Profile Picture
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Loading / Error ── */}
                    {loading && <div className="ap-loading">Loading profile…</div>}
                    {error && !loading && (
                        <div className="ap-error">
                            {error}
                            <button className="ap-retry-btn" onClick={fetchProfile}>Retry</button>
                        </div>
                    )}

                    {/* ── PROFILE CARD ── */}
                    {!loading && !error && profile && (
                        <div className="ap-card">
                            <div className="ap-card-identity">
                                {renderAvatar('lg')}
                                <div className="ap-card-identity-text">
                                    <h2 className="ap-card-name">{profile.name || 'System Admin'}</h2>
                                    <span className="ap-role-badge">Admin</span>
                                </div>
                            </div>

                            <div className="ap-card-divider" />

                            <div className="ap-detail-grid">
                                <div className="ap-detail-row">
                                    <span className="ap-detail-label">
                                        <EmailIcon sx={{ fontSize: 15 }} /> Email
                                    </span>
                                    <strong className="ap-detail-value">{profile.email || '—'}</strong>
                                </div>
                                <div className="ap-detail-row">
                                    <span className="ap-detail-label">
                                        <PhoneIcon sx={{ fontSize: 15 }} /> Phone Number
                                    </span>
                                    <strong className="ap-detail-value">{profile.phone_number || '—'}</strong>
                                </div>
                                <div className="ap-detail-row">
                                    <span className="ap-detail-label">
                                        <EventIcon sx={{ fontSize: 15 }} /> Joined At
                                    </span>
                                    <strong className="ap-detail-value">{formatDate(profile.joined_date)}</strong>
                                </div>
                            </div>

                            <div className="ap-card-divider" />

                            <div className="ap-card-footer">
                                <button className="ap-btn-change-pwd" onClick={() => setShowPwdModal(true)}>
                                    <LockIcon sx={{ fontSize: 16 }} /> Change Password
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ── CHANGE PASSWORD MODAL ── */}
            {showPwdModal && (
                <div className="ap-modal-backdrop" onClick={() => setShowPwdModal(false)}>
                    <div className="ap-modal" onClick={e => e.stopPropagation()}>

                        <div className="ap-modal-header">
                            <div className="ap-modal-header-icon">
                                <LockIcon sx={{ fontSize: 18 }} />
                            </div>
                            <h2 className="ap-modal-title">Change Password</h2>
                            <button
                                className="ap-modal-close"
                                onClick={() => {
                                    setShowPwdModal(false);
                                    setPwdForm({ current: '', newPwd: '', confirm: '' });
                                    setShowCurrentPw(false);
                                    setShowNewPw(false);
                                    setShowConfirmPw(false);
                                }}
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>

                        <div className="ap-modal-body">

                            <div className="ap-form-group">
                                <label className="ap-label">Current Password</label>
                                <div className="ap-password-wrapper">
                                    <input
                                        className="ap-input ap-pw-input"
                                        type={showCurrentPw ? 'text' : 'password'}
                                        placeholder="Enter current password"
                                        value={pwdForm.current}
                                        onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))}
                                    />
                                    <button
                                        type="button"
                                        className="ap-eye-btn"
                                        tabIndex={-1}
                                        onClick={() => setShowCurrentPw(p => !p)}
                                    >
                                        {showCurrentPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                    </button>
                                </div>
                            </div>

                            <div className="ap-form-group">
                                <label className="ap-label">New Password</label>
                                <div className="ap-password-wrapper">
                                    <input
                                        className="ap-input ap-pw-input"
                                        type={showNewPw ? 'text' : 'password'}
                                        placeholder="Enter new password (3–10 characters)"
                                        value={pwdForm.newPwd}
                                        onChange={e => setPwdForm(f => ({ ...f, newPwd: e.target.value }))}
                                    />
                                    <button
                                        type="button"
                                        className="ap-eye-btn"
                                        tabIndex={-1}
                                        onClick={() => setShowNewPw(p => !p)}
                                    >
                                        {showNewPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                    </button>
                                </div>
                            </div>

                            <div className="ap-form-group">
                                <label className="ap-label">Confirm New Password</label>
                                <div className="ap-password-wrapper">
                                    <input
                                        className="ap-input ap-pw-input"
                                        type={showConfirmPw ? 'text' : 'password'}
                                        placeholder="Repeat new password"
                                        value={pwdForm.confirm}
                                        onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
                                    />
                                    <button
                                        type="button"
                                        className="ap-eye-btn"
                                        tabIndex={-1}
                                        onClick={() => setShowConfirmPw(p => !p)}
                                    >
                                        {showConfirmPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                    </button>
                                </div>
                            </div>

                            <div className="ap-modal-actions">
                                <button
                                    className="ap-btn-cancel"
                                    onClick={() => {
                                        setShowPwdModal(false);
                                        setPwdForm({ current: '', newPwd: '', confirm: '' });
                                        setShowCurrentPw(false);
                                        setShowNewPw(false);
                                        setShowConfirmPw(false);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="ap-btn-confirm"
                                    onClick={handleChangePassword}
                                    disabled={pwdLoading}
                                >
                                    {pwdLoading ? 'Updating…' : 'Update Password'}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {toast && (
                <div className={`ap-toast ap-toast--${toast.type}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default AdminProfile;
