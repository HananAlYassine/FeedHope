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
    const [requests, setRequests] = useState([]);      // pending money requests
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

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

    const handleApproveRequest = async (request, paymentMethod) => {
        if (!paymentMethod) {
            showToastMsg('Please select a payment method for this request.', 'error');
            return;
        }
        setActionLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/admin/money-requests/${request.request_id}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId, paymentMethod })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToastMsg(`Request approved. Funds distributed. Ref: ${data.distributionRef}`);
            fetchAll();
        } catch (err) {
            showToastMsg(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const openRejectModal = (request) => {
        setSelectedRequest(request);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleRejectRequest = async () => {
        if (!rejectReason.trim()) {
            showToastMsg('Please provide a rejection reason.', 'error');
            return;
        }
        setActionLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/admin/money-requests/${selectedRequest.request_id}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectReason.trim() })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToastMsg('Request rejected.');
            setShowRejectModal(false);
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
                                                <div className="afd-request-date">{formatDate(req.request_date)}</div>
                                                <div className="afd-request-actions">
                                                    <select
                                                        className="afd-payment-select"
                                                        defaultValue=""
                                                        onChange={(e) => {
                                                            const method = e.target.value;
                                                            if (method) handleApproveRequest(req, method);
                                                        }}
                                                        disabled={actionLoading}
                                                    >
                                                        <option value="" disabled>Select payment method</option>
                                                        {PAYMENT_METHODS.map(m => (
                                                            <option key={m} value={m}>{m}</option>
                                                        ))}
                                                    </select>
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
                                            {hasMore && <button className="afd-show-more-btn" onClick={() => setShowModal(true)}>Show More</button>}
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Full History Modal */}
            {showModal && (
                <div className="afd-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="afd-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="afd-modal-header">
                            <h3>Full Distribution History</h3>
                            <button className="afd-modal-close" onClick={() => setShowModal(false)}><CloseIcon /></button>
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

            {/* Reject Modal */}
            {/* {showRejectModal && (
                <div className="afd-modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="afd-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="afd-modal-header">
                            <h3>Reject Request</h3>
                            <button className="afd-modal-close" onClick={() => setShowRejectModal(false)}><CloseIcon /></button>
                        </div>
                        <div className="afd-modal-body">
                            <p>Reject request from <strong>{selectedRequest?.donor_name}</strong> for ${selectedRequest?.amount}?</p>
                            <label>Reason *</label>
                            <textarea
                                rows="3"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Explain why the request is rejected"
                            />
                            <div className="afd-modal-actions">
                                <button className="afd-modal-cancel-btn" onClick={() => setShowRejectModal(false)}>Cancel</button>
                                <button className="afd-modal-reject-btn" onClick={handleRejectRequest} disabled={actionLoading}>
                                    <CancelIcon sx={{ fontSize: 16 }} /> Confirm Rejection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )} */}





            {/* Reject Modal */}
                {showRejectModal && (
                    <div className="afd-modal-overlay" onClick={() => setShowRejectModal(false)}>
                        <div className="afd-modal afd-modal--reject" onClick={(e) => e.stopPropagation()}>
                            <div className="afd-modal-header">                
                                <h3>Reject Request</h3>
                                <button className="afd-modal-close" onClick={() => setShowRejectModal(false)}>
                                    <CloseIcon />
                                </button>
                            </div>
                            <div className="afd-modal-body">
                                <p>Reject request from <strong>{selectedRequest?.donor_name}</strong> for ${selectedRequest?.amount}?</p>
                                <label>Reason *</label>
                                <textarea
                                    rows="3"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Explain why the request is rejected"
                                />
                                <div className="afd-modal-actions">
                                    <button className="afd-modal-cancel-btn" onClick={() => setShowRejectModal(false)}>Cancel</button>
                                    <button className="afd-modal-reject-btn" onClick={handleRejectRequest} disabled={actionLoading}>
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