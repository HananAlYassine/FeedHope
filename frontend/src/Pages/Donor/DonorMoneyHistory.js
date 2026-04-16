import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorMoneyHistory.css';

// MUI Icons
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HistoryIcon from '@mui/icons-material/History';
import PaymentIcon from '@mui/icons-material/Payment';
import DescriptionIcon from '@mui/icons-material/Description';

const DonorMoneyHistory = () => {
    const [user, setUser] = useState(null);
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalDonated: 0, count: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('feedhope_user');
        if (!storedUser) {
            navigate('/signin');
            return;
        }
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

                    // Calculate totals for the stat cards
                    const total = data.reduce((sum, d) => sum + parseFloat(d.amount), 0);
                    setStats({
                        totalDonated: total.toLocaleString(undefined, { minimumFractionDigits: 2 }),
                        count: data.length
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

    // Format date to show only Month, Day, Year
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} />

            <main className="ddb-main">
                <div className="ddb-banner dmh-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor</p>
                        <h1 className="ddb-banner-title">History</h1>
                        <p className="ddb-banner-subtitle">Review your past monetary contributions</p>
                    </div>
                </div>

                <div className="dmh-stats-grid">
                    <div className="dmh-stat-card">
                        <div className="dmh-stat-icon total">
                            <AttachMoneyIcon />
                        </div>
                        <div className="dmh-stat-content">
                            <span className="dmh-stat-value">${stats.totalDonated}</span>
                            <span className="dmh-stat-label">Total Amount</span>
                        </div>
                    </div>

                    <div className="dmh-stat-card">
                        <div className="dmh-stat-icon completed">
                            <HistoryIcon />
                        </div>
                        <div className="dmh-stat-content">
                            <span className="dmh-stat-value">{stats.count}</span>
                            <span className="dmh-stat-label">Transactions</span>
                        </div>
                    </div>
                </div>

                <div className="ddb-card dmh-table-container">
                    <div className="ddb-card-header dmh-table-header">
                        <h3 className="ddb-card-title">Donation Records</h3>
                    </div>

                    {loading ? (
                        <div className="dmh-loading">Fetching your records...</div>
                    ) : donations.length === 0 ? (
                        <div className="dmh-empty">
                            <p>No donations recorded yet.</p>
                        </div>
                    ) : (
                        <div className="dmh-table-responsive">
                            <table className="dmh-table">
                                <thead>
                                    <tr>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Note</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donations.map((donation, index) => (
                                        <tr key={index}>
                                            <td className="dmh-amount-cell">
                                                ${parseFloat(donation.amount).toFixed(2)}
                                            </td>
                                            <td>
                                                <div className="dmh-method-cell">
                                                    {donation.method}
                                                </div>
                                            </td>
                                            <td className="dmh-description">
                                                {donation.note ? (
                                                    <span className="dmh-note-text">
                                                        {donation.note}
                                                    </span>
                                                ) : "-"}
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
            </main>
        </div>
    );
};

export default DonorMoneyHistory;