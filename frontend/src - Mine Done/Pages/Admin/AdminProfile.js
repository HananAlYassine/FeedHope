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

// ── Backend base URL ─────────────────────────────────────────
const BACKEND_URL = 'http://localhost:5000';

// ── Helpers ──────────────────────────────────────────────────

// Convert a relative image path like "/uploads/abc.jpg" to a full URL
const getImageUrl = (picPath) => {
    if (!picPath) return null;
    if (picPath.startsWith('http')) return picPath;
    const clean = picPath.startsWith('/') ? picPath.slice(1) : picPath;
    return `${BACKEND_URL}/${clean}`;
};

// Format "2026-04-11T00:00:00.000Z" → "11 Apr 2026"
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
};

// Format today's date as "Saturday, 19 April 2026"
const todayFormatted = () =>
    new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

// ── Main Component ────────────────────────────────────────────
const AdminProfile = () => {
    const navigate = useNavigate();

    // ── Read the logged-in admin from localStorage ────────────
    // The signin route saves the user object here after a successful login.
    const storedUser  = JSON.parse(localStorage.getItem('feedhope_user') || '{}');
    const userId      = storedUser.user_id  ?? null; // user_id in the User table
    const adminId     = storedUser.admin_id ?? null; // admin_id in the Admin table

    // ── State: profile data loaded from the server ────────────
    const [profile,       setProfile]       = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);

    // ── State: change-password modal ──────────────────────────
    const [showPwdModal,  setShowPwdModal]  = useState(false);
    const [pwdForm,       setPwdForm]       = useState({
        current: '', newPwd: '', confirm: '',
    });
    const [pwdLoading,    setPwdLoading]    = useState(false);

    // ── State: picture upload loading ─────────────────────────
    const [picLoading,    setPicLoading]    = useState(false);

    // ── State: toast (success / error pop-up at bottom-right) ─
    const [toast,         setToast]         = useState(null);

    // ── Hidden file input ref (triggered by "Change Picture" button) ──
    const fileInputRef = useRef(null);

    // ── Fetch admin profile from the backend on mount ─────────
    useEffect(() => {
        if (!userId) {
            // No user in localStorage → not logged in, redirect to sign-in
            navigate('/signin');
            return;
        }
        fetchProfile();
    }, [userId]);

    // ─────────────────────────────────────────────────────────
    //  fetchProfile — GET /api/admin/profile/:userId
    //  Loads the admin's name, email, phone, picture, joined date
    // ─────────────────────────────────────────────────────────
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

    // ── Toast helper: show a message then auto-hide after 3.5s ──
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ─────────────────────────────────────────────────────────
    //  handleUploadPicture
    //  Called when the admin picks a file using the hidden input.
    //  Sends the image to POST /api/admin/upload-profile-picture/:userId
    // ─────────────────────────────────────────────────────────
    const handleUploadPicture = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Build a FormData object — multer on the backend expects multipart/form-data
        const formData = new FormData();
        formData.append('profilePicture', file);

        try {
            setPicLoading(true);
            const res  = await fetch(`${BACKEND_URL}/api/admin/upload-profile-picture/${userId}`, {
                method: 'POST',
                body:   formData, // no Content-Type header needed — browser sets it with boundary
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Upload failed.', 'error'); return; }

            // Update local profile state so the new picture shows immediately without a reload
            setProfile(prev => ({ ...prev, profile_picture: data.profile_picture }));

            // Also update localStorage so the rest of the app stays in sync
            localStorage.setItem('feedhope_user', JSON.stringify({
                ...storedUser,
                profile_picture: data.profile_picture,
            }));

            showToast('Profile picture updated successfully!');
        } catch {
            showToast('Server error. Please try again.', 'error');
        } finally {
            setPicLoading(false);
            // Reset the file input so picking the same file again triggers onChange
            e.target.value = '';
        }
    };

    // ─────────────────────────────────────────────────────────
    //  handleDeletePicture
    //  Calls DELETE /api/admin/delete-profile-picture/:userId
    //  Removes the image file from disk and sets profile_picture = NULL in the DB
    // ─────────────────────────────────────────────────────────
    const handleDeletePicture = async () => {
        if (!profile?.profile_picture) return; // nothing to delete

        try {
            setPicLoading(true);
            const res  = await fetch(`${BACKEND_URL}/api/admin/delete-profile-picture/${userId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Failed to delete picture.', 'error'); return; }

            // Clear the picture from local state and localStorage
            setProfile(prev => ({ ...prev, profile_picture: null }));
            localStorage.setItem('feedhope_user', JSON.stringify({
                ...storedUser,
                profile_picture: null,
            }));

            showToast('Profile picture removed.');
        } catch {
            showToast('Server error. Please try again.', 'error');
        } finally {
            setPicLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────
    //  handleChangePassword
    //  Validates locally, then calls PUT /api/admin/change-password/:userId
    //  The backend verifies currentPassword with bcrypt, then hashes and stores the new one.
    // ─────────────────────────────────────────────────────────
    const handleChangePassword = async () => {
        const { current, newPwd, confirm } = pwdForm;

        // ── Client-side validation ──
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

            showToast('Password changed successfully!');
            setShowPwdModal(false);
            // Reset the form fields
            setPwdForm({ current: '', newPwd: '', confirm: '' });
        } catch {
            showToast('Server error. Please try again.', 'error');
        } finally {
            setPwdLoading(false);
        }
    };

    // ── Logout: clear localStorage and go to sign-in ─────────
    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // ── Avatar: show image or first letter of name ────────────
    // This is reused in both the banner and the info card below it.
    const renderAvatar = (size = 'md') => {
        const picUrl = getImageUrl(profile?.profile_picture);
        const letter = (profile?.name || 'A').charAt(0).toUpperCase();
        const cls    = `ap-avatar ap-avatar--${size}`;

        if (picUrl) {
            return <img src={picUrl} alt="Admin avatar" className={cls} />;
        }
        return (
            <div className={`${cls} ap-avatar--initial`}>
                {letter}
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────
    //  RENDER
    // ─────────────────────────────────────────────────────────
    return (
        <div className="ap-layout">
            {/* Sidebar — same component used across all admin pages */}
            <AdminSidebar onLogout={handleLogout} />

            <main className="ap-main">
                <div className="ap-content-wrapper">

                    {/* ══ BANNER ══════════════════════════════════════════════
                        Contains: title, subtitle, today's date on the right,
                        and the admin's avatar with picture action buttons.
                    ══════════════════════════════════════════════════════════ */}
                    <div className="ap-banner">

                        {/* Left side: text info */}
                        <div className="ap-banner-left">
                            <div className="ap-banner-text">
                                <h1 className="ap-banner-title">My Profile</h1>
                                <p className="ap-banner-subtitle">
                                    View your account details and change your password
                                </p>
                            </div>
                            {/* Today's date badge */}
                            <div className="ap-banner-date">
                                <CalendarTodayIcon sx={{ fontSize: 15 }} />
                                {todayFormatted()}
                            </div>
                        </div>

                        {/* Right side: avatar circle + picture buttons */}
                        <div className="ap-banner-right">
                            {/* Avatar in the banner — large circle */}
                            <div className="ap-banner-avatar-wrap">
                                {loading ? (
                                    // Placeholder while data loads
                                    <div className="ap-avatar ap-avatar--banner ap-avatar--initial ap-avatar--skeleton">
                                        <PersonIcon sx={{ fontSize: 40, opacity: 0.4 }} />
                                    </div>
                                ) : (
                                    renderAvatar('banner')
                                )}
                            </div>

                            {/* Picture action buttons — only show when profile is loaded */}
                            {!loading && (
                                <div className="ap-banner-pic-btns">
                                    {/* Hidden file input — triggered by the blue button below */}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleUploadPicture}
                                    />
                                    {/* Blue button: opens the file picker */}
                                    <button
                                        className="ap-pic-btn ap-pic-btn--change"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={picLoading}
                                    >
                                        {picLoading ? 'Uploading…' : 'Change Profile Picture'}
                                    </button>

                                    {/* Red button: only shown if the admin has a picture to delete */}
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

                    {/* ── Loading / Error states ── */}
                    {loading && (
                        <div className="ap-loading">Loading profile…</div>
                    )}
                    {error && !loading && (
                        <div className="ap-error">
                            {error}
                            <button className="ap-retry-btn" onClick={fetchProfile}>Retry</button>
                        </div>
                    )}

                    {/* ══ PROFILE CARD ════════════════════════════════════════
                        Shown only once loading is done and no error occurred.
                        Contains: avatar, name, role badge, detail rows, and
                        the Change Password button.
                    ══════════════════════════════════════════════════════════ */}
                    {!loading && !error && profile && (
                        <div className="ap-card">

                            {/* ── Top section: avatar + name + role ── */}
                            <div className="ap-card-identity">
                                {/* Medium avatar in the card */}
                                {renderAvatar('lg')}

                                <div className="ap-card-identity-text">
                                    {/* Name — fallback to "System Admin" if blank */}
                                    <h2 className="ap-card-name">
                                        {profile.name || 'System Admin'}
                                    </h2>
                                    {/* Role badge — always "Admin" in blue */}
                                    <span className="ap-role-badge">Admin</span>
                                </div>
                            </div>

                            {/* Divider line between identity and details */}
                            <div className="ap-card-divider" />

                            {/* ── Detail rows: email, phone, joined date ── */}
                            <div className="ap-detail-grid">

                                <div className="ap-detail-row">
                                    <span className="ap-detail-label">
                                        <EmailIcon sx={{ fontSize: 15 }} />
                                        Email
                                    </span>
                                    <strong className="ap-detail-value">
                                        {profile.email || '—'}
                                    </strong>
                                </div>

                                <div className="ap-detail-row">
                                    <span className="ap-detail-label">
                                        <PhoneIcon sx={{ fontSize: 15 }} />
                                        Phone Number
                                    </span>
                                    <strong className="ap-detail-value">
                                        {profile.phone_number || '—'}
                                    </strong>
                                </div>

                                <div className="ap-detail-row">
                                    <span className="ap-detail-label">
                                        <EventIcon sx={{ fontSize: 15 }} />
                                        Joined At
                                    </span>
                                    <strong className="ap-detail-value">
                                        {formatDate(profile.joined_date)}
                                    </strong>
                                </div>

                            </div>

                            {/* Divider before the Change Password button */}
                            <div className="ap-card-divider" />

                            {/* ── Change Password button ── */}
                            <div className="ap-card-footer">
                                <button
                                    className="ap-btn-change-pwd"
                                    onClick={() => setShowPwdModal(true)}
                                >
                                    <LockIcon sx={{ fontSize: 16 }} />
                                    Change Password
                                </button>
                            </div>

                        </div>
                    )}
                </div>
            </main>

            {/* ══ CHANGE PASSWORD MODAL ═══════════════════════════════════
                Opens when the admin clicks "Change Password".
                Has three fields: current, new, confirm.
                On submit → PUT /api/admin/change-password/:userId
            ══════════════════════════════════════════════════════════════ */}
            {showPwdModal && (
                // Clicking the dark backdrop closes the modal
                <div className="ap-modal-backdrop" onClick={() => setShowPwdModal(false)}>
                    {/* Stop the click from bubbling up to the backdrop */}
                    <div className="ap-modal" onClick={e => e.stopPropagation()}>

                        {/* Modal header */}
                        <div className="ap-modal-header">
                            <div className="ap-modal-header-icon">
                                <LockIcon sx={{ fontSize: 18 }} />
                            </div>
                            <h2 className="ap-modal-title">Change Password</h2>
                            {/* X button to close */}
                            <button
                                className="ap-modal-close"
                                onClick={() => setShowPwdModal(false)}
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </button>
                        </div>

                        {/* Modal body: three password inputs */}
                        <div className="ap-modal-body">

                            <div className="ap-form-group">
                                <label className="ap-label">Current Password</label>
                                <input
                                    className="ap-input"
                                    type="password"
                                    placeholder="Enter current password"
                                    value={pwdForm.current}
                                    onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))}
                                />
                            </div>

                            <div className="ap-form-group">
                                <label className="ap-label">New Password</label>
                                <input
                                    className="ap-input"
                                    type="password"
                                    placeholder="Enter new password (3–10 characters)"
                                    value={pwdForm.newPwd}
                                    onChange={e => setPwdForm(f => ({ ...f, newPwd: e.target.value }))}
                                />
                            </div>

                            <div className="ap-form-group">
                                <label className="ap-label">Confirm New Password</label>
                                <input
                                    className="ap-input"
                                    type="password"
                                    placeholder="Repeat new password"
                                    value={pwdForm.confirm}
                                    onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
                                />
                            </div>

                            {/* Cancel + Update buttons */}
                            <div className="ap-modal-actions">
                                <button
                                    className="ap-btn-cancel"
                                    onClick={() => {
                                        setShowPwdModal(false);
                                        // Also clear the form so it's blank next time
                                        setPwdForm({ current: '', newPwd: '', confirm: '' });
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

            {/* ── Toast notification (bottom-right pop-up) ── */}
            {toast && (
                <div className={`ap-toast ap-toast--${toast.type}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default AdminProfile;
