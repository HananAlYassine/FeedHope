// ============================================================
//  FeedHope — Omar & Hanan — Pages/Receiver/ReceiverProfile.js
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';
import '../../Styles/Receiver/ReceiverDashboard.css';
import '../../Styles/Receiver/ReceiverProfile.css';

// MUI Icons
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PlaceIcon from '@mui/icons-material/Place';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import InventoryIcon from '@mui/icons-material/Inventory';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

// Helpers
// Gets first letter of name → used for avatar
const getInitial = (name = '') => name.trim().charAt(0).toUpperCase() || '?';

// Converts date → "Oct 2023" format
const formatMonthYear = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const ReceiverProfile = () => {
    const navigate = useNavigate();

    // --- user stored in state to avoid re‑reading localStorage on every render
    const [user, setUser] = useState(null); // stores logged-in user

    const [profile, setProfile] = useState(null); // stores profile data
    const [stats, setStats] = useState(null); // stores stats
    const [loading, setLoading] = useState(true); // loading spinner
    const [error, setError] = useState(null); // error message

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '', email: '', phone: '', street: '', org_type: ''
    });
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');

    // Password modal state
    const [showPwModal, setShowPwModal] = useState(false);
    const [pwForm, setPwForm] = useState({
        currentPassword: '', newPassword: '', confirmPassword: ''
    });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState('');

    // --- Load user from localStorage once
    useEffect(() => {
        // get user from localStorage
        const storedUser = localStorage.getItem('feedhope_user');

        // If NOT logged in: redirect to login page
        if (!storedUser) {
            navigate('/signin');
            return;
        }
        // Save user in state
        setUser(JSON.parse(storedUser));
    }, [navigate]);


    // --- Fetch profile when user becomes available
    useEffect(() => {
        if (!user) return; // Wait until user exists

        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await fetch(`http://localhost:5000/api/receiver/profile/${user.user_id}`); // Calls backend API
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || 'Failed to load profile.');
                    return;
                }
                // Saves data into state
                setProfile(data.profile);
                setStats(data.stats);
                setEditForm({
                    name: data.profile.name || '',
                    email: data.profile.email || '',
                    phone: data.profile.phone_number || '',
                    street: data.profile.street || '',
                    org_type: data.profile.org_type || ''
                });
            } catch {
                setError('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    // --- Edit handlers
    const handleOpenEdit = () => {
        setEditError('');
        setEditSuccess('');
        setShowEditModal(true); // open the modal
    };
    const handleCloseEdit = () => {
        setShowEditModal(false);
        setEditError('');
        setEditSuccess('');
    };
    const handleEditChange = (e) => setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value })); // Updates input fields dynamically

    const handleEditSubmit = async () => {
        setEditError('');
        setEditSuccess('');
        setEditSaving(true);


        const updatedUser = { ...user, name: editForm.name };
        localStorage.setItem('feedhope_user', JSON.stringify(updatedUser));
        setUser(updatedUser);

        window.dispatchEvent(new Event('user-updated'));

        // Sends updated data to backend
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/profile/${user.user_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (!res.ok) {
                setEditError(data.error || 'Failed to save changes.');
                return;
            }

            // Updates UI instantly
            setProfile(prev => ({
                ...prev,
                name: editForm.name,
                email: editForm.email,
                phone_number: editForm.phone,
                street: editForm.street,
                org_type: editForm.org_type
            }));
            setEditSuccess('Profile updated successfully!');
            // Update stored user name
            const updatedUser = { ...user, name: editForm.name };

            // Keeps user data updated
            localStorage.setItem('feedhope_user', JSON.stringify(updatedUser));
            setUser(updatedUser); // keep state in sync
            setTimeout(() => handleCloseEdit(), 1200);
        } catch {
            setEditError('Network error. Please try again.');
        } finally {
            setEditSaving(false);
        }
    };

    // --- Password handlers
    const handleOpenPw = () => {
        setPwError('');
        setPwSuccess('');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPwModal(true);
    };
    const handleClosePw = () => {
        setShowPwModal(false);
        setPwError('');
        setPwSuccess('');
    };
    const handlePwChange = (e) => setPwForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePwSubmit = async () => {
        setPwError('');
        setPwSuccess('');
        // Check passwords match
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            setPwError('New passwords do not match.');
            return;
        }
        // Password rules
        if (pwForm.newPassword.length < 3 || pwForm.newPassword.length > 10) {
            setPwError('New password must be 3–10 characters long.');
            return;
        }
        setPwSaving(true);
        // Backend handles hashing
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/change-password/${user.user_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: pwForm.currentPassword,
                    newPassword: pwForm.newPassword
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setPwError(data.error || 'Failed to change password.');
                return;
            }
            setPwSuccess('Password changed successfully!');
            setTimeout(() => handleClosePw(), 1200);
        } catch {
            setPwError('Network error. Please try again.');
        } finally {
            setPwSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // Show loading screen
    if (loading) {
        return (
            <div className="rdb-loading-screen">
                <div className="rdb-spinner" />
                <p>Loading your profile…</p>
            </div>
        );
    }

    // Show error screen
    if (error) {
        return (
            <div className="rdb-error-screen">
                <p className="rdb-error-msg">{error}</p>
            </div>
        );
    }

    /* If profile is null / undefined / not loaded yet DON’T render anything */
    if (!profile) return null;

    // Use best available value
    const orgName = profile.organization_name || profile.name || '—';
    const orgType = profile.org_type || profile.business_type || '—';
    const phone = profile.phone_number || profile.contact_phone || '—';
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
                        {getInitial(orgName)}
                        <button
                            className="rcp-avatar-camera"
                            aria-label="Change profile picture"
                            title="Coming soon"
                        >
                            <CameraAltIcon style={{ fontSize: 14 }} />
                        </button>
                    </div>
                    <div className="rcp-banner-actions">
                        <button className="rdb-banner-btn" onClick={handleOpenEdit}>
                            <EditIcon style={{ fontSize: 15, marginRight: 6, verticalAlign: 'middle' }} />
                            Edit Profile
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
                        <div className="rdb-stat-icon rdb-stat-icon--blue">
                            <InventoryIcon />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">
                                {stats?.totalReceived ?? profile.total_received ?? '—'}
                            </span>
                            <span className="rdb-stat-label">Total Received</span>
                        </div>
                    </div>
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--green">
                            <GroupsIcon />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">
                                {stats?.peopleServed ?? profile.people_served ?? '—'}
                            </span>
                            <span className="rdb-stat-label">People Served</span>
                        </div>
                    </div>
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--orange">
                            <LocalShippingIcon />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">
                                {stats?.deliveriesReceived ?? profile.deliveries_received ?? '—'}
                            </span>
                            <span className="rdb-stat-label">Deliveries Received</span>
                        </div>
                    </div>
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--purple">
                            <CalendarMonthIcon />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number rdb-stat-number--sm">
                                {formatMonthYear(profile.foundation_date)}
                            </span>
                            <span className="rdb-stat-label">Member Since</span>
                        </div>
                    </div>
                </div>

                {/* Two‑column grid */}
                <div className="rdb-grid">
                    {/* LEFT COLUMN: Contact Information (single card) */}
                    <div className="rdb-col-left">
                        <section className="rdb-card">
                            <div className="rdb-card-header">
                                <div className="rdb-card-title">
                                    <AccountCircleIcon fontSize="small" />
                                    Contact Information
                                </div>
                                <button className="rdb-btn-edit" onClick={handleOpenEdit}>Edit</button>
                            </div>

                            <div className="rcp-contact-item">
                                <div className="rdb-stat-icon rdb-stat-icon--blue rcp-ci-icon">
                                    <EmailIcon fontSize="small" />
                                </div>
                                <div className="rcp-ci-body">
                                    <span className="rcp-ci-label">Email Address</span>
                                    <span className="rcp-ci-value">{profile.email}</span>
                                </div>
                            </div>
                            <div className="rcp-contact-item">
                                <div className="rdb-stat-icon rdb-stat-icon--green rcp-ci-icon">
                                    <PhoneIcon fontSize="small" />
                                </div>
                                <div className="rcp-ci-body">
                                    <span className="rcp-ci-label">Phone Number</span>
                                    <span className="rcp-ci-value">{phone}</span>
                                </div>
                            </div>
                            <div className="rcp-contact-item">
                                <div className="rdb-stat-icon rdb-stat-icon--orange rcp-ci-icon">
                                    <PlaceIcon fontSize="small" />
                                </div>
                                <div className="rcp-ci-body">
                                    <span className="rcp-ci-label">Address</span>
                                    <span className="rcp-ci-value">{address}</span>
                                </div>
                            </div>
                            <div className="rcp-contact-item rcp-contact-item--last">
                                <div className="rdb-stat-icon rdb-stat-icon--purple rcp-ci-icon">
                                    <BusinessIcon fontSize="small" />
                                </div>
                                <div className="rcp-ci-body">
                                    <span className="rcp-ci-label">Organization Type</span>
                                    <span className="rcp-ci-value">{orgType}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Account (avatar, name, role, buttons) */}
                    <div className="rdb-col-right">
                        <section className="rdb-card">
                            <div className="rdb-card-header">
                                <div className="rdb-card-title">
                                    <AccountCircleIcon fontSize="small" />
                                    Account
                                </div>
                            </div>
                            <div className="rcp-account-avatar-wrap">
                                <div className="rcp-account-avatar">
                                    {getInitial(orgName)}
                                </div>
                                <p className="rcp-account-org">{orgName}</p>
                                <span className="rdb-status-badge rdb-status-badge--accepted rcp-role-badge">
                                    Receiver
                                </span>
                                
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
                                <input
                                    className="rcp-form-input"
                                    type="text"
                                    name="name"
                                    value={editForm.name}
                                    onChange={handleEditChange}
                                    autoFocus
                                />
                            </label>
                            <label className="rcp-form-label">
                                Email
                                <input
                                    className="rcp-form-input"
                                    type="email"
                                    name="email"
                                    value={editForm.email}
                                    onChange={handleEditChange}
                                />
                            </label>
                            <label className="rcp-form-label">
                                Phone
                                <input
                                    className="rcp-form-input"
                                    type="tel"
                                    name="phone"
                                    value={editForm.phone}
                                    onChange={handleEditChange}
                                />
                            </label>
                            <label className="rcp-form-label">
                                Address
                                <input
                                    className="rcp-form-input"
                                    type="text"
                                    name="street"
                                    value={editForm.street}
                                    onChange={handleEditChange}
                                />
                            </label>
                            <label className="rcp-form-label">
                                Organization Type
                                <input
                                    className="rcp-form-input"
                                    type="text"
                                    name="org_type"
                                    value={editForm.org_type}
                                    onChange={handleEditChange}
                                />
                            </label>
                            {editError && <p className="rcp-form-error">{editError}</p>}
                            {editSuccess && <p className="rcp-form-success">{editSuccess}</p>}
                        </div>
                        <div className="rcp-modal-footer">
                            <button className="rcp-btn-cancel" onClick={handleCloseEdit} disabled={editSaving}>
                                Cancel
                            </button>
                            <button className="rcp-btn-save" onClick={handleEditSubmit} disabled={editSaving}>
                                {editSaving ? 'Saving…' : 'Save Changes'}
                            </button>
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
                            <label className="rcp-form-label">
                                Current Password
                                <input
                                    className="rcp-form-input"
                                    type="password"
                                    name="currentPassword"
                                    value={pwForm.currentPassword}
                                    onChange={handlePwChange}
                                    autoFocus
                                    placeholder="••••••••••"
                                />
                            </label>
                            <label className="rcp-form-label">
                                New Password
                                <input
                                    className="rcp-form-input"
                                    type="password"
                                    name="newPassword"
                                    value={pwForm.newPassword}
                                    onChange={handlePwChange}
                                />
                            </label>
                            <label className="rcp-form-label">
                                Confirm New Password
                                <input
                                    className="rcp-form-input"
                                    type="password"
                                    name="confirmPassword"
                                    value={pwForm.confirmPassword}
                                    onChange={handlePwChange}
                                />
                            </label>
                            {pwError && <p className="rcp-form-error">{pwError}</p>}
                            {pwSuccess && <p className="rcp-form-success">{pwSuccess}</p>}
                        </div>
                        <div className="rcp-modal-footer">
                            <button className="rcp-btn-cancel" onClick={handleClosePw} disabled={pwSaving}>
                                Cancel
                            </button>
                            <button className="rcp-btn-save" onClick={handlePwSubmit} disabled={pwSaving}>
                                {pwSaving ? 'Saving…' : 'Change Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceiverProfile;