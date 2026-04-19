// ============================================================
//  FeedHope — Omar & Hanan — Pages/Admin/AdminFundDistribution.js
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import '../../Styles/Admin/AdminFundDistribution.css';

import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalendarTodayIcon        from '@mui/icons-material/CalendarToday';
import TrendingUpIcon           from '@mui/icons-material/TrendingUp';
import CloseIcon                from '@mui/icons-material/Close';

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

const AdminFundDistribution = () => {
    const navigate = useNavigate();

    // ── Read the logged-in admin's info from localStorage ──────────────────
    const storedUser = JSON.parse(localStorage.getItem('feedhope_user') || '{}');
    const adminId    = storedUser.admin_id ?? null;
    // ───────────────────────────────────────────────────────────────────────

    const [stats, setStats] = useState({ totalDistributed: 0, balance: 0 });
    const [history, setHistory] = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error,         setError]         = useState(null);
    const [toast,         setToast]         = useState(null);
    const [showModal,     setShowModal]     = useState(false);

    // donorName: the admin types the donor's name manually
    // the backend will look up the matching donor_id by name
    const [form, setForm] = useState({
        donorName:     '',
        amount:        '',
        paymentMethod: '',
        reason:        '',
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res  = await fetch('http://localhost:5000/api/admin/fund-distribution');
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to load data.'); return; }
            setStats({
                totalDistributed: data.totalDistributed ?? 0,
                balance:          data.balance          ?? 0,
            });
            setHistory(data.distributions ?? []);
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleMethodPill = (method) => {
        setForm(prev => ({
            ...prev,
            paymentMethod: prev.paymentMethod === method ? '' : method,
        }));
    };

    const handleSubmit = async () => {
        if (!form.donorName.trim())
            return showToast('Recipient donor name is required.', 'error');
        if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
            return showToast('Please enter a valid amount.', 'error');
        if (!form.paymentMethod)
            return showToast('Please select a payment method.', 'error');
        if (!form.reason.trim())
            return showToast('Please enter a reason for the distribution.', 'error');
        if (Number(form.amount) > stats.balance)
            return showToast(`Insufficient balance. Available: $${stats.balance.toFixed(2)}`, 'error');

        try {
            setSubmitLoading(true);
            const res = await fetch('http://localhost:5000/api/admin/fund-distribution', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount:        Number(form.amount),
                    paymentMethod: form.paymentMethod,
                    purpose:       form.reason,
                    donorName:     form.donorName.trim(),
                    adminId:       adminId,
                }),
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Failed to submit.', 'error'); return; }
            showToast('Distribution confirmed successfully!');
            setForm({ donorName: '', amount: '', paymentMethod: '', reason: '' });
            fetchData();
        } catch {
            showToast('Server error. Please try again.', 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // Limit history to first 5 items for the panel
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
                            <p className="afd-banner-subtitle">Distribute collected funds to donors</p>
                        </div>
                        <div className="afd-banner-date">
                            <CalendarTodayIcon sx={{ fontSize: 16 }} />
                            {todayFormatted()}
                        </div>
                    </div>

                    {loading && <div className="afd-loading">Loading fund distribution data…</div>}
                    {error && !loading && (
                        <div className="afd-error">
                            {error}
                            <button className="afd-retry-btn" onClick={fetchData}>Retry</button>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            <div className="afd-stats-row">
                                <div className="afd-stat-card afd-stat-card--distributed">
                                    <div className="afd-stat-icon">
                                        <TrendingUpIcon sx={{ fontSize: 24 }} />
                                    </div>
                                    <div className="afd-stat-info">
                                        <span className="afd-stat-label">Total Distributed</span>
                                        <span className="afd-stat-value">${stats.totalDistributed.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="afd-stat-card afd-stat-card--balance">
                                    <div className="afd-stat-icon">
                                        <AccountBalanceWalletIcon sx={{ fontSize: 24 }} />
                                    </div>
                                    <div className="afd-stat-info">
                                        <span className="afd-stat-label">Current Balance</span>
                                        <span className="afd-stat-value">${stats.balance.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="afd-grid">
                                {/* LEFT: New Distribution Form */}
                                <div className="afd-panel">
                                    <div className="afd-panel-header">
                                        <h2 className="afd-panel-title">New Distribution</h2>
                                    </div>
                                    <div className="afd-form">
                                        <div className="afd-field">
                                            <label className="afd-label">Recipient Donor Name</label>
                                            <input
                                                className="afd-input"
                                                type="text"
                                                name="donorName"
                                                value={form.donorName}
                                                onChange={handleChange}
                                                placeholder="Enter donor name"
                                            />
                                        </div>
                                        <div className="afd-field">
                                            <label className="afd-label">Amount ($)</label>
                                            <input
                                                className="afd-input"
                                                type="number"
                                                name="amount"
                                                value={form.amount}
                                                onChange={handleChange}
                                                placeholder="Enter amount"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="afd-field">
                                            <label className="afd-label">Payment Method</label>
                                            <div className="afd-pills">
                                                {PAYMENT_METHODS.map(m => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        className={`afd-pill${form.paymentMethod === m ? ' afd-pill--active' : ''}`}
                                                        onClick={() => handleMethodPill(m)}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="afd-field">
                                            <label className="afd-label">Reason / Description</label>
                                            <textarea
                                                className="afd-textarea"
                                                name="reason"
                                                value={form.reason}
                                                onChange={handleChange}
                                                placeholder="Enter the reason for this distribution"
                                                rows={5}
                                            />
                                        </div>
                                        <div className="afd-form-footer">
                                            <button
                                                className="afd-btn-submit"
                                                onClick={handleSubmit}
                                                disabled={submitLoading}
                                            >
                                                {submitLoading ? 'Processing…' : 'Confirm Distribution'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: Distribution History (limited to 5) */}
                                <div className="afd-panel afd-panel--history">
                                    <div className="afd-panel-header">
                                        <h2 className="afd-panel-title">Distribution History</h2>
                                        <span className="afd-panel-count">{history.length}</span>
                                    </div>
                                    <div className="afd-history-list">
                                        {displayedHistory.length === 0 ? (
                                            <div className="afd-empty">No distributions have been made yet.</div>
                                        ) : (
                                            <>
                                                {displayedHistory.map((item) => (
                                                    <div key={item.distribution_id} className="afd-history-card">
                                                        <div className="afd-hcard-row afd-hcard-row--top">
                                                            <span className="afd-hcard-org">
                                                                {item.donor_name || '—'}
                                                            </span>
                                                            <span className="afd-hcard-amount">
                                                                ${Number(item.amount).toFixed(0)}
                                                            </span>
                                                        </div>
                                                        <div className="afd-hcard-row afd-hcard-row--sub">
                                                            <span className="afd-hcard-method">
                                                                {item.payment_method || '—'}
                                                            </span>
                                                            <span className="afd-hcard-date">
                                                                {formatDate(item.distribution_date)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {hasMore && (
                                                    <button
                                                        className="afd-show-more-btn"
                                                        onClick={() => setShowModal(true)}
                                                    >
                                                        Show More
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Modal for full history */}
            {showModal && (
                <div className="afd-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="afd-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="afd-modal-header">
                            <h3>Full Distribution History</h3>
                            <button className="afd-modal-close" onClick={() => setShowModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="afd-modal-body">
                            {history.length === 0 ? (
                                <div className="afd-empty">No distributions yet.</div>
                            ) : (
                                history.map((item) => (
                                    <div key={item.distribution_id} className="afd-history-card afd-modal-history-card">
                                        <div className="afd-hcard-row afd-hcard-row--top">
                                            <span className="afd-hcard-org">{item.donor_name || '—'}</span>
                                            <span className="afd-hcard-amount">${Number(item.amount).toFixed(0)}</span>
                                        </div>
                                        <div className="afd-hcard-row afd-hcard-row--sub">
                                            <span className="afd-hcard-method">{item.payment_method || '—'}</span>
                                            <span className="afd-hcard-date">{formatDate(item.distribution_date)}</span>
                                        </div>
                                        {item.purpose && (
                                            <p className="afd-hcard-reason">{item.purpose}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`afd-toast afd-toast--${toast.type}`}>{toast.msg}</div>
            )}
        </div>
    );
};

export default AdminFundDistribution;
