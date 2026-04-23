import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorMoneyHistory.css';

// MUI Icons
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

const DonorMoneyHistory = () => {
    const [user, setUser] = useState(null);
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalApproved: 0, count: 0, pending: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('feedhope_user');
        if (!storedUser) { navigate('/signin'); return; }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`http://localhost:5000/api/donor/money-donations/${user.user_id}`);
                const data = await res.json();
                if (res.ok) {
                    setDonations(data);
                    const approved = data.filter(d => d.status === 'approved');
                    const total = approved.reduce((sum, d) => sum + parseFloat(d.amount), 0);
                    setStats({
                        totalApproved: total.toLocaleString(undefined, { minimumFractionDigits: 2 }),
                        count: data.length,
                        pending: data.filter(d => d.status === 'pending').length,
                    });
                }
            } catch (err) {
                console.error('Failed to load donation history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

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

    const getStatusBadge = (status) => {
        const map = {
            pending: { label: 'Pending', cls: 'dmh-badge--pending' },
            approved: { label: 'Approved', cls: 'dmh-badge--approved' },
            rejected: { label: 'Rejected', cls: 'dmh-badge--rejected' },
        };
        const s = map[status] || { label: status, cls: '' };
        return <span className={`dmh-badge ${s.cls}`}>{s.label}</span>;
    };

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} />

            <main className="ddb-main">
                <div className="ddb-banner dmh-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor</p>
                        <h1 className="ddb-banner-title">Donations History</h1>
                        <p className="ddb-banner-subtitle">Review your past monetary contributions and their status</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="dmh-stats-grid">
                    <div className="dmh-stat-card">
                        <div className="dmh-stat-icon total">
                            <AttachMoneyIcon />
                        </div>
                        <div className="dmh-stat-content">
                            <span className="dmh-stat-value">${stats.totalApproved}</span>
                            <span className="dmh-stat-label">Total Approved</span>
                        </div>
                    </div>
                    <div className="dmh-stat-card">
                        <div className="dmh-stat-icon completed">
                            <HistoryIcon />
                        </div>
                        <div className="dmh-stat-content">
                            <span className="dmh-stat-value">{stats.count}</span>
                            <span className="dmh-stat-label">Total Transactions</span>
                        </div>
                    </div>
                    <div className="dmh-stat-card">
                        <div className="dmh-stat-icon pending">
                            <HourglassEmptyIcon />
                        </div>
                        <div className="dmh-stat-content">
                            <span className="dmh-stat-value">{stats.pending}</span>
                            <span className="dmh-stat-label">Pending Review</span>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="ddb-card dmh-table-container">
                    <div className="ddb-card-header dmh-table-header">
                        <h3 className="ddb-card-title">Donation Records</h3>
                    </div>

                    {loading ? (
                        <div className="dmh-loading">Fetching your records...</div>
                    ) : donations.length === 0 ? (
                        <div className="dmh-empty"><p>No donations recorded yet.</p></div>
                    ) : (
                        <div className="dmh-table-responsive">
                            <table className="dmh-table">
                                <thead>
                                    <tr>
                                        <th>Reference</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Status</th>
                                        <th>Note / Reason</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donations.map((donation, index) => (
                                        <tr key={index} className={donation.status === 'rejected' ? 'dmh-row--rejected' : ''}>
                                            <td className="dmh-ref-cell">
                                                {donation.reference_number || '—'}
                                            </td>
                                            <td className="dmh-amount-cell">
                                                ${parseFloat(donation.amount).toFixed(2)}
                                            </td>
                                            <td>
                                                <div className="dmh-method-cell">{donation.method}</div>
                                            </td>
                                            <td>
                                                {getStatusBadge(donation.status)}
                                            </td>
                                            <td className="dmh-note-cell">
                                                {donation.status === 'rejected' && donation.rejection_reason ? (
                                                    <span className="dmh-rejection-text">
                                                        ❌ {donation.rejection_reason}
                                                    </span>
                                                ) : donation.note ? (
                                                    <span className="dmh-note-text">{donation.note}</span>
                                                ) : '—'}
                                            </td>
                                            <td className="dmh-date">
                                                {formatDate(donation.date)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pending hint */}
                {stats.pending > 0 && (
                    <div className="dmh-pending-hint">
                        <HourglassEmptyIcon sx={{ fontSize: 16 }} />
                        You have <strong>{stats.pending}</strong> donation{stats.pending > 1 ? 's' : ''} pending admin review. You will be notified once reviewed.
                    </div>
                )}
            </main>
        </div>
    );
};

export default DonorMoneyHistory;