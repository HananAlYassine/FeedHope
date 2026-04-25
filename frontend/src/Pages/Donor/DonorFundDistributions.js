// ============================================================
//  FeedHope — Pages/Donor/DonorFundDistributions.js
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorFundDistributions.css';

// MUI Icons
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SendIcon from '@mui/icons-material/Send';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import HistoryIcon from '@mui/icons-material/History';

const DonorFundDistributions = () => {
    const [user, setUser] = useState(null);
    const [distributions, setDistributions] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Form state
    const [requestAmount, setRequestAmount] = useState('');
    const [requestReason, setRequestReason] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('feedhope_user');
        if (!storedUser) { navigate('/signin'); return; }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [distRes, reqRes] = await Promise.all([
                fetch(`http://localhost:5000/api/donor/fund-distributions/${user.user_id}`),
                fetch(`http://localhost:5000/api/donor/money-requests/${user.user_id}`)
            ]);
            const distData = await distRes.json();
            const reqData = await reqRes.json();
            if (distRes.ok) setDistributions(distData);
            if (reqRes.ok) setRequests(reqData);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleSubmitRequest = async () => {
        if (!requestAmount || parseFloat(requestAmount) <= 0) {
            showToast('Please enter a valid amount.', 'error');
            return;
        }
        if (!requestReason.trim()) {
            showToast('Please explain why you need the funds.', 'error');
            return;
        }
        setSubmitLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/donor/request-money', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(requestAmount),
                    reason: requestReason.trim(),
                    userId: user.user_id
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed.');
            showToast(`Request submitted! Reference: ${data.referenceNumber}`);
            setRequestAmount('');
            setRequestReason('');
            fetchData();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const getRequestStatusBadge = (status) => {
        const map = {
            pending: { label: 'Pending', cls: 'dfd-badge--pending' },
            approved: { label: 'Approved', cls: 'dfd-badge--completed' },
            rejected: { label: 'Rejected', cls: 'dfd-badge--rejected' }
        };
        const s = map[status] || { label: status, cls: '' };
        return <span className={`dfd-badge ${s.cls}`}>{s.label}</span>;
    };

    // ── Stats ──
    const totalReceived = distributions.reduce((sum, d) => sum + parseFloat(d.amount), 0);
    const pendingReqs = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} />

            <main className="ddb-main">
                {/* ── Banner ── */}
                <div className="ddb-banner dfd-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor Account</p>
                        <h1 className="ddb-banner-title">Fund Distributions</h1>
                        <p className="ddb-banner-subtitle">Request funds from the platform and track your distribution history</p>
                    </div>
                </div>

                {/* ── Stats Row ── */}
                <div className="dfd-metrics">
                    <div className="dfd-metric-card">
                        <div className="dfd-metric-icon total">
                            <AccountBalanceWalletIcon />
                        </div>
                        <div className="dfd-metric-content">
                            <span className="dfd-metric-value">${totalReceived.toFixed(2)}</span>
                            <span className="dfd-metric-label">Total Received</span>
                        </div>
                    </div>
                    <div className="dfd-metric-card">
                        <div className="dfd-metric-icon count">
                            <TrendingUpIcon />
                        </div>
                        <div className="dfd-metric-content">
                            <span className="dfd-metric-value">{distributions.length}</span>
                            <span className="dfd-metric-label">Distributions</span>
                        </div>
                    </div>
                    <div className="dfd-metric-card">
                        <div className="dfd-metric-icon pending">
                            <HourglassEmptyIcon />
                        </div>
                        <div className="dfd-metric-content">
                            <span className="dfd-metric-value">{pendingReqs}</span>
                            <span className="dfd-metric-label">Pending Requests</span>
                        </div>
                    </div>
                </div>

                {/* ── Two-Panel Grid: Request Form (left) + Recent Requests (right) ── */}
                <div className="dfd-grid">
                    {/* LEFT: New Request Form */}
                    <div className="dfd-panel">
                        <div className="dfd-panel-header">
                            <RequestQuoteIcon className="dfd-panel-icon" />
                            <div>
                                <h2 className="dfd-panel-title">Submit a Money Request</h2>
                                <p className="dfd-panel-sub">Ask the admin to send you funds for a specific purpose</p>
                            </div>
                        </div>

                        <div className="dfd-form-body">
                            <div className="dfd-form-group">
                                <label className="dfd-form-label">Amount (USD)</label>
                                <div className="dfd-amount-input-wrapper">
                                    <span className="dfd-currency-symbol">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        value={requestAmount}
                                        onChange={(e) => setRequestAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="dfd-amount-input"
                                        disabled={submitLoading}
                                    />
                                </div>
                            </div>

                            <div className="dfd-form-group">
                                <label className="dfd-form-label">Reason / Description</label>
                                <textarea
                                    rows="4"
                                    value={requestReason}
                                    onChange={(e) => setRequestReason(e.target.value)}
                                    placeholder="Explain why you need these funds (e.g. to buy packaging containers for food donation drive next week)"
                                    className="dfd-form-textarea"
                                    disabled={submitLoading}
                                />
                                <p className="dfd-form-hint">A clear, specific reason helps the admin approve your request faster.</p>
                            </div>

                            <button
                                className="dfd-submit-btn"
                                onClick={handleSubmitRequest}
                                disabled={submitLoading}
                            >
                                <SendIcon sx={{ fontSize: 18 }} />
                                {submitLoading ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: Recent Requests */}
                    <div className="dfd-panel">
                        <div className="dfd-panel-header">
                            <HistoryIcon className="dfd-panel-icon" />
                            <div>
                                <h2 className="dfd-panel-title">Your Recent Requests</h2>
                                <p className="dfd-panel-sub">Track the status of every request you've submitted</p>
                            </div>
                            <span className="dfd-panel-count">{requests.length}</span>
                        </div>

                        <div className="dfd-requests-list">
                            {requests.length === 0 ? (
                                <div className="dfd-empty">No requests yet.<br /><small>Submit your first request using the form on the left.</small></div>
                            ) : (
                                requests.slice(0, 8).map(req => (
                                    <div key={req.request_id} className={`dfd-request-card dfd-request-card--${req.status}`}>
                                        <div className="dfd-request-top">
                                            <div className="dfd-request-amount">
                                                ${Number(req.amount).toFixed(2)}
                                            </div>
                                            {getRequestStatusBadge(req.status)}
                                        </div>
                                        <div className="dfd-request-ref">
                                            {req.reference_number || '—'}
                                        </div>
                                        <div className="dfd-request-reason">
                                            {req.reason}
                                        </div>
                                        {req.status === 'rejected' && req.rejection_reason && (
                                            <div className="dfd-request-rejection">
                                                ❌ {req.rejection_reason}
                                            </div>
                                        )}
                                        <div className="dfd-request-date">
                                            {formatDate(req.request_date)}
                                            {req.reviewed_at && req.status !== 'pending' && (
                                                <> · Reviewed {formatDate(req.reviewed_at)}</>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Distributions Table ── */}
                <div className="ddb-card dfd-table-container">
                    <div className="ddb-card-header dfd-table-header">
                        <h3 className="ddb-card-title">Distribution Records</h3>
                        <p className="dfd-table-sub">Funds the admin has distributed to you</p>
                    </div>

                    {loading ? (
                        <div className="dfd-loading">Loading...</div>
                    ) : distributions.length === 0 ? (
                        <div className="dfd-empty">
                            <p>No distributions received yet.</p>
                            <small>Submit a request above to ask the admin for funds.</small>
                        </div>
                    ) : (
                        <div className="dfd-table-responsive">
                            <table className="dfd-table">
                                <thead>
                                    <tr>
                                        <th>Reference</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Date</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {distributions.map((d) => (
                                        <tr key={d.distribution_id}>
                                            <td className="dfd-ref-cell">{d.reference_number || '—'}</td>
                                            <td className="dfd-amount-cell">${parseFloat(d.amount).toFixed(2)}</td>
                                            <td>{d.payment_method}</td>
                                            <td className="dfd-date">{formatDate(d.distribution_date)}</td>
                                            <td className="dfd-purpose-text">{d.purpose || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {toast && <div className={`dfd-toast dfd-toast--${toast.type}`}>{toast.msg}</div>}
        </div>
    );
};

export default DonorFundDistributions;