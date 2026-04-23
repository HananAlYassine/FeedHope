// ============================================================
//  FeedHope — Omar & Hanan — Pages/Admin/AdminMoneyDonations.js
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import '../../Styles/Admin/AdminMoneyDonations.css';

import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CloseIcon from '@mui/icons-material/Close';

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
};

const todayFormatted = () =>
    new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

const AdminMoneyDonations = () => {
    const navigate = useNavigate();

    // allDonations holds the full unfiltered list — used for stats
    // filtered view is derived from it using the active filter
    const [allDonations, setAllDonations] = useState([]);
    const [filter, setFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);

    // Reject modal
    const [rejectModal, setRejectModal] = useState({
        open: false, donationId: null, donorName: '', amount: '', reason: ''
    });

    // Fetch ALL donations once — filtering is done client-side
    // so stats always stay accurate regardless of which tab is active
    useEffect(() => { fetchAllDonations(); }, []);

    const fetchAllDonations = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('http://localhost:5000/api/admin/money-donations');
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to load.'); return; }
            setAllDonations(data);
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    // ── Derived values — recomputed on every render ──────────────
    // Stats always come from the full list regardless of active filter
    const stats = {
        pending: allDonations.filter(d => d.status === 'pending').length,
        approved: allDonations.filter(d => d.status === 'approved').length,
        totalApproved: allDonations
            .filter(d => d.status === 'approved')
            .reduce((sum, d) => sum + Number(d.amount), 0),
    };

    // Table rows respect the active filter tab
    const displayedDonations = filter === 'All'
        ? allDonations
        : allDonations.filter(d => d.status === filter.toLowerCase());

    // ── Toast ────────────────────────────────────────────────────
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Approve ──────────────────────────────────────────────────
    const handleApprove = async (donationId) => {
        try {
            const res = await fetch(
                `http://localhost:5000/api/admin/money-donations/${donationId}/approve`,
                { method: 'PUT' }
            );
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Approval failed.', 'error'); return; }
            showToast('Donation approved and added to balance.');
            fetchAllDonations(); // refresh the full list so stats update instantly
        } catch {
            showToast('Server error. Please try again.', 'error');
        }
    };

    // ── Reject ───────────────────────────────────────────────────
    const openRejectModal = (donation) => {
        setRejectModal({
            open: true,
            donationId: donation.donation_id,
            donorName: donation.donor_name,
            amount: donation.amount,
            reason: ''
        });
    };

    const handleRejectConfirm = async () => {
        if (!rejectModal.reason.trim()) {
            showToast('Please enter a rejection reason.', 'error');
            return;
        }
        try {
            const res = await fetch(
                `http://localhost:5000/api/admin/money-donations/${rejectModal.donationId}/reject`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: rejectModal.reason.trim() })
                }
            );
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Rejection failed.', 'error'); return; }
            showToast('Donation rejected.');
            setRejectModal({ open: false, donationId: null, donorName: '', amount: '', reason: '' });
            fetchAllDonations();
        } catch {
            showToast('Server error. Please try again.', 'error');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    const getStatusBadge = (status) => {
        const map = {
            pending: { label: 'Pending', cls: 'amd-badge--pending' },
            approved: { label: 'Approved', cls: 'amd-badge--approved' },
            rejected: { label: 'Rejected', cls: 'amd-badge--rejected' },
        };
        const s = map[status] || { label: status, cls: '' };
        return <span className={`amd-badge ${s.cls}`}>{s.label}</span>;
    };

    return (
        <div className="amd-layout">
            <AdminSidebar onLogout={handleLogout} />

            <main className="amd-main">
                <div className="amd-content-wrapper">

                    {/* Banner */}
                    <div className="amd-banner">
                        <div className="amd-banner-text">
                            <h1 className="amd-banner-title">Money Donations</h1>
                            <p className="amd-banner-subtitle">Review and manage all incoming donor donations</p>
                        </div>
                        <div className="amd-banner-date">
                            <CalendarTodayIcon sx={{ fontSize: 16 }} />
                            {todayFormatted()}
                        </div>
                    </div>

                    {/* Stats — always derived from full list, never stale */}
                    <div className="amd-stats-row">
                        <div className="amd-stat-card amd-stat-card--pending">
                            <div className="amd-stat-icon">
                                <HourglassEmptyIcon sx={{ fontSize: 22 }} />
                            </div>
                            <div className="amd-stat-info">
                                <span className="amd-stat-label">Pending Review</span>
                                <span className="amd-stat-value">{stats.pending}</span>
                            </div>
                        </div>
                        <div className="amd-stat-card amd-stat-card--approved">
                            <div className="amd-stat-icon">
                                <CheckCircleIcon sx={{ fontSize: 22 }} />
                            </div>
                            <div className="amd-stat-info">
                                <span className="amd-stat-label">Approved</span>
                                <span className="amd-stat-value">{stats.approved}</span>
                            </div>
                        </div>
                        <div className="amd-stat-card amd-stat-card--total">
                            <div className="amd-stat-icon">
                                <AttachMoneyIcon sx={{ fontSize: 22 }} />
                            </div>
                            <div className="amd-stat-info">
                                <span className="amd-stat-label">Total Approved</span>
                                <span className="amd-stat-value">${stats.totalApproved.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="amd-filter-bar">
                        {STATUS_FILTERS.map(f => (
                            <button
                                key={f}
                                className={`amd-filter-btn ${filter === f ? 'amd-filter-btn--active' : ''}`}
                                onClick={() => setFilter(f)}
                            >
                                {f}
                                {/* Show count badge on each tab */}
                                <span className="amd-filter-count">
                                    {f === 'All' ? allDonations.length
                                        : f === 'Pending' ? stats.pending
                                            : f === 'Approved' ? stats.approved
                                                : allDonations.filter(d => d.status === 'rejected').length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="amd-card">
                        {loading ? (
                            <div className="amd-loading">Loading donations…</div>
                        ) : error ? (
                            <div className="amd-error">
                                {error}
                                <button className="amd-retry-btn" onClick={fetchAllDonations}>Retry</button>
                            </div>
                        ) : displayedDonations.length === 0 ? (
                            <div className="amd-empty">No donations found for this filter.</div>
                        ) : (
                            <div className="amd-table-wrapper">
                                <table className="amd-table">
                                    <thead>
                                        <tr>
                                            <th>Reference</th>
                                            <th>Donor Name</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Date</th>
                                            <th>Status</th>
                                            <th>Description</th>
                                            <th>Rejection Reason</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedDonations.map((d) => (
                                            <tr key={d.donation_id} className={d.status === 'rejected' ? 'amd-row--rejected' : ''}>
                                                <td className="amd-td-ref">{d.reference_number || '—'}</td>
                                                <td className="amd-td-donor">{d.donor_name}</td>
                                                <td className="amd-td-amount">${Number(d.amount).toFixed(2)}</td>
                                                <td>{d.payment_method}</td>
                                                <td className="amd-td-date">{formatDate(d.donation_date)}</td>
                                                <td>{getStatusBadge(d.status)}</td>
                                                <td className="amd-td-note">
                                                    {d.description
                                                        ? <span className="amd-note-text">{d.description}</span>
                                                        : '—'
                                                    }
                                                </td>
                                                <td className="amd-td-rejection">
                                                    {d.status === 'rejected' && d.rejection_reason
                                                        ? <span className="amd-rejection-reason">❌ {d.rejection_reason}</span>
                                                        : '—'
                                                    }
                                                </td>
                                                <td className="amd-td-actions">
                                                    {d.status === 'pending' ? (
                                                        <div className="amd-action-btns">
                                                            <button className="amd-approve-btn" onClick={() => handleApprove(d.donation_id)}>
                                                                <CheckCircleIcon sx={{ fontSize: 15 }} /> Approve
                                                            </button>
                                                            <button className="amd-reject-btn" onClick={() => openRejectModal(d)}>
                                                                <CancelIcon sx={{ fontSize: 15 }} /> Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="amd-reviewed-at">
                                                            {d.reviewed_at ? formatDate(d.reviewed_at) : '—'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Reject Modal */}
            {rejectModal.open && (
                <div className="amd-modal-overlay" onClick={() => setRejectModal(prev => ({ ...prev, open: false }))}>
                    <div className="amd-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="amd-modal-header">
                            <h3>Reject Donation</h3>
                            <button className="amd-modal-close" onClick={() => setRejectModal(prev => ({ ...prev, open: false }))}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="amd-modal-body">
                            <p className="amd-modal-desc">
                                You are rejecting a <strong>${Number(rejectModal.amount).toFixed(2)}</strong> donation
                                from <strong>{rejectModal.donorName}</strong>. The donor will be notified with the reason below.
                            </p>
                            <label className="amd-modal-label">Rejection Reason *</label>
                            <textarea
                                className="amd-modal-textarea"
                                rows={4}
                                placeholder="e.g. Payment not received, incorrect reference number used..."
                                value={rejectModal.reason}
                                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                            />
                            <div className="amd-modal-actions">
                                <button className="amd-modal-cancel-btn" onClick={() => setRejectModal(prev => ({ ...prev, open: false }))}>
                                    Cancel
                                </button>
                                <button className="amd-modal-reject-btn" onClick={handleRejectConfirm}>
                                    <CancelIcon sx={{ fontSize: 16 }} /> Confirm Rejection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`amd-toast amd-toast--${toast.type}`}>{toast.msg}</div>}
        </div>
    );
};

export default AdminMoneyDonations;