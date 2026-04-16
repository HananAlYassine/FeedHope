// ============================================================
//  FeedHope — Volunteer Profile (No Address / Volunteer Type)
// ============================================================

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StarIcon from '@mui/icons-material/Star';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DeleteIcon from '@mui/icons-material/Delete';

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

    // Mock volunteer data – no address or volunteer_type
    const [profile, setProfile] = useState({
        name: 'John Doe',
        email: 'john.volunteer@example.com',
        phone_number: '+961 71 000 000',
        join_date: '2023-10-15',
        vehicle_type: 'car',        // 'car', 'motorcycle', 'truck'
        plate_number: 'ABC 123',
    });

    const [stats, setStats] = useState({
        deliveriesCompleted: 42,
        hoursLogged: 120,
        rating: 4.8
    });

    const [profilePicture, setProfilePicture] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: profile.name,
        email: profile.email,
        phone: profile.phone_number,
        vehicle_type: profile.vehicle_type,
        plate_number: profile.plate_number,
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

    // --- Mock profile picture handlers ---
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setTimeout(() => {
            const fakeUrl = URL.createObjectURL(file);
            setProfilePicture(fakeUrl);
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }, 1000);
    };

    const handleDeletePicture = () => {
        if (!window.confirm('Remove your profile picture?')) return;
        setUploading(true);
        setTimeout(() => {
            setProfilePicture(null);
            setUploading(false);
        }, 500);
    };

    // --- Edit handlers ---
    const handleOpenEdit = () => {
        setEditError('');
        setEditSuccess('');
        setEditForm({
            name: profile.name,
            email: profile.email,
            phone: profile.phone_number,
            vehicle_type: profile.vehicle_type,
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

    const handleEditSubmit = () => {
        setEditError('');
        setEditSuccess('');
        setEditSaving(true);

        // Simulate API save
        setTimeout(() => {
            setProfile(prev => ({
                ...prev,
                name: editForm.name,
                email: editForm.email,
                phone_number: editForm.phone,
                vehicle_type: editForm.vehicle_type,
                plate_number: editForm.plate_number,
            }));
            setEditSuccess('Profile updated successfully!');
            setEditSaving(false);
            setTimeout(() => handleCloseEdit(), 1200);
        }, 1000);
    };

    // --- Password handlers (unchanged) ---
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
    const handlePwSubmit = () => {
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
        setTimeout(() => {
            setPwSuccess('Password changed successfully!');
            setPwSaving(false);
            setTimeout(() => handleClosePw(), 1200);
        }, 1000);
    };

    const handleLogout = () => {
        navigate('/signin');
    };

    // Helper to get vehicle icon
    const getVehicleIcon = (type) => {
        switch (type) {
            case 'car': return <DirectionsCarIcon fontSize="small" />;
            case 'motorcycle': return <TwoWheelerIcon fontSize="small" />;
            case 'truck': return <LocalShippingIcon fontSize="small" />;
            default: return <DirectionsCarIcon fontSize="small" />;
        }
    };

    const displayName = profile.name || '—';
    const phone = profile.phone_number || '—';

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
                        {profilePicture ? (
                            <img src={profilePicture} alt="profile" />
                        ) : (
                            getInitial(displayName)
                        )}
                    </div>
                    <div className="vcp-banner-actions">
                        <button className="vdb-banner-btn" onClick={handleOpenEdit}>
                            <EditIcon style={{ fontSize: 15, marginRight: 6 }} />
                            Edit Profile
                        </button>
                        <button className="vdb-banner-btn vdb-banner-btn--outline" onClick={handleOpenPw}>
                            <LockIcon style={{ fontSize: 15, marginRight: 6 }} />
                            Change Password
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
                        <div className="vdb-stat-icon vdb-stat-icon--cyan"><AccessTimeIcon /></div>
                        <div className="vdb-stat-info">
                            <span className="vdb-stat-number">{stats.hoursLogged}h</span>
                            <span className="vdb-stat-label">Hours Logged</span>
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

                {/* Two‑column grid */}
                <div className="vdb-grid">
                    {/* LEFT COLUMN: Contact & Vehicle Info */}
                    <div className="vdb-col-left">
                        <section className="vdb-card">
                            <div className="vdb-card-header">
                                <div className="vdb-card-title">
                                    <AccountCircleIcon fontSize="small" />
                                    Contact Information
                                </div>
                                <button className="vdb-btn-edit" onClick={handleOpenEdit}>Edit</button>
                            </div>
                            {/* Full Name */}
                            <div className="vcp-contact-item">
                                <div className="vdb-stat-icon vdb-stat-icon--blue vcp-ci-icon"><PersonIcon fontSize="small" /></div>
                                <div className="vcp-ci-body">
                                    <span className="vcp-ci-label">Full Name</span>
                                    <span className="vcp-ci-value">{profile.name}</span>
                                </div>
                            </div>
                            {/* Email */}
                            <div className="vcp-contact-item">
                                <div className="vdb-stat-icon vdb-stat-icon--cyan vcp-ci-icon"><EmailIcon fontSize="small" /></div>
                                <div className="vcp-ci-body">
                                    <span className="vcp-ci-label">Email Address</span>
                                    <span className="vcp-ci-value">{profile.email}</span>
                                </div>
                            </div>
                            {/* Phone Number */}
                            <div className="vcp-contact-item">
                                <div className="vdb-stat-icon vdb-stat-icon--indigo vcp-ci-icon"><PhoneIcon fontSize="small" /></div>
                                <div className="vcp-ci-body">
                                    <span className="vcp-ci-label">Phone Number</span>
                                    <span className="vcp-ci-value">{phone}</span>
                                </div>
                            </div>
                            {/* Vehicle Type */}
                            <div className="vcp-contact-item">
                                <div className="vdb-stat-icon vdb-stat-icon--blue vcp-ci-icon">{getVehicleIcon(profile.vehicle_type)}</div>
                                <div className="vcp-ci-body">
                                    <span className="vcp-ci-label">Vehicle Type</span>
                                    <span className="vcp-ci-value">
                                        {profile.vehicle_type === 'car' ? 'Car' : profile.vehicle_type === 'motorcycle' ? 'Motorcycle' : 'Truck'}
                                    </span>
                                </div>
                            </div>
                            {/* Plate Number */}
                            <div className="vcp-contact-item vcp-contact-item--last">
                                <div className="vdb-stat-icon vdb-stat-icon--cyan vcp-ci-icon"><LocalOfferIcon fontSize="small" /></div>
                                <div className="vcp-ci-body">
                                    <span className="vcp-ci-label">Plate Number</span>
                                    <span className="vcp-ci-value">{profile.plate_number}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Account & Avatar */}
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
                                <div className="vcp-picture-actions">
                                    <button className="vcp-picture-btn vcp-change-btn" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                                        <CameraAltIcon style={{ fontSize: 16, marginRight: 6 }} /> Change Profile Picture
                                    </button>
                                    <button className="vcp-picture-btn vcp-delete-btn" onClick={handleDeletePicture} disabled={uploading || !profilePicture}>
                                        <DeleteIcon style={{ fontSize: 16, marginRight: 6 }} /> Delete Profile Picture
                                    </button>
                                </div>
                                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* Edit Profile Modal – No address or volunteer_type */}
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

                            {/* Vehicle Type Radio Buttons */}
                            <label className="vcp-form-label">Vehicle Type</label>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <input type="radio" name="vehicle_type" value="car" checked={editForm.vehicle_type === 'car'} onChange={() => handleVehicleTypeChange('car')} />
                                    Car
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <input type="radio" name="vehicle_type" value="motorcycle" checked={editForm.vehicle_type === 'motorcycle'} onChange={() => handleVehicleTypeChange('motorcycle')} />
                                    Motorcycle
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <input type="radio" name="vehicle_type" value="truck" checked={editForm.vehicle_type === 'truck'} onChange={() => handleVehicleTypeChange('truck')} />
                                    Truck
                                </label>
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

            {/* Change Password Modal (unchanged) */}
            {showPwModal && (
                <div className="vcp-modal-overlay" onClick={handleClosePw}>
                    <div className="vcp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="vcp-modal-header">
                            <h3 className="vcp-modal-title">Change Password</h3>
                            <button className="vcp-modal-close" onClick={handleClosePw}>×</button>
                        </div>
                        <div className="vcp-modal-body">
                            <label className="vcp-form-label">Current Password
                                <input className="vcp-form-input" type="password" name="currentPassword" value={pwForm.currentPassword} onChange={handlePwChange} autoFocus placeholder="••••••••••" />
                            </label>
                            <label className="vcp-form-label">New Password
                                <input className="vcp-form-input" type="password" name="newPassword" value={pwForm.newPassword} onChange={handlePwChange} />
                            </label>
                            <label className="vcp-form-label">Confirm New Password
                                <input className="vcp-form-input" type="password" name="confirmPassword" value={pwForm.confirmPassword} onChange={handlePwChange} />
                            </label>
                            {pwError && <p className="vcp-form-error">{pwError}</p>}
                            {pwSuccess && <p className="vcp-form-success">{pwSuccess}</p>}
                        </div>
                        <div className="vcp-modal-footer">
                            <button className="vcp-btn-cancel" onClick={handleClosePw} disabled={pwSaving}>Cancel</button>
                            <button className="vcp-btn-save" onClick={handlePwSubmit} disabled={pwSaving}>{pwSaving ? 'Saving…' : 'Change Password'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VolunteerProfile;