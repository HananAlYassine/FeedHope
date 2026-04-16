import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorProfile.css';

// MUI Icons
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PlaceIcon from '@mui/icons-material/Place';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DeleteIcon from '@mui/icons-material/Delete';

const getInitial = (name = '') => name.trim().charAt(0).toUpperCase() || '?';

// FIXED: Updated to show Full Date (Day, Month Date, Year)
const formatFullDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const DonorProfile = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('feedhope_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [profilePicture, setProfilePicture] = useState(user?.profile_picture || null);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '', email: '', phone: '', street: '', city: '', business_type: ''
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

    useEffect(() => {
        const storedUser = localStorage.getItem('feedhope_user');
        if (!storedUser) {
            navigate('/signin');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    useEffect(() => {
        if (!user) return;

        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await fetch(`http://localhost:5000/api/donor/profile/${user.user_id}`);
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || 'Failed to load profile.');
                    return;
                }
                setProfile(data.profile);
                setStats(data.stats);

                if (data.profile.profile_picture) {
                    setProfilePicture(data.profile.profile_picture);
                    const updatedUser = { ...user, profile_picture: data.profile.profile_picture };
                    localStorage.setItem('feedhope_user', JSON.stringify(updatedUser));
                }

                setEditForm({
                    name: data.profile.business_name || data.profile.name || '',
                    email: data.profile.email || '',
                    phone: data.profile.phone_number || '',
                    street: data.profile.street || '',
                    city: data.profile.city || '',
                    business_type: data.profile.business_type || ''
                });
            } catch {
                setError('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    const handlePictureUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profilePicture', file);

        try {
            const res = await fetch(`http://localhost:5000/api/donor/upload-profile-picture/${user.user_id}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setProfilePicture(data.profile_picture);
                const updatedUser = { ...user, profile_picture: data.profile_picture };
                localStorage.setItem('feedhope_user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }
        } catch (err) {
            console.error('Error uploading picture:', err);
        }
    };

    const handleDeletePicture = async () => {
        if (!window.confirm("Are you sure you want to remove your profile picture?")) return;

        try {
            const res = await fetch(`http://localhost:5000/api/donor/delete-profile-picture/${user.user_id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setProfilePicture(null);
                const updatedUser = { ...user, profile_picture: null };
                localStorage.setItem('feedhope_user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }
        } catch (err) {
            console.error('Error deleting picture:', err);
        }
    };

    const triggerFileInput = () => fileInputRef.current.click();

    const handleOpenEdit = () => { setEditError(''); setEditSuccess(''); setShowEditModal(true); };
    const handleCloseEdit = () => setShowEditModal(false);
    const handleEditChange = (e) => setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleEditSubmit = async () => {
        setEditError(''); setEditSuccess(''); setEditSaving(true);
        try {
            const res = await fetch(`http://localhost:5000/api/donor/profile/${user.user_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (!res.ok) {
                setEditError(data.error || 'Failed to save changes.');
                return;
            }
            setProfile(prev => ({
                ...prev,
                business_name: editForm.name,
                email: editForm.email,
                phone_number: editForm.phone,
                street: editForm.street,
                city: editForm.city,
                business_type: editForm.business_type
            }));
            setEditSuccess('Profile updated successfully!');
            const updatedUser = { ...user, name: editForm.name };
            localStorage.setItem('feedhope_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setTimeout(() => handleCloseEdit(), 1200);
        } catch {
            setEditError('Network error. Please try again.');
        } finally {
            setEditSaving(false);
        }
    };

    const handleOpenPw = () => {
        setPwError(''); setPwSuccess('');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPwModal(true);
    };
    const handleClosePw = () => setShowPwModal(false);
    const handlePwChange = (e) => setPwForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePwSubmit = async () => {
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            setPwError('New passwords do not match.'); return;
        }
        setPwSaving(true);
        try {
            const res = await fetch(`http://localhost:5000/api/donor/change-password/${user.user_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
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

    if (loading) return <div className="rdb-loading-screen"><div className="rdb-spinner" /><p>Loading profile…</p></div>;
    if (error) return <div className="rdb-error-screen"><p className="rdb-error-msg">{error}</p></div>;
    if (!profile) return null;

    const businessName = profile.business_name || profile.name || '—';
    const address = [profile.street, profile.city, profile.country].filter(Boolean).join(', ') || '—';

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} activePage="profile" />

            <main className="ddb-main">
                <div className="ddb-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">My Profile</p>
                        <h1 className="ddb-banner-title">{businessName}</h1>
                        <p className="ddb-banner-subtitle">Manage your business details and settings.</p>
                    </div>

                    <div className="ddb-banner-icon ddb-banner-avatar">
                        {profilePicture ? (
                            <img src={`http://localhost:5000${profilePicture}`} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            getInitial(businessName)
                        )}
                        <button className="dcp-avatar-camera" onClick={triggerFileInput} aria-label="Change picture">
                            <CameraAltIcon style={{ fontSize: 14 }} />
                        </button>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handlePictureUpload} />
                    </div>

                    <div className="dcp-banner-actions">
                        <button className="ddb-banner-btn" onClick={handleOpenEdit}>
                            <EditIcon style={{ fontSize: 15, marginRight: 6 }} /> Edit Profile
                        </button>

                        <button
                            className={`ddb-banner-btn ddb-banner-btn--danger ${!profilePicture ? 'is-inactive' : ''}`}
                            onClick={handleDeletePicture}
                            disabled={!profilePicture}
                        >
                            <DeleteIcon style={{ fontSize: 15, marginRight: 6 }} /> Delete Photo
                        </button>

                        <button className="ddb-banner-btn ddb-banner-btn--outline" onClick={handleOpenPw}>
                            <LockIcon style={{ fontSize: 15, marginRight: 6 }} /> Change Password
                        </button>
                    </div>
                </div>

                <div className="ddb-stats-row">
                    <div className="ddb-stat-card">
                        <div className="ddb-stat-icon ddb-stat-icon--orange"><FastfoodIcon /></div>
                        <div className="ddb-stat-info">
                            <span className="ddb-stat-number">{stats?.totalDonations ?? '0'}</span>
                            <span className="ddb-stat-label">Total Donations</span>
                        </div>
                    </div>
                    <div className="ddb-stat-card">
                        <div className="ddb-stat-icon ddb-stat-icon--green"><PeopleIcon /></div>
                        <div className="ddb-stat-info">
                            <span className="ddb-stat-number">{stats?.peopleFed ?? '0'}</span>
                            <span className="ddb-stat-label">People Fed</span>
                        </div>
                    </div>
                    <div className="ddb-stat-card">
                        <div className="ddb-stat-icon ddb-stat-icon--purple"><CalendarMonthIcon /></div>
                        <div className="ddb-stat-info">
                            <span className="ddb-stat-number ddb-stat-number--sm">
                                {formatFullDate(profile.created_at)}
                            </span>
                            <span className="ddb-stat-label">Member Since</span>
                        </div>
                    </div>
                </div>

                <div className="ddb-grid">
                    <div className="ddb-col-left">
                        <section className="ddb-card">
                            <div className="ddb-card-header">
                                <div className="ddb-card-title"><RestaurantIcon fontSize="small" /> Contact Information</div>
                            </div>
                            <div className="dcp-contact-item">
                                <div className="ddb-stat-icon ddb-stat-icon--blue dcp-ci-icon"><EmailIcon fontSize="small" /></div>
                                <div className="dcp-ci-body">
                                    <span className="dcp-ci-label">Email Address</span>
                                    <span className="dcp-ci-value">{profile.email}</span>
                                </div>
                            </div>
                            <div className="dcp-contact-item">
                                <div className="ddb-stat-icon ddb-stat-icon--green dcp-ci-icon"><PhoneIcon fontSize="small" /></div>
                                <div className="dcp-ci-body">
                                    <span className="dcp-ci-label">Phone Number</span>
                                    <span className="dcp-ci-value">{profile.phone_number || '—'}</span>
                                </div>
                            </div>
                            <div className="dcp-contact-item">
                                <div className="ddb-stat-icon ddb-stat-icon--orange dcp-ci-icon"><PlaceIcon fontSize="small" /></div>
                                <div className="dcp-ci-body">
                                    <span className="dcp-ci-label">Address</span>
                                    <span className="dcp-ci-value">{address}</span>
                                </div>
                            </div>
                            <div className="dcp-contact-item dcp-contact-item--last">
                                <div className="ddb-stat-icon ddb-stat-icon--purple dcp-ci-icon"><BusinessIcon fontSize="small" /></div>
                                <div className="dcp-ci-body">
                                    <span className="dcp-ci-label">Business Type</span>
                                    <span className="dcp-ci-value">{profile.business_type || '—'}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="ddb-col-right">
                        <section className="ddb-card">
                            <div className="ddb-card-header">
                                <div className="ddb-card-title"><RestaurantIcon fontSize="small" /> Account</div>
                            </div>
                            <div className="dcp-account-avatar-wrap">
                                <div className="dcp-account-avatar">
                                    {profilePicture ? (
                                        <img src={`http://localhost:5000${profilePicture}`} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        getInitial(businessName)
                                    )}
                                </div>
                                <p className="dcp-account-org">{businessName}</p>
                                <span className="ddb-status-badge ddb-status-badge--accepted dcp-role-badge">Donor</span>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* Modals for Edit/Password */}
            {showEditModal && (
                <div className="dcp-modal-overlay" onClick={handleCloseEdit}>
                    <div className="dcp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="dcp-modal-header">
                            <h3 className="dcp-modal-title">Edit Profile</h3>
                            <button className="dcp-modal-close" onClick={handleCloseEdit}>×</button>
                        </div>
                        <div className="dcp-modal-body">
                            <label className="dcp-form-label">Business Name <input className="dcp-form-input" name="name" value={editForm.name} onChange={handleEditChange} /></label>
                            <label className="dcp-form-label">Email <input className="dcp-form-input" type="email" name="email" value={editForm.email} onChange={handleEditChange} /></label>
                            <label className="dcp-form-label">Phone <input className="dcp-form-input" type="tel" name="phone" value={editForm.phone} onChange={handleEditChange} /></label>
                            <label className="dcp-form-label">Street Address <input className="dcp-form-input" name="street" value={editForm.street} onChange={handleEditChange} /></label>
                            <label className="dcp-form-label">City <input className="dcp-form-input" name="city" value={editForm.city} onChange={handleEditChange} /></label>
                            <label className="dcp-form-label">Business Type <input className="dcp-form-input" name="business_type" value={editForm.business_type} onChange={handleEditChange} /></label>
                            {editError && <p className="dcp-form-error">{editError}</p>}
                            {editSuccess && <p className="dcp-form-success">{editSuccess}</p>}
                        </div>
                        <div className="dcp-modal-footer">
                            <button className="dcp-btn-cancel" onClick={handleCloseEdit} disabled={editSaving}>Cancel</button>
                            <button className="dcp-btn-save" onClick={handleEditSubmit} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showPwModal && (
                <div className="dcp-modal-overlay" onClick={handleClosePw}>
                    <div className="dcp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="dcp-modal-header">
                            <h3 className="dcp-modal-title">Change Password</h3>
                            <button className="dcp-modal-close" onClick={handleClosePw}>×</button>
                        </div>
                        <div className="dcp-modal-body">
                            <label className="dcp-form-label">Current Password <input className="dcp-form-input" type="password" name="currentPassword" value={pwForm.currentPassword} onChange={handlePwChange} /></label>
                            <label className="dcp-form-label">New Password <input className="dcp-form-input" type="password" name="newPassword" value={pwForm.newPassword} onChange={handlePwChange} /></label>
                            <label className="dcp-form-label">Confirm New Password <input className="dcp-form-input" type="password" name="confirmPassword" value={pwForm.confirmPassword} onChange={handlePwChange} /></label>
                            {pwError && <p className="rdb-error-msg" style={{ fontSize: '13px' }}>{pwError}</p>}
                            {pwSuccess && <p className="dcp-form-success">{pwSuccess}</p>}
                        </div>
                        <div className="dcp-modal-footer">
                            <button className="dcp-btn-cancel" onClick={handleClosePw} disabled={pwSaving}>Cancel</button>
                            <button className="dcp-btn-save" onClick={handlePwSubmit} disabled={pwSaving}>{pwSaving ? 'Saving…' : 'Change Password'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DonorProfile;