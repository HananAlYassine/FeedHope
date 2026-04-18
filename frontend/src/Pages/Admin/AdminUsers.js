// ============================================================
//  FeedHope — Omar & Hanan — Pages/Admin/AdminUsers.js
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';  
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import '../../Styles/Admin/AdminUsers.css';

// ── MUI Icons ────────────────────────────────────────────────
import SearchIcon        from '@mui/icons-material/Search';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import EditIcon          from '@mui/icons-material/Edit';
import BlockIcon         from '@mui/icons-material/Block';
import LockOpenIcon      from '@mui/icons-material/LockOpen';
import DeleteIcon        from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon        from '@mui/icons-material/Person';

// ── Backend base URL ──────────────────────
const BACKEND_URL = 'http://localhost:5000';

// ── Helpers ──────────────────────────────────────────────────

/* Format a date string into "12 Apr 2025" */
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
};

/* Today's date as "Saturday, 18 April 2026" */
const todayFormatted = () =>
    new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

/* Convert relative image path to full URL */
const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    // Remove leading slash if present to avoid double slash
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${BACKEND_URL}/${cleanPath}`;
};

// ── Badge config: maps each role to a CSS modifier class ─────
const ROLE_BADGE = {
    Admin:     'aum-badge--admin',
    Donor:     'aum-badge--donor',
    Receiver:  'aum-badge--receiver',
    Volunteer: 'aum-badge--volunteer',
};

// ── Main Component ────────────────────────────────────────────
const AdminUsers = () => {
    const navigate = useNavigate(); 

    // ── State: data & loading ────────────────────────────────
    const [users,        setUsers]        = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);

    // ── State: filters ───────────────────────────────────────
    const [search,       setSearch]       = useState('');
    const [filterRole,   setFilterRole]   = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // ── State: modals ────────────────────────────────────────
    const [viewUser,     setViewUser]     = useState(null);  // User object for View modal
    const [editUser,     setEditUser]     = useState(null);  // User object for Edit modal
    const [blockUser,    setBlockUser]    = useState(null);  // User object for Block confirm
    const [unblockUser,  setUnblockUser]  = useState(null);  // User object for Unblock confirm
    const [deleteUser,   setDeleteUser]   = useState(null);  // User object for Delete confirm

    // ── State: edit form fields ──────────────────────────────
    const [editForm,     setEditForm]     = useState({
        name: '', email: '', phone: '', status: '',
    });

    // ── State: feedback ──────────────────────────────────────
    const [actionLoading, setActionLoading] = useState(false);
    const [toast,         setToast]         = useState(null);

    // ── Fetch all users from the backend ────────────────────
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res  = await fetch(`${BACKEND_URL}/api/admin/users`);
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to load users.'); return; }
            setUsers(data.users || []);
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    /* Run on mount */
    useEffect(() => { fetchUsers(); }, []);

    // ── Toast helper ─────────────────────────────────────────
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Client-side filtering ────────────────────────────────
    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch =
            !q ||
            (u.name  || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q);
        const matchRole   = !filterRole   || u.role   === filterRole;
        const matchStatus = !filterStatus || (u.status || '').toLowerCase() === filterStatus.toLowerCase();
        return matchSearch && matchRole && matchStatus;
    });

    // ── Open Edit modal: pre-fill form with current user data ─
    const handleOpenEdit = (user) => {
        const displayStatus = user.status === 'active' ? 'Active' : (user.status === 'blocked' ? 'Blocked' : user.status || 'Active');
        setEditForm({
            name:   user.name   || '',
            email:  user.email  || '',
            phone:  user.phone  || '',
            status: displayStatus,
        });
        setEditUser(user);
    };

    // ── Submit edited user data to the backend ───────────────
    const handleEditSubmit = async () => {
        if (!editUser) return;
        setActionLoading(true);
        try {
            const backendStatus = editForm.status === 'Active' ? 'active' : 'blocked';
            const res  = await fetch(`${BACKEND_URL}/api/admin/users/${editUser.user_id}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    name: editForm.name,
                    email: editForm.email,
                    phone: editForm.phone,
                    status: backendStatus,
                }),
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Update failed.', 'error'); return; }
            showToast('User updated successfully.');
            setEditUser(null);
            fetchUsers();
        } catch {
            showToast('Server error.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Block a user ─────────────────────────────────────────
    const handleBlockConfirm = async () => {
        if (!blockUser) return;
        setActionLoading(true);
        try {
            const res  = await fetch(`${BACKEND_URL}/api/admin/users/${blockUser.user_id}/block`, {
                method: 'PUT',
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Block failed.', 'error'); return; }
            showToast(`${blockUser.name} has been blocked.`);
            setBlockUser(null);
            fetchUsers();
        } catch {
            showToast('Server error.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Unblock a user ───────────────────────────────────────
    const handleUnblockConfirm = async () => {
        if (!unblockUser) return;
        setActionLoading(true);
        try {
            const res  = await fetch(`${BACKEND_URL}/api/admin/users/${unblockUser.user_id}/unblock`, {
                method: 'PUT',
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Unblock failed.', 'error'); return; }
            showToast(`${unblockUser.name} has been unblocked.`);
            setUnblockUser(null);
            fetchUsers();
        } catch {
            showToast('Server error.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Delete a user ─────────────────────────────────────────
    const handleDeleteConfirm = async () => {
        if (!deleteUser) return;
        setActionLoading(true);
        try {
            const res  = await fetch(`${BACKEND_URL}/api/admin/users/${deleteUser.user_id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Delete failed.', 'error'); return; }
            showToast(`${deleteUser.name} has been deleted.`);
            setDeleteUser(null);
            fetchUsers();
        } catch {
            showToast('Server error.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Helper to display readable status
    const getDisplayStatus = (status) => {
        if (status === 'active') return 'Active';
        if (status === 'blocked') return 'Blocked';
        return status || 'Active';
    };

    // ── Logout handler ──────────────────────────────────────
    const handleLogout = () => {                            
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // ── Render ───────────────────────────────────────────────
    return (
        <div className="aum-layout">

            <AdminSidebar onLogout={handleLogout} activePage="users"/>

            <main className="aum-main">
                <div className="aum-content-wrapper">

                    {/* BANNER */}
                    <div className="aum-banner">
                        <div className="aum-banner-text">
                            <h1 className="aum-banner-title">User Management</h1>
                            <p className="aum-banner-subtitle">
                                Manage and monitor all registered users
                            </p>
                        </div>
                        <div className="aum-banner-date">
                            <CalendarTodayIcon sx={{ fontSize: 15 }} />
                            {todayFormatted()}
                        </div>
                    </div>

                    {/* TABLE CARD */}
                    <div className="aum-card">

                        {/* Filter bar */}
                        <div className="aum-filters">
                            <div className="aum-search-wrap">
                                <SearchIcon className="aum-search-icon" sx={{ fontSize: 18 }} />
                                <input
                                    className="aum-search"
                                    type="text"
                                    placeholder="Search users by name or email"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="aum-select"
                                value={filterRole}
                                onChange={e => setFilterRole(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                <option value="Admin">Admin</option>
                                <option value="Donor">Donor</option>
                                <option value="Receiver">Receiver</option>
                                <option value="Volunteer">Volunteer</option>
                            </select>
                            <select
                                className="aum-select"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Blocked">Blocked</option>
                            </select>
                        </div>

                        <div className="aum-table-wrap">
                            {loading && (
                                <div className="aum-state-msg">Loading users…</div>
                            )}
                            {error && !loading && (
                                <div className="aum-state-msg aum-state-msg--error">
                                    {error}
                                    <button className="aum-retry-btn" onClick={fetchUsers}>
                                        Retry
                                    </button>
                                </div>
                            )}
                            {!loading && !error && (
                                <table className="aum-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Joined</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="aum-empty">
                                                    No users match your filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map(user => {
                                                const profilePicUrl = getImageUrl(user.profile_picture);
                                                return (
                                                    <tr key={user.user_id}>
                                                        <td>
                                                            <div className="aum-user-cell">
                                                                {profilePicUrl ? (
                                                                    <img
                                                                        className="aum-avatar"
                                                                        src={profilePicUrl}
                                                                        alt={user.name}
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.style.display = 'none';
                                                                            // Show fallback letter avatar
                                                                            const parent = e.target.parentElement;
                                                                            const fallbackDiv = document.createElement('div');
                                                                            fallbackDiv.className = 'aum-avatar aum-avatar--initial';
                                                                            fallbackDiv.textContent = (user.name || '?')[0].toUpperCase();
                                                                            e.target.replaceWith(fallbackDiv);
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="aum-avatar aum-avatar--initial">
                                                                        {(user.name || '?')[0].toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <span className="aum-td-name">
                                                                    {user.name || '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td>{user.email || '—'}</td>
                                                        <td>
                                                            <span className={`aum-badge ${ROLE_BADGE[user.role] || ''}`}>
                                                                {user.role || '—'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`aum-badge ${user.status?.toLowerCase() === 'blocked' ? 'aum-badge--blocked' : 'aum-badge--active'}`}>
                                                                {getDisplayStatus(user.status)}
                                                            </span>
                                                        </td>
                                                        <td>{formatDate(user.created_at)}</td>
                                                        <td>
                                                            <div className="aum-actions">
                                                                <button
                                                                    className="aum-action-btn aum-action-btn--view"
                                                                    title="View details"
                                                                    onClick={() => setViewUser(user)}
                                                                >
                                                                    <VisibilityIcon sx={{ fontSize: 15 }} />
                                                                    View
                                                                </button>
                                                                <button
                                                                    className="aum-action-btn aum-action-btn--edit"
                                                                    title="Edit user"
                                                                    onClick={() => handleOpenEdit(user)}
                                                                >
                                                                    <EditIcon sx={{ fontSize: 15 }} />
                                                                    Edit
                                                                </button>
                                                                {user.status?.toLowerCase() === 'blocked' ? (
                                                                    <button
                                                                        className="aum-action-btn aum-action-btn--unblock"
                                                                        title="Unblock user"
                                                                        onClick={() => setUnblockUser(user)}
                                                                    >
                                                                        <LockOpenIcon sx={{ fontSize: 15 }} />
                                                                        Unblock
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        className="aum-action-btn aum-action-btn--block"
                                                                        title="Block user"
                                                                        onClick={() => setBlockUser(user)}
                                                                    >
                                                                        <BlockIcon sx={{ fontSize: 15 }} />
                                                                        Block
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className="aum-action-btn aum-action-btn--delete"
                                                                    title="Delete user"
                                                                    onClick={() => setDeleteUser(user)}
                                                                >
                                                                    <DeleteIcon sx={{ fontSize: 15 }} />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* MODAL — VIEW USER DETAILS */}
            {viewUser && (
                <div className="aum-modal-backdrop" onClick={() => setViewUser(null)}>
                    <div className="aum-modal" onClick={e => e.stopPropagation()}>
                        <div className="aum-modal-header">
                            <div className="aum-modal-header-icon aum-modal-header-icon--info">
                                <VisibilityIcon sx={{ fontSize: 20 }} />
                            </div>
                            <div>
                                <h2 className="aum-modal-title">User Details</h2>
                                <p className="aum-modal-subtitle">Information for this user account</p>
                            </div>
                            <button className="aum-modal-close" onClick={() => setViewUser(null)}>✕</button>
                        </div>
                        <div className="aum-modal-body">
                            <div className="aum-profile-card">
                                {(() => {
                                    const picUrl = getImageUrl(viewUser.profile_picture);
                                    if (picUrl) {
                                        return (
                                            <img
                                                className="aum-profile-avatar"
                                                src={picUrl}
                                                alt={viewUser.name}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.style.display = 'none';
                                                    const parent = e.target.parentElement;
                                                    const fallbackDiv = document.createElement('div');
                                                    fallbackDiv.className = 'aum-profile-avatar aum-profile-avatar--initial';
                                                    fallbackDiv.textContent = (viewUser.name || '?')[0].toUpperCase();
                                                    e.target.replaceWith(fallbackDiv);
                                                }}
                                            />
                                        );
                                    } else {
                                        return (
                                            <div className="aum-profile-avatar aum-profile-avatar--initial">
                                                {(viewUser.name || '?')[0].toUpperCase()}
                                            </div>
                                        );
                                    }
                                })()}
                                <div className="aum-profile-info">
                                    <strong className="aum-profile-name">{viewUser.name || '—'}</strong>
                                    <span className={`aum-badge ${ROLE_BADGE[viewUser.role] || ''}`}>
                                        {viewUser.role || '—'}
                                    </span>
                                </div>
                            </div>

                            <div className="aum-section-title">User Details</div>
                            <div className="aum-detail-grid">
                                <div className="aum-detail-row">
                                    <span>Email</span>
                                    <strong>{viewUser.email || '—'}</strong>
                                </div>
                                {viewUser.role !== 'Receiver' && (
                                    <div className="aum-detail-row">
                                        <span>Phone Number</span>
                                        <strong>{viewUser.phone || '—'}</strong>
                                    </div>
                                )}
                                {viewUser.role === 'Receiver' && (
                                    <div className="aum-detail-row">
                                        <span>Address</span>
                                        <strong>{viewUser.address || '—'}</strong>
                                    </div>
                                )}
                                <div className="aum-detail-row">
                                    <span>Joined</span>
                                    <strong>{formatDate(viewUser.created_at)}</strong>
                                </div>
                                <div className="aum-detail-row">
                                    <span>Status</span>
                                    <span className={`aum-badge ${viewUser.status?.toLowerCase() === 'blocked' ? 'aum-badge--blocked' : 'aum-badge--active'}`}>
                                        {getDisplayStatus(viewUser.status)}
                                    </span>
                                </div>
                            </div>

                            <div className="aum-section-title">Role Information</div>
                            <div className="aum-detail-grid">
                                {viewUser.role === 'Volunteer' && (
                                    <>
                                        <div className="aum-detail-row">
                                            <span>Vehicle Type</span>
                                            <strong>{viewUser.vehicle_type || '—'}</strong>
                                        </div>
                                        <div className="aum-detail-row">
                                            <span>License Plate</span>
                                            <strong>{viewUser.plate_number || '—'}</strong>
                                        </div>
                                        <div className="aum-detail-row">
                                            <span>Total Deliveries</span>
                                            <strong>{viewUser.total_deliveries ?? 0}</strong>
                                        </div>
                                        <div className="aum-detail-row">
                                            <span>Rating</span>
                                            <strong>{viewUser.volunteer_rating ? `${viewUser.volunteer_rating} / 5` : '—'}</strong>
                                        </div>
                                    </>
                                )}
                                {viewUser.role === 'Receiver' && (
                                    <>
                                        <div className="aum-detail-row">
                                            <span>Organization Type</span>
                                            <strong>{viewUser.business_type || '—'}</strong>
                                        </div>
                                        <div className="aum-detail-row">
                                            <span>Address</span>
                                            <strong>{viewUser.address || '—'}</strong>
                                        </div>
                                        <div className="aum-detail-row">
                                            <span>Total Received</span>
                                            <strong>{viewUser.total_received ?? 0}</strong>
                                        </div>
                                        <div className="aum-detail-row">
                                            <span>People Served</span>
                                            <strong>{viewUser.people_served ?? 0}</strong>
                                        </div>
                                    </>
                                )}
                                {viewUser.role === 'Donor' && (
                                    <>
                                        <div className="aum-detail-row">
                                            <span>Business Type</span>
                                            <strong>{viewUser.business_type || '—'}</strong>
                                        </div>
                                        <div className="aum-detail-row">
                                            <span>Address</span>
                                            <strong>{viewUser.address || '—'}</strong>
                                        </div>
                                        <div className="aum-detail-row">
                                            <span>Total Donations</span>
                                            <strong>{viewUser.total_donations ?? 0}</strong>
                                        </div>
                                        <div className="aum-detail-row">
                                            <span>Rating</span>
                                            <strong>{viewUser.donor_rating ? `${viewUser.donor_rating} / 5` : '—'}</strong>
                                        </div>
                                    </>
                                )}
                                {viewUser.role === 'Admin' && (
                                    <div className="aum-detail-row">
                                        <span>Role Information</span>
                                        <strong>No additional information for Admin accounts.</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="aum-modal-footer">
                            <button className="aum-btn-confirm" onClick={() => setViewUser(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL — EDIT USER */}
            {editUser && (
                <div className="aum-modal-backdrop" onClick={() => setEditUser(null)}>
                    <div className="aum-modal aum-modal--sm" onClick={e => e.stopPropagation()}>
                        <div className="aum-modal-header">
                            <div className="aum-modal-header-icon aum-modal-header-icon--edit">
                                <EditIcon sx={{ fontSize: 20 }} />
                            </div>
                            <div>
                                <h2 className="aum-modal-title">Edit User</h2>
                                <p className="aum-modal-subtitle">Update account information</p>
                            </div>
                            <button className="aum-modal-close" onClick={() => setEditUser(null)}>✕</button>
                        </div>
                        <div className="aum-modal-body">
                            <div className="aum-form-group">
                                <label className="aum-label">Full Name</label>
                                <input
                                    className="aum-input"
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                />
                            </div>
                            <div className="aum-form-group">
                                <label className="aum-label">Email</label>
                                <input
                                    className="aum-input"
                                    type="email"
                                    value={editForm.email}
                                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                            <div className="aum-form-group">
                                <label className="aum-label">Phone Number</label>
                                <input
                                    className="aum-input"
                                    type="text"
                                    value={editForm.phone}
                                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                />
                            </div>
                            <div className="aum-form-group">
                                <label className="aum-label">Status</label>
                                <select
                                    className="aum-input aum-input--select"
                                    value={editForm.status}
                                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Blocked">Blocked</option>
                                </select>
                            </div>
                            <div className="aum-modal-actions">
                                <button className="aum-btn-cancel" onClick={() => setEditUser(null)}>
                                    Cancel
                                </button>
                                <button
                                    className="aum-btn-confirm"
                                    onClick={handleEditSubmit}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL — BLOCK USER CONFIRMATION */}
            {blockUser && (
                <div className="aum-modal-backdrop" onClick={() => setBlockUser(null)}>
                    <div className="aum-modal aum-modal--confirm" onClick={e => e.stopPropagation()}>
                        <div className="aum-modal-header aum-modal-header--danger">
                            <div className="aum-modal-header-icon aum-modal-header-icon--danger">
                                <BlockIcon sx={{ fontSize: 20 }} />
                            </div>
                            <h2 className="aum-modal-title aum-modal-title--light">Block User</h2>
                        </div>
                        <div className="aum-modal-body aum-modal-body--confirm">
                            <p className="aum-confirm-headline">
                                Are you sure you want to block{' '}
                                <strong>{blockUser.name}</strong>?
                            </p>
                            <p className="aum-confirm-sub">
                                They will be unable to log in or use the platform.
                            </p>
                            <div className="aum-modal-actions">
                                <button
                                    className="aum-btn-cancel"
                                    onClick={() => setBlockUser(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="aum-btn-confirm aum-btn-danger"
                                    onClick={handleBlockConfirm}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Blocking…' : 'Block'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL — UNBLOCK USER CONFIRMATION */}
            {unblockUser && (
                <div className="aum-modal-backdrop" onClick={() => setUnblockUser(null)}>
                    <div className="aum-modal aum-modal--confirm" onClick={e => e.stopPropagation()}>
                        <div className="aum-modal-header aum-modal-header--unblock">
                            <div className="aum-modal-header-icon aum-modal-header-icon--unblock">
                                <LockOpenIcon sx={{ fontSize: 20 }} />
                            </div>
                            <h2 className="aum-modal-title aum-modal-title--light">Unblock User</h2>
                        </div>
                        <div className="aum-modal-body aum-modal-body--confirm">
                            <p className="aum-confirm-headline">
                                Are you sure you want to unblock{' '}
                                <strong>{unblockUser.name}</strong>?
                            </p>
                            <p className="aum-confirm-sub">
                                They will regain full access to log in and use the platform.
                            </p>
                            <div className="aum-modal-actions">
                                <button
                                    className="aum-btn-cancel"
                                    onClick={() => setUnblockUser(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="aum-btn-confirm aum-btn-unblock"
                                    onClick={handleUnblockConfirm}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Unblocking…' : 'Unblock'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL — DELETE USER CONFIRMATION */}
            {deleteUser && (
                <div className="aum-modal-backdrop" onClick={() => setDeleteUser(null)}>
                    <div className="aum-modal aum-modal--confirm" onClick={e => e.stopPropagation()}>
                        <div className="aum-modal-header aum-modal-header--danger">
                            <div className="aum-modal-header-icon aum-modal-header-icon--danger">
                                <DeleteIcon sx={{ fontSize: 20 }} />
                            </div>
                            <h2 className="aum-modal-title aum-modal-title--light">Delete User</h2>
                        </div>
                        <div className="aum-modal-body aum-modal-body--confirm">
                            <p className="aum-confirm-headline">
                                Are you sure you want to permanently delete{' '}
                                <strong>{deleteUser.name}</strong>?
                            </p>
                            <p className="aum-confirm-sub">
                                This action cannot be undone.
                            </p>
                            <div className="aum-modal-actions">
                                <button
                                    className="aum-btn-cancel"
                                    onClick={() => setDeleteUser(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="aum-btn-confirm aum-btn-danger"
                                    onClick={handleDeleteConfirm}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast notification */}
            {toast && (
                <div className={`aum-toast aum-toast--${toast.type}`}>
                    {toast.msg}
                </div>
            )}

        </div>
    );
};

export default AdminUsers;