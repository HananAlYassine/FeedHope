
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorFundDistributions.css';

// MUI Icons
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SendIcon from '@mui/icons-material/Send';

const DonorFundDistributions = () => {
    const [user, setUser] = useState(null);
    const [distributions, setDistributions] = useState([]);
    const [requests, setRequests] = useState([]);   // donor's own requests history
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [showRequestForm, setShowRequestForm] = useState(true); // toggle

    // Form state for new request
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
            // Get completed distributions
            const distRes = await fetch(`http://localhost:5000/api/donor/fund-distributions/${user.user_id}`);
            const distData = await distRes.json();
            if (distRes.ok) setDistributions(distData);

            // Get donor's own request history (optional – to show status)
            const reqRes = await fetch(`http://localhost:5000/api/donor/money-requests/${user.user_id}`);
            const reqData = await reqRes.json();
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
            showToast('Request sent to admin!');
            setRequestAmount('');
            setRequestReason('');
            fetchData(); // refresh request list
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
            month: 'long', day: 'numeric', year: 'numeric'
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

    const totalReceived = distributions.reduce((sum, d) => sum + parseFloat(d.amount), 0);

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} />

            <main className="ddb-main">
                <div className="ddb-banner dfd-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor Account</p>
                        <h1 className="ddb-banner-title">Fund Distributions</h1>
                        <p className="ddb-banner-subtitle">Request funds or view past distributions</p>
                    </div>
                </div>

                {/* Stats */}
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
                </div>

                {/* Request Form - Directly above the table */}
                <div className="dfd-request-box">
                    <div className="dfd-request-header">
                        <h3>Request Funds</h3>
                        <button className="dfd-request-toggle" onClick={() => setShowRequestForm(!showRequestForm)}>
                            {showRequestForm ? '−' : '+'}
                        </button>
                    </div>
                    {showRequestForm && (
                        <div className="dfd-request-form">
                            <div className="dfd-field">
                                <label>Amount ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    value={requestAmount}
                                    onChange={(e) => setRequestAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div className="dfd-field">
                                <label>Reason / Description</label>
                                <textarea
                                    rows="3"
                                    value={requestReason}
                                    onChange={(e) => setRequestReason(e.target.value)}
                                    placeholder="Explain why you need these funds (e.g. to buy packaging containers for food donation)"
                                />
                            </div>
                            <button
                                className="dfd-submit-request"
                                onClick={handleSubmitRequest}
                                disabled={submitLoading}
                            >
                                <SendIcon sx={{ fontSize: 16 }} /> {submitLoading ? 'Sending...' : 'Send Request'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Table: Completed Distributions only */}
                <div className="ddb-card dfd-table-container">
                    <div className="ddb-card-header dfd-table-header">
                        <h3 className="ddb-card-title">Distribution Records</h3>
                    </div>

                    {loading ? (
                        <div className="dfd-loading">Loading...</div>
                    ) : distributions.length === 0 ? (
                        <div className="dfd-empty"><p>No distributions yet. Submit a request above.</p></div>
                    ) : (
                        <div className="dfd-table-responsive">
                            <table className="dfd-table">
                                <thead>
                                    <tr>
                                        <th>Reference</th>
                                        <th>Sent By</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Date</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {distributions.map((d) => (
                                        <tr key={d.distribution_id}>
                                            <td>{d.reference_number || '—'}</td>
                                            <td>{d.donor_name}</td>
                                            <td>${parseFloat(d.amount).toFixed(2)}</td>
                                            <td>{d.payment_method}</td>
                                            <td>{formatDate(d.distribution_date)}</td>
                                            <td className="dfd-purpose-text">{d.purpose || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Optional: Recent requests history (collapsible) */}
                {requests.length > 0 && (
                    <div className="dfd-requests-history">
                        <h4>Your Recent Requests</h4>
                        <div className="dfd-history-list">
                            {requests.slice(0, 5).map(req => (
                                <div key={req.request_id} className="dfd-history-item">
                                    <div><strong>${req.amount}</strong> – {getRequestStatusBadge(req.status)}</div>
                                    <div className="dfd-history-reason">{req.reason}</div>
                                    <div className="dfd-history-date">{formatDate(req.request_date)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {toast && <div className={`dfd-toast dfd-toast--${toast.type}`}>{toast.msg}</div>}
        </div>
    );
};

export default DonorFundDistributions;