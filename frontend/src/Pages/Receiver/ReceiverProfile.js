// ============================================================
//  FeedHope — Omar & Hanan — Pages/Receiver/ReceiverProfile.js
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';
import { useToast } from '../../Components/Shared/Toast';
import '../../Styles/Receiver/ReceiverDashboard.css';
import '../../Styles/Receiver/ReceiverProfile.css';

// MUI Icons
import EmailIcon         from '@mui/icons-material/Email';
import PhoneIcon         from '@mui/icons-material/Phone';
import PlaceIcon         from '@mui/icons-material/Place';
import BusinessIcon      from '@mui/icons-material/Business';
import EditIcon          from '@mui/icons-material/Edit';
import LockIcon          from '@mui/icons-material/Lock';
import InventoryIcon     from '@mui/icons-material/Inventory';
import GroupsIcon        from '@mui/icons-material/Groups';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CameraAltIcon     from '@mui/icons-material/CameraAlt';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DeleteIcon        from '@mui/icons-material/Delete';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

// Helpers
const getInitial     = (name = '') => name.trim().charAt(0).toUpperCase() || '?';
const formatMonthYear = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const ReceiverProfile = () => {
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();

    const [user,    setUser]    = useState(null);
    const [profile, setProfile] = useState(null);
    const [stats,   setStats]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    const [profilePicture, setProfilePicture] = useState(null);
    const [uploading,      setUploading]      = useState(false);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '', email: '', phone: '', street: '', org_type: ''
    });
    const [editSaving,  setEditSaving]  = useState(false);
    const [editError,   setEditError]   = useState('');
    const [editSuccess, setEditSuccess] = useState('');

    // Password modal state
    const [showPwModal, setShowPwModal] = useState(false);
    const [pwForm, setPwForm] = useState({
        currentPassword: '', newPassword: '', confirmPassword: ''
    });
    const [pwSaving,  setPwSaving]  = useState(false);
    const [pwError,   setPwError]   = useState('');
    const [pwSuccess, setPwSuccess] = useState('');

    // Eye toggle state
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw,     setShowNewPw]     = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    const fileInputRef = useRef(null);

    // Load user from localStorage once
    useEffect(() => {
        const storedUser = localStorage.getItem('feedhope_user');
        if (!storedUser) { navigate('/signin'); return; }
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setProfilePicture(parsed.profile_picture || null);
    }, [navigate]);

    // Fetch profile when user becomes available
    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res  = await fetch(`http://localhost:5000/api/receiver/profile/${user.user_id}`);
                const data = await res.json();
                if (!res.ok) { setError(data.error || 'Failed to load profile.'); return; }
                setProfile(data.profile);
                setStats(data.stats);
                setEditForm({
                    name:     data.profile.name          || '',
                    email:    data.profile.email         || '',
                    phone:    data.profile.phone_number  || '',
                    street:   data.profile.street        || '',
                    org_type: data.profile.org_type      || ''
                });
                if (data.profile.profile_picture && !profilePicture) {
                    setProfilePicture(data.profile.profile_picture);
                    const updatedUser = { ...user, profile_picture: data.profile.profile_picture };
                    localStorage.setItem('feedhope_user', JSON.stringify(updatedUser));
                    setUser(updatedUser);
                }
            } catch {
                setError('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    // Upload picture
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('profilePicture', file);
        setUploading(true);
        try {
            const res  = await fetch(`http://localhost:5000/api/receiver/upload-profile-picture/${user.user_id}`, {
                method: 'POST', body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            setProfilePicture(data.profile_picture);
            const updatedUser = { ...user, profile_picture: data.profile_picture };
            localStorage.setItem('feedhope_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            success('Profile picture updated.');
        } catch (err) {
            console.error(err);
            toastError('Failed to upload picture.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Delete picture
    const handleDeletePicture = async () => {
        setUploading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/delete-profile-picture/${user.user_id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Delete failed');
            setProfilePicture(null);
            const updatedUser = { ...user, profile_picture: null };
            localStorage.setItem('feedhope_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            success('Profile picture removed.');
        } catch (err) {
            console.error(err);
            toastError('Failed to delete picture.');
        } finally {
            setUploading(false);
        }
    };

    // Edit handlers
    const handleOpenEdit  = () => { setEditError(''); setEditSuccess(''); setShowEditModal(true); };
    const handleCloseEdit = () => { setShowEditModal(false); setEditError(''); setEditSuccess(''); };
    const handleEditChange = (e) => setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleEditSubmit = async () => {
        setEditError(''); setEditSuccess(''); setEditSaving(true);
        const updatedUser = { ...user, name: editForm.name };
        localStorage.setItem('feedhope_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event('user-updated'));
        try {
            const res  = await fetch(`http://localhost:5000/api/receiver/profile/${user.user_id}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(editForm)
            });
            const data = await res.json();
            if (!res.ok) { setEditError(data.error || 'Failed to save changes.'); return; }
            setProfile(prev => ({
                ...prev,
                name:         editForm.name,
                email:        editForm.email,
                phone_number: editForm.phone,
                street:       editForm.street,
                org_type:     editForm.org_type
            }));
            setEditSuccess('Profile updated successfully!');
            const updatedUser2 = { ...user, name: editForm.name };
            localStorage.setItem('feedhope_user', JSON.stringify(updatedUser2));
            setUser(updatedUser2);
            setTimeout(() => handleCloseEdit(), 1200);
        } catch {
            setEditError('Network error. Please try again.');
        } finally {
            setEditSaving(false);
        }
    };

    // Password handlers
    const handleOpenPw = () => {
        setPwError(''); setPwSuccess('');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPwModal(true);
    };

    const handleClosePw = () => {
        setShowPwModal(false);
        setPwError('');
        setPwSuccess('');
        setShowCurrentPw(false);
        setShowNewPw(false);
        setShowConfirmPw(false);
    };

    const handlePwChange = (e) => setPwForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePwSubmit = async () => {
        setPwError(''); setPwSuccess('');
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            setPwError('New passwords do not match.'); return;
        }
        if (pwForm.newPassword.length < 3 || pwForm.newPassword.length > 10) {
            setPwError('New password must be 3–10 characters long.'); return;
        }
        setPwSaving(true);
        try {
            const res  = await fetch(`http://localhost:5000/api/receiver/change-password/${user.user_id}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
            });
            const data = await res.json();
            if (!res.ok) { setPwError(data.error || 'Failed to change password.'); return; }
            setPwSuccess('Password changed successfully!');
            setTimeout(() => handleClosePw(), 1200);
        } catch {
            setPwError('Network error. Please try again.');
        } finally {
            setPwSaving(false);
        }
    };

    const handleLogout = () => { localStorage.removeItem('feedhope_user'); navigate('/signin'); };

    if (loading) return <div className="rdb-loading-screen"><div className="rdb-spinner" /><p>Loading your profile…</p></div>;
    if (error)   return <div className="rdb-error-screen"><p className="rdb-error-msg">{error}</p></div>;
    if (!profile) return null;

    const orgName = profile.organization_name || profile.name || '—';
    const orgType = profile.org_type || profile.business_type || '—';
    const phone   = profile.phone_number || profile.contact_phone || '—';
    const address = [profile.street, profile.city, profile.country].filter(Boolean).join(', ') || '—';

    return (
        <div className="rdb-layout">
            <ReceiverSidebar user={user} onLogout={handleLogout} activePage="profile" />

            <main className="rdb-main">
                {/* Banner */}
                <div className="rdb-banner">
                    <div className="rdb-banner-text">
                        <p className="rdb-banner-greeting">My Profile</p>
                        <h1 className="rdb-banner-title">{orgName}</h1>
                        <p className="rdb-banner-subtitle">
                            Manage your organization details, contact information, and account settings in one place.
                        </p>
                    </div>
                    <div className="rdb-banner-icon rdb-banner-avatar">
                        {profilePicture ? (
                            <img
                                src={`http://localhost:5000${profilePicture}`}
                                alt="profile"
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            getInitial(orgName)
                        )}
                        <button
                            className="rcp-avatar-camera"
                            onClick={() => fileInputRef.current.click()}
                            disabled={uploading}
                            aria-label="Change profile picture"
                            title="Change profile picture"
                        >
                            <CameraAltIcon style={{ fontSize: 14 }} />
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                    </div>
                    <div className="rcp-banner-actions">
                        <button className="rdb-banner-btn" onClick={handleOpenEdit}>
                            <EditIcon style={{ fontSize: 15, marginRight: 6, verticalAlign: 'middle' }} />
                            Edit Profile
                        </button>
                        <button
                            className={`rdb-banner-btn rdb-banner-btn--danger ${!profilePicture ? 'is-inactive' : ''}`}
                            onClick={handleDeletePicture}
                            disabled={uploading || !profilePicture}
                        >
                            <DeleteIcon style={{ fontSize: 15, marginRight: 6, verticalAlign: 'middle' }} />
                            Delete Photo
                        </button>
                        <button className="rdb-banner-btn rdb-banner-btn--outline" onClick={handleOpenPw}>
                            <LockIcon style={{ fontSize: 15, marginRight: 6, verticalAlign: 'middle' }} />
                            Change Password
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="rdb-stats-row">
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--blue"><InventoryIcon /></div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{stats?.totalReceived ?? profile.total_received ?? '—'}</span>
                            <span className="rdb-stat-label">Total Received</span>
                        </div>
                    </div>
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--green"><GroupsIcon /></div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{stats?.peopleServed ?? profile.people_served ?? '—'}</span>
                            <span className="rdb-stat-label">People Served</span>
                        </div>
                    </div>
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--orange"><LocalShippingIcon /></div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{stats?.deliveriesReceived ?? profile.deliveries_received ?? '—'}</span>
                            <span className="rdb-stat-label">Deliveries Received</span>
                        </div>
                    </div>
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--purple"><CalendarMonthIcon /></div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number rdb-stat-number--sm">{formatMonthYear(profile.joined_date)}</span>
                            <span className="rdb-stat-label">Member Since</span>
                        </div>
                    </div>
                </div>

                {/* Two-column grid */}
                <div className="rdb-grid">
                    {/* LEFT COLUMN */}
                    <div className="rdb-col-left">
                        <section className="rdb-card">
                            <div className="rdb-card-header">
                                <div className="rdb-card-title">
                                    <AccountCircleIcon fontSize="small" /> Contact Information
                                </div>
                                <button className="rdb-btn-edit" onClick={handleOpenEdit}>Edit</button>
                            </div>
                            <div className="rcp-contact-item">
                                <div className="rdb-stat-icon rdb-stat-icon--blue rcp-ci-icon"><EmailIcon fontSize="small" /></div>
                                <div className="rcp-ci-body">
                                    <span className="rcp-ci-label">Email Address</span>
                                    <span className="rcp-ci-value">{profile.email}</span>
                                </div>
                            </div>
                            <div className="rcp-contact-item">
                                <div className="rdb-stat-icon rdb-stat-icon--green rcp-ci-icon"><PhoneIcon fontSize="small" /></div>
                                <div className="rcp-ci-body">
                                    <span className="rcp-ci-label">Phone Number</span>
                                    <span className="rcp-ci-value">{phone}</span>
                                </div>
                            </div>
                            <div className="rcp-contact-item">
                                <div className="rdb-stat-icon rdb-stat-icon--orange rcp-ci-icon"><PlaceIcon fontSize="small" /></div>
                                <div className="rcp-ci-body">
                                    <span className="rcp-ci-label">Address</span>
                                    <span className="rcp-ci-value">{address}</span>
                                </div>
                            </div>
                            <div className="rcp-contact-item rcp-contact-item--last">
                                <div className="rdb-stat-icon rdb-stat-icon--purple rcp-ci-icon"><BusinessIcon fontSize="small" /></div>
                                <div className="rcp-ci-body">
                                    <span className="rcp-ci-label">Organization Type</span>
                                    <span className="rcp-ci-value">{orgType}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="rdb-col-right">
                        <section className="rdb-card">
                            <div className="rdb-card-header">
                                <div className="rdb-card-title">
                                    <AccountCircleIcon fontSize="small" /> Account
                                </div>
                            </div>
                            <div className="rcp-account-avatar-wrap">
                                <div className="rcp-account-avatar">
                                    {profilePicture ? (
                                        <img
                                            src={`http://localhost:5000${profilePicture}`}
                                            alt="profile"
                                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        getInitial(orgName)
                                    )}
                                </div>
                                <p className="rcp-account-org">{orgName}</p>
                                <span className="rdb-status-badge rdb-status-badge--accepted rcp-role-badge">Receiver</span>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* Edit Profile Modal */}
            {showEditModal && (
                <div className="rcp-modal-overlay" onClick={handleCloseEdit}>
                    <div className="rcp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="rcp-modal-header">
                            <h3 className="rcp-modal-title">Edit Profile</h3>
                            <button className="rcp-modal-close" onClick={handleCloseEdit}>×</button>
                        </div>
                        <div className="rcp-modal-body">
                            <label className="rcp-form-label">
                                Organization Name
                                <input className="rcp-form-input" type="text" name="name"     value={editForm.name}     onChange={handleEditChange} autoFocus />
                            </label>
                            <label className="rcp-form-label">
                                Email
                                <input className="rcp-form-input" type="email" name="email"   value={editForm.email}   onChange={handleEditChange} />
                            </label>
                            <label className="rcp-form-label">
                                Phone
                                <input className="rcp-form-input" type="tel"   name="phone"   value={editForm.phone}   onChange={handleEditChange} />
                            </label>
                            <label className="rcp-form-label">
                                Address
                                <input className="rcp-form-input" type="text"  name="street"  value={editForm.street}  onChange={handleEditChange} />
                            </label>
                            <label className="rcp-form-label">
                                Organization Type
                                <input className="rcp-form-input" type="text"  name="org_type" value={editForm.org_type} onChange={handleEditChange} />
                            </label>
                            {editError   && <p className="rcp-form-error">{editError}</p>}
                            {editSuccess && <p className="rcp-form-success">{editSuccess}</p>}
                        </div>
                        <div className="rcp-modal-footer">
                            <button className="rcp-btn-cancel" onClick={handleCloseEdit} disabled={editSaving}>Cancel</button>
                            <button className="rcp-btn-save"   onClick={handleEditSubmit} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPwModal && (
                <div className="rcp-modal-overlay" onClick={handleClosePw}>
                    <div className="rcp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="rcp-modal-header">
                            <h3 className="rcp-modal-title">Change Password</h3>
                            <button className="rcp-modal-close" onClick={handleClosePw}>×</button>
                        </div>
                        <div className="rcp-modal-body">

                            <label className="rcp-form-label">Current Password</label>
                            <div className="rcp-password-wrapper">
                                <input
                                    className="rcp-form-input rcp-pw-input"
                                    type={showCurrentPw ? 'text' : 'password'}
                                    name="currentPassword"
                                    value={pwForm.currentPassword}
                                    onChange={handlePwChange}
                                    autoFocus
                                    placeholder="••••••••••"
                                />
                                <button type="button" className="rcp-eye-btn" tabIndex={-1} onClick={() => setShowCurrentPw(p => !p)}>
                                    {showCurrentPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                </button>
                            </div>

                            <label className="rcp-form-label">New Password</label>
                            <div className="rcp-password-wrapper">
                                <input
                                    className="rcp-form-input rcp-pw-input"
                                    type={showNewPw ? 'text' : 'password'}
                                    name="newPassword"
                                    value={pwForm.newPassword}
                                    onChange={handlePwChange}
                                />
                                <button type="button" className="rcp-eye-btn" tabIndex={-1} onClick={() => setShowNewPw(p => !p)}>
                                    {showNewPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                </button>
                            </div>

                            <label className="rcp-form-label">Confirm New Password</label>
                            <div className="rcp-password-wrapper">
                                <input
                                    className="rcp-form-input rcp-pw-input"
                                    type={showConfirmPw ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={pwForm.confirmPassword}
                                    onChange={handlePwChange}
                                />
                                <button type="button" className="rcp-eye-btn" tabIndex={-1} onClick={() => setShowConfirmPw(p => !p)}>
                                    {showConfirmPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                </button>
                            </div>

                            {pwError   && <p className="rcp-form-error">{pwError}</p>}
                            {pwSuccess && <p className="rcp-form-success">{pwSuccess}</p>}
                        </div>
                        <div className="rcp-modal-footer">
                            <button className="rcp-btn-cancel" onClick={handleClosePw} disabled={pwSaving}>Cancel</button>
                            <button className="rcp-btn-save"   onClick={handlePwSubmit} disabled={pwSaving}>{pwSaving ? 'Saving…' : 'Change Password'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceiverProfile;
