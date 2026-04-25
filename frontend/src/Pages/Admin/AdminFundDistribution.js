// ============================================================
//  FeedHope — Omar & Hanan — Pages/Admin/AdminFundDistribution.js
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import '../../Styles/Admin/AdminFundDistribution.css';

import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const PAYMENT_METHODS = ['Bank Transfer', 'OMT', 'WishMoney'];

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

const todayFormatted = () =>
    new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

const getStatusBadge = (status) => {
    const map = {
        pending: { label: 'Pending', cls: 'afd-badge--pending' },
        completed: { label: 'Completed', cls: 'afd-badge--completed' },
        rejected: { label: 'Rejected', cls: 'afd-badge--rejected' },
    };
    const s = map[status] || { label: status, cls: '' };
    return <span className={`afd-badge ${s.cls}`}>{s.label}</span>;
};

const AdminFundDistribution = () => {
    const navigate = useNavigate();
    const storedUser = JSON.parse(localStorage.getItem('feedhope_user') || '{}');
    const adminId = storedUser.admin_id ?? null;

    const [stats, setStats] = useState({ totalDistributed: 0, balance: 0 });
    const [history, setHistory] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // ── Approve Modal ──
    const [approveModal, setApproveModal] = useState({
        open: false, request: null, paymentMethod: '', notes: ''
    });

    // ── Reject Modal ──
    const [rejectModal, setRejectModal] = useState({
        open: false, request: null, reason: ''
    });

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);
            setError(null);
            const [distRes, reqRes] = await Promise.all([
                fetch('http://localhost:5000/api/admin/fund-distribution'),
                fetch('http://localhost:5000/api/admin/money-requests')
            ]);
            const distData = await distRes.json();
            const reqData = await reqRes.json();
            if (!distRes.ok) throw new Error(distData.error || 'Failed to load distributions.');
            if (!reqRes.ok) throw new Error(reqData.error || 'Failed to load requests.');
            setStats({
                totalDistributed: distData.totalDistributed ?? 0,
                balance: distData.balance ?? 0,
            });
            setHistory(distData.distributions ?? []);
            setRequests(reqData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const showToastMsg = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Open Approve Modal ──
    const openApproveModal = (request) => {
        setApproveModal({
            open: true,
            request,
            paymentMethod: '',
            notes: ''
        });
    };

    // ── Confirm Approval ──
    const handleApproveConfirm = async () => {
        if (!approveModal.paymentMethod) {
            showToastMsg('Please select a payment method.', 'error');
            return;
        }
        setActionLoading(true);
        try {
            const res = await fetch(
                `http://localhost:5000/api/admin/money-requests/${approveModal.request.request_id}/approve`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        adminId,
                        paymentMethod: approveModal.paymentMethod,
                        notes: approveModal.notes
                    })
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Approval failed.');
            showToastMsg(`Request approved. Funds distributed. Ref: ${data.distributionRef}`);
            setApproveModal({ open: false, request: null, paymentMethod: '', notes: '' });
            fetchAll();
        } catch (err) {
            showToastMsg(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Open Reject Modal ──
    const openRejectModal = (request) => {
        setRejectModal({ open: true, request, reason: '' });
    };

    // ── Confirm Rejection ──
    const handleRejectConfirm = async () => {
        if (!rejectModal.reason.trim()) {
            showToastMsg('Please provide a rejection reason.', 'error');
            return;
        }
        setActionLoading(true);
        try {
            const res = await fetch(
                `http://localhost:5000/api/admin/money-requests/${rejectModal.request.request_id}/reject`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: rejectModal.reason.trim() })
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Rejection failed.');
            showToastMsg('Request rejected.');
            setRejectModal({ open: false, request: null, reason: '' });
            fetchAll();
        } catch (err) {
            showToastMsg(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    const displayedHistory = history.slice(0, 5);
    const hasMore = history.length > 5;

    return (
        <div className="afd-layout">
            <AdminSidebar onLogout={handleLogout} />

            <main className="afd-main">
                <div className="afd-content-wrapper">
                    <div className="afd-banner">
                        <div className="afd-banner-text">
                            <h1 className="afd-banner-title">Fund Distribution</h1>
                            <p className="afd-banner-subtitle">Review donor requests and manage distributions</p>
                        </div>
                        <div className="afd-banner-date">
                            <CalendarTodayIcon sx={{ fontSize: 16 }} />
                            {todayFormatted()}
                        </div>
                    </div>

                    {loading && <div className="afd-loading">Loading...</div>}
                    {error && !loading && (
                        <div className="afd-error">
                            {error}
                            <button className="afd-retry-btn" onClick={fetchAll}>Retry</button>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {/* Stats */}
                            <div className="afd-stats-row">
                                <div className="afd-stat-card afd-stat-card--distributed">
                                    <div className="afd-stat-icon"><TrendingUpIcon sx={{ fontSize: 24 }} /></div>
                                    <div className="afd-stat-info">
                                        <span className="afd-stat-label">Total Distributed</span>
                                        <span className="afd-stat-value">${Number(stats.totalDistributed).toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="afd-stat-card afd-stat-card--balance">
                                    <div className="afd-stat-icon"><AccountBalanceWalletIcon sx={{ fontSize: 24 }} /></div>
                                    <div className="afd-stat-info">
                                        <span className="afd-stat-label">Available Balance</span>
                                        <span className="afd-stat-value">${Number(stats.balance).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Two-column grid: Requests (left) + History (right) */}
                            <div className="afd-grid">
                                {/* Money Requests Section (Pending) */}
                                <div className="afd-panel afd-requests-panel">
                                    <div className="afd-panel-header">
                                        <h2 className="afd-panel-title">Pending Donor Requests</h2>
                                        <span className="afd-panel-count">{requests.length}</span>
                                    </div>
                                    {requests.length === 0 ? (
                                        <div className="afd-empty">No pending requests.</div>
                                    ) : (
                                        <div className="afd-requests-list">
                                            {requests.map(req => (
                                                <div key={req.request_id} className="afd-request-card">
                                                    <div className="afd-request-header">
                                                        <span className="afd-request-donor">{req.donor_name}</span>
                                                        <span className="afd-request-amount">${Number(req.amount).toFixed(2)}</span>
                                                    </div>
                                                    <div className="afd-request-reason">{req.reason}</div>
                                                    <div className="afd-request-meta">
                                                        <span className="afd-request-ref">{req.reference_number || '—'}</span>
                                                        <span className="afd-request-date">{formatDate(req.request_date)}</span>
                                                    </div>
                                                    <div className="afd-request-actions">
                                                        <button
                                                            className="afd-approve-btn"
                                                            onClick={() => openApproveModal(req)}
                                                            disabled={actionLoading}
                                                        >
                                                            <CheckCircleIcon sx={{ fontSize: 16 }} /> Approve
                                                        </button>
                                                        <button
                                                            className="afd-reject-btn"
                                                            onClick={() => openRejectModal(req)}
                                                            disabled={actionLoading}
                                                        >
                                                            <CancelIcon sx={{ fontSize: 16 }} /> Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Distribution History */}
                                <div className="afd-panel afd-panel--history">
                                    <div className="afd-panel-header">
                                        <h2 className="afd-panel-title">Distribution History</h2>
                                        <span className="afd-panel-count">{history.length}</span>
                                    </div>
                                    <div className="afd-history-list">
                                        {displayedHistory.length === 0 ? (
                                            <div className="afd-empty">No distributions yet.</div>
                                        ) : (
                                            <>
                                                {displayedHistory.map((item) => (
                                                    <div key={item.distribution_id} className={`afd-history-card afd-history-card--${item.status}`}>
                                                        <div className="afd-hcard-row afd-hcard-row--top">
                                                            <span className="afd-hcard-org">{item.donor_name || '—'}</span>
                                                            <span className="afd-hcard-amount">${Number(item.amount).toFixed(0)}</span>
                                                        </div>
                                                        <div className="afd-hcard-row afd-hcard-row--sub">
                                                            <span className="afd-hcard-method">{item.payment_method || '—'}</span>
                                                            <span className="afd-hcard-date">{formatDate(item.distribution_date)}</span>
                                                        </div>
                                                        <div className="afd-hcard-row afd-hcard-row--status">
                                                            {getStatusBadge(item.status)}
                                                            {item.reference_number && <span className="afd-hcard-ref">{item.reference_number}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                                {hasMore && <button className="afd-show-more-btn" onClick={() => setShowHistoryModal(true)}>Show More</button>}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* ── Full History Modal ── */}
            {showHistoryModal && (
                <div className="afd-modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="afd-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="afd-modal-header">
                            <h3>Full Distribution History</h3>
                            <button className="afd-modal-close" onClick={() => setShowHistoryModal(false)}><CloseIcon /></button>
                        </div>
                        <div className="afd-modal-body">
                            {history.map((item) => (
                                <div key={item.distribution_id} className={`afd-history-card afd-modal-history-card afd-history-card--${item.status}`}>
                                    <div className="afd-hcard-row afd-hcard-row--top">
                                        <span className="afd-hcard-org">{item.donor_name || '—'}</span>
                                        <span className="afd-hcard-amount">${Number(item.amount).toFixed(0)}</span>
                                    </div>
                                    <div className="afd-hcard-row afd-hcard-row--sub">
                                        <span className="afd-hcard-method">{item.payment_method || '—'}</span>
                                        <span className="afd-hcard-date">{formatDate(item.distribution_date)}</span>
                                    </div>
                                    <div className="afd-hcard-row afd-hcard-row--status">
                                        {getStatusBadge(item.status)}
                                        {item.reference_number && <span className="afd-hcard-ref">{item.reference_number}</span>}
                                    </div>
                                    {item.purpose && <p className="afd-hcard-reason">{item.purpose}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── APPROVE Modal ── */}
            {approveModal.open && (
                <div className="afd-modal-overlay" onClick={() => setApproveModal(prev => ({ ...prev, open: false }))}>
                    <div className="afd-modal afd-modal--approve" onClick={(e) => e.stopPropagation()}>
                        <div className="afd-modal-header">
                            <h3>Approve & Distribute Funds</h3>
                            <button className="afd-modal-close" onClick={() => setApproveModal(prev => ({ ...prev, open: false }))}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="afd-modal-body">
                            <p className="afd-approve-desc">
                                You are approving <strong>{approveModal.request?.donor_name}</strong>'s request. Funds will be sent immediately and recorded as <strong>completed</strong>.
                            </p>

                            {/* Amount (read-only, auto-filled) */}
                            <div className="afd-approve-field">
                                <label>Amount</label>
                                <div className="afd-approve-amount">
                                    <AttachMoneyIcon sx={{ fontSize: 18, color: '#f97316' }} />
                                    <span>{Number(approveModal.request?.amount || 0).toFixed(2)}</span>
                                    <small>USD</small>
                                </div>
                            </div>

                            {/* Reference Number (preview) */}
                            <div className="afd-approve-field">
                                <label>Reference Number</label>
                                <div className="afd-approve-ref">Auto-generated upon approval (FD-…)</div>
                            </div>

                            {/* Payment Method */}
                            <div className="afd-approve-field">
                                <label>Payment Method *</label>
                                <div className="afd-approve-pills">
                                    {PAYMENT_METHODS.map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            className={`afd-approve-pill${approveModal.paymentMethod === m ? ' afd-approve-pill--active' : ''}`}
                                            onClick={() => setApproveModal(prev => ({ ...prev, paymentMethod: m }))}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="afd-approve-field">
                                <label>Notes (optional)</label>
                                <textarea
                                    rows="3"
                                    placeholder="Optional notes for this distribution..."
                                    value={approveModal.notes}
                                    onChange={(e) => setApproveModal(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>

                            {/* Original request reason — read-only */}
                            <div className="afd-approve-field">
                                <label>Donor's Reason</label>
                                <div className="afd-approve-reason-box">{approveModal.request?.reason}</div>
                            </div>

                            <div className="afd-modal-actions">
                                <button
                                    className="afd-modal-cancel-btn"
                                    onClick={() => setApproveModal(prev => ({ ...prev, open: false }))}
                                    disabled={actionLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="afd-modal-approve-btn"
                                    onClick={handleApproveConfirm}
                                    disabled={actionLoading}
                                >
                                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                                    {actionLoading ? 'Processing…' : 'Approve & Send Funds'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── REJECT Modal ── */}
            {rejectModal.open && (
                <div className="afd-modal-overlay" onClick={() => setRejectModal(prev => ({ ...prev, open: false }))}>
                    <div className="afd-modal afd-modal--reject" onClick={(e) => e.stopPropagation()}>
                        <div className="afd-modal-header">
                            <h3>Reject Request</h3>
                            <button className="afd-modal-close" onClick={() => setRejectModal(prev => ({ ...prev, open: false }))}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="afd-modal-body">
                            <p>Reject request from <strong>{rejectModal.request?.donor_name}</strong> for <strong>${Number(rejectModal.request?.amount || 0).toFixed(2)}</strong>?</p>
                            <label>Reason *</label>
                            <textarea
                                rows="3"
                                value={rejectModal.reason}
                                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Explain why the request is rejected"
                            />
                            <div className="afd-modal-actions">
                                <button
                                    className="afd-modal-cancel-btn"
                                    onClick={() => setRejectModal(prev => ({ ...prev, open: false }))}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="afd-modal-reject-btn"
                                    onClick={handleRejectConfirm}
                                    disabled={actionLoading}
                                >
                                    <CancelIcon sx={{ fontSize: 16 }} /> Confirm Rejection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`afd-toast afd-toast--${toast.type}`}>{toast.msg}</div>}
        </div>
    );
};

export default AdminFundDistribution;