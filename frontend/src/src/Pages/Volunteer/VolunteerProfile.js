import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import '../../Styles/Volunteer/VolunteerDashboard.css';
import '../../Styles/Volunteer/VolunteerProfile.css';

// MUI Icons
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StarIcon from '@mui/icons-material/Star';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

// Helpers
const getInitial = (name = '') => name.trim().charAt(0).toUpperCase() || '?';
const formatMonthYear = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const VolunteerProfile = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const storedUser = localStorage.getItem('feedhope_user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({ deliveriesCompleted: 0, rating: 0 });
    const [loading, setLoading] = useState(true);
    const [profilePicture, setProfilePicture] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');

    // Password modal state
    const [showPwModal, setShowPwModal] = useState(false);
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState('');

    // Eye toggle state
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    // ── Fetch profile on mount ──
    useEffect(() => {
        if (!user) { navigate('/signin'); return; }

        const fetchProfile = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/volunteer/profile/${user.user_id}`);
                setProfile(res.data.profile);
                setStats(res.data.stats);
                if (res.data.profile.profile_picture) {
                    setProfilePicture(`http://localhost:5000${res.data.profile.profile_picture}`);
                }
            } catch (err) {
                console.error('Failed to load volunteer profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    // ── Profile picture handlers ──
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('profilePicture', file);
        try {
            const res = await axios.post(
                `http://localhost:5000/api/volunteer/upload-profile-picture/${user.user_id}`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            setProfilePicture(`http://localhost:5000${res.data.profile_picture}`);
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeletePicture = async () => {
        if (!window.confirm('Remove your profile picture?')) return;
        setUploading(true);
        try {
            await axios.delete(`http://localhost:5000/api/volunteer/delete-profile-picture/${user.user_id}`);
            setProfilePicture(null);
        } catch (err) {
            console.error('Delete picture failed:', err);
        } finally {
            setUploading(false);
        }
    };

    // ── Edit profile handlers ──
    const handleOpenEdit = () => {
        setEditError('');
        setEditSuccess('');
        setEditForm({
            name: profile.name,
            email: profile.email,
            phone: profile.phone_number,
            vehicle_type: profile.vehicle_type?.toLowerCase().trim() || 'car',
            plate_number: profile.plate_number,
        });
        setShowEditModal(true);
    };

    const handleCloseEdit = () => {
        setShowEditModal(false);
        setEditError('');
        setEditSuccess('');
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleVehicleTypeChange = (type) => {
        setEditForm(prev => ({ ...prev, vehicle_type: type }));
    };

    const handleEditSubmit = async () => {
        setEditError('');
        setEditSuccess('');
        setEditSaving(true);
        try {
            await axios.put(`http://localhost:5000/api/volunteer/profile/${user.user_id}`, {
                name: editForm.name,
                email: editForm.email,
                phone: editForm.phone,
                vehicle_type: editForm.vehicle_type,
                plate_number: editForm.plate_number,
            });
            setProfile(prev => ({
                ...prev,
                name: editForm.name,
                email: editForm.email,
                phone_number: editForm.phone,
                vehicle_type: editForm.vehicle_type,
                plate_number: editForm.plate_number,
            }));
            setEditSuccess('Profile updated successfully!');
            setTimeout(() => handleCloseEdit(), 1200);
        } catch (err) {
            setEditError(err.response?.data?.error || 'Failed to update profile.');
        } finally {
            setEditSaving(false);
        }
    };

    // ── Password handlers ──
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
        setShowCurrentPw(false);
        setShowNewPw(false);
        setShowConfirmPw(false);
    };

    const handlePwChange = (e) => setPwForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePwSubmit = async () => {
        setPwError('');
        setPwSuccess('');
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            setPwError('New passwords do not match.');
            return;
        }
        if (pwForm.newPassword.length < 3 || pwForm.newPassword.length > 10) {
            setPwError('New password must be 3–10 characters long.');
            return;
        }
        setPwSaving(true);
        try {
            await axios.put(`http://localhost:5000/api/volunteer/change-password/${user.user_id}`, {
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });
            setPwSuccess('Password changed successfully!');
            setTimeout(() => handleClosePw(), 1200);
        } catch (err) {
            setPwError(err.response?.data?.error || 'Failed to change password.');
        } finally {
            setPwSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    const getVehicleIcon = (type) => {
        switch (type) {
            case 'car': return <DirectionsCarIcon fontSize="small" />;
            case 'motorcycle': return <TwoWheelerIcon fontSize="small" />;
            case 'truck': return <LocalShippingIcon fontSize="small" />;
            default: return <DirectionsCarIcon fontSize="small" />;
        }
    };

    if (loading) return <div className="vdb-layout"><div className="vdb-main" style={{ padding: '40px' }}>Loading profile...</div></div>;
    if (!profile) return <div className="vdb-layout"><div className="vdb-main" style={{ padding: '40px' }}>Profile not found.</div></div>;

    const displayName = profile.name || '—';

    return (
        <div className="vdb-layout">
            <VolunteerSidebar user={{ name: displayName }} onLogout={handleLogout} activePage="profile" />

            <main className="vdb-main">
                {/* Banner */}
                <div className="vdb-banner">
                    <div className="vdb-banner-text">
                        <p className="vdb-banner-greeting">My Profile</p>
                        <h1 className="vdb-banner-title">{displayName}</h1>
                        <p className="vdb-banner-subtitle">
                            Manage your personal details, vehicle information, and account settings.
                        </p>
                    </div>
                    <div className="vdb-banner-icon vdb-banner-avatar">
                        {profilePicture ? <img src={profilePicture} alt="profile" /> : getInitial(displayName)}
                        <button
                            className="vcp-avatar-camera"
                            onClick={() => fileInputRef.current.click()}
                            disabled={uploading}
                            aria-label="Change profile picture"
                            title="Change profile picture"
                        >
                            <CameraAltIcon style={{ fontSize: 14 }} />
                        </button>
                        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                    </div>
                    <div className="vcp-banner-actions">
                        <button className="vdb-banner-btn" onClick={handleOpenEdit}>
                            <EditIcon style={{ fontSize: 15, marginRight: 6 }} /> Edit Profile
                        </button>
                        <button
                            className={`vdb-banner-btn vdb-banner-btn--danger ${!profilePicture ? 'is-inactive' : ''}`}
                            onClick={handleDeletePicture}
                            disabled={uploading || !profilePicture}
                        >
                            <DeleteIcon style={{ fontSize: 15, marginRight: 6 }} /> Delete Photo
                        </button>
                        <button className="vdb-banner-btn vdb-banner-btn--outline" onClick={handleOpenPw}>
                            <LockIcon style={{ fontSize: 15, marginRight: 6 }} /> Change Password
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="vdb-stats-row">
                    <div className="vdb-stat-card">
                        <div className="vdb-stat-icon vdb-stat-icon--blue"><DirectionsCarIcon /></div>
                        <div className="vdb-stat-info">
                            <span className="vdb-stat-number">{stats.deliveriesCompleted}</span>
                            <span className="vdb-stat-label">Deliveries</span>
                        </div>
                    </div>
                    <div className="vdb-stat-card">
                        <div className="vdb-stat-icon vdb-stat-icon--indigo"><StarIcon /></div>
                        <div className="vdb-stat-info">
                            <span className="vdb-stat-number">{stats.rating}</span>
                            <span className="vdb-stat-label">Rating</span>
                        </div>
                    </div>
                    <div className="vdb-stat-card">
                        <div className="vdb-stat-icon vdb-stat-icon--blue-dark"><CalendarMonthIcon /></div>
                        <div className="vdb-stat-info">
                            <span className="vdb-stat-number vdb-stat-number--sm">{formatMonthYear(profile.join_date)}</span>
                            <span className="vdb-stat-label">Member Since</span>
                        </div>
                    </div>
                </div>

                {/* Two-column grid */}
                <div className="vdb-grid">
                    {/* LEFT COLUMN */}
                    <div className="vdb-col-left">
                        <section className="vdb-card">
                            <div className="vdb-card-header">
                                <div className="vdb-card-title"><AccountCircleIcon fontSize="small" /> Contact Information</div>
                                <button className="vdb-btn-edit" onClick={handleOpenEdit}>Edit</button>
                            </div>
                            <div className="vcp-contact-item">
                                <div className="vdb-stat-icon vdb-stat-icon--blue vcp-ci-icon"><PersonIcon fontSize="small" /></div>
                                <div className="vcp-ci-body">
                                    <span className="vcp-ci-label">Full Name</span>
                                    <span className="vcp-ci-value">{profile.name}</span>
                                </div>
                            </div>
                            <div className="vcp-contact-item">
                                <div className="vdb-stat-icon vdb-stat-icon--cyan vcp-ci-icon"><EmailIcon fontSize="small" /></div>
                                <div className="vcp-ci-body">
                                    <span className="vcp-ci-label">Email Address</span>
                                    <span className="vcp-ci-value">{profile.email}</span>
                                </div>
                            </div>
                            <div className="vcp-contact-item">
                                <div className="vdb-stat-icon vdb-stat-icon--indigo vcp-ci-icon"><PhoneIcon fontSize="small" /></div>
                                <div className="vcp-ci-body">
                                    <span className="vcp-ci-label">Phone Number</span>
                                    <span className="vcp-ci-value">{profile.phone_number || '—'}</span>
                                </div>
                            </div>
                            <div className="vcp-contact-item">
                                <div className="vdb-stat-icon vdb-stat-icon--blue vcp-ci-icon">{getVehicleIcon(profile.vehicle_type)}</div>
                                <div className="vcp-ci-body">
                                    <span className="vcp-ci-label">Vehicle Type</span>
                                    <span className="vcp-ci-value">
                                        {profile.vehicle_type === 'car' ? 'Car' : profile.vehicle_type === 'motorcycle' ? 'Motorcycle' : 'Truck'}
                                    </span>
                                </div>
                            </div>
                            <div className="vcp-contact-item vcp-contact-item--last">
                                <div className="vdb-stat-icon vdb-stat-icon--cyan vcp-ci-icon"><LocalOfferIcon fontSize="small" /></div>
                                <div className="vcp-ci-body">
                                    <span className="vcp-ci-label">Plate Number</span>
                                    <span className="vcp-ci-value">{profile.plate_number || '—'}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="vdb-col-right">
                        <section className="vdb-card">
                            <div className="vdb-card-header">
                                <div className="vdb-card-title"><AccountCircleIcon fontSize="small" /> Account</div>
                            </div>
                            <div className="vcp-account-avatar-wrap">
                                <div className="vcp-account-avatar">
                                    {profilePicture ? <img src={profilePicture} alt="profile" /> : getInitial(displayName)}
                                </div>
                                <p className="vcp-account-org">{displayName}</p>
                                <span className="vdb-status-badge vdb-status-badge--accepted vcp-role-badge">Volunteer</span>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* ── Edit Profile Modal ── */}
            {showEditModal && (
                <div className="vcp-modal-overlay" onClick={handleCloseEdit}>
                    <div className="vcp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="vcp-modal-header">
                            <h3 className="vcp-modal-title">Edit Profile</h3>
                            <button className="vcp-modal-close" onClick={handleCloseEdit}>×</button>
                        </div>
                        <div className="vcp-modal-body">
                            <label className="vcp-form-label">Full Name
                                <input className="vcp-form-input" type="text" name="name" value={editForm.name} onChange={handleEditChange} autoFocus />
                            </label>
                            <label className="vcp-form-label">Email
                                <input className="vcp-form-input" type="email" name="email" value={editForm.email} onChange={handleEditChange} />
                            </label>
                            <label className="vcp-form-label">Phone
                                <input className="vcp-form-input" type="tel" name="phone" value={editForm.phone} onChange={handleEditChange} />
                            </label>

                            <label className="vcp-form-label">Vehicle Type</label>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                                {['car', 'motorcycle', 'truck'].map(type => (
                                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <input
                                            type="radio"
                                            name="vehicle_type"
                                            value={type}
                                            checked={editForm.vehicle_type === type}
                                            onChange={() => handleVehicleTypeChange(type)}
                                        />
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </label>
                                ))}
                            </div>

                            <label className="vcp-form-label">Plate Number
                                <input className="vcp-form-input" type="text" name="plate_number" value={editForm.plate_number} onChange={handleEditChange} />
                            </label>

                            {editError && <p className="vcp-form-error">{editError}</p>}
                            {editSuccess && <p className="vcp-form-success">{editSuccess}</p>}
                        </div>
                        <div className="vcp-modal-footer">
                            <button className="vcp-btn-cancel" onClick={handleCloseEdit} disabled={editSaving}>Cancel</button>
                            <button className="vcp-btn-save" onClick={handleEditSubmit} disabled={editSaving}>
                                {editSaving ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Change Password Modal ── */}
            {showPwModal && (
                <div className="vcp-modal-overlay" onClick={handleClosePw}>
                    <div className="vcp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="vcp-modal-header">
                            <h3 className="vcp-modal-title">Change Password</h3>
                            <button className="vcp-modal-close" onClick={handleClosePw}>×</button>
                        </div>
                        <div className="vcp-modal-body">

                            <label className="vcp-form-label">Current Password</label>
                            <div className="vcp-password-wrapper">
                                <input
                                    className="vcp-form-input vcp-pw-input"
                                    type={showCurrentPw ? 'text' : 'password'}
                                    name="currentPassword"
                                    value={pwForm.currentPassword}
                                    onChange={handlePwChange}
                                    autoFocus
                                    placeholder="••••••••••"
                                />
                                <button type="button" className="vcp-eye-btn" tabIndex={-1} onClick={() => setShowCurrentPw(p => !p)}>
                                    {showCurrentPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                </button>
                            </div>

                            <label className="vcp-form-label">New Password</label>
                            <div className="vcp-password-wrapper">
                                <input
                                    className="vcp-form-input vcp-pw-input"
                                    type={showNewPw ? 'text' : 'password'}
                                    name="newPassword"
                                    value={pwForm.newPassword}
                                    onChange={handlePwChange}
                                />
                                <button type="button" className="vcp-eye-btn" tabIndex={-1} onClick={() => setShowNewPw(p => !p)}>
                                    {showNewPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                </button>
                            </div>

                            <label className="vcp-form-label">Confirm New Password</label>
                            <div className="vcp-password-wrapper">
                                <input
                                    className="vcp-form-input vcp-pw-input"
                                    type={showConfirmPw ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={pwForm.confirmPassword}
                                    onChange={handlePwChange}
                                />
                                <button type="button" className="vcp-eye-btn" tabIndex={-1} onClick={() => setShowConfirmPw(p => !p)}>
                                    {showConfirmPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                </button>
                            </div>

                            {pwError && <p className="vcp-form-error">{pwError}</p>}
                            {pwSuccess && <p className="vcp-form-success">{pwSuccess}</p>}
                        </div>
                        <div className="vcp-modal-footer">
                            <button className="vcp-btn-cancel" onClick={handleClosePw} disabled={pwSaving}>Cancel</button>
                            <button className="vcp-btn-save" onClick={handlePwSubmit} disabled={pwSaving}>
                                {pwSaving ? 'Saving…' : 'Change Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VolunteerProfile;