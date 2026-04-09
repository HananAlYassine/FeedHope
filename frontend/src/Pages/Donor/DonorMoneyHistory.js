// DonorMoneyHistory.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorMoneyHistory.css';

// MUI Icons
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import PaymentIcon from '@mui/icons-material/Payment';

const DonorMoneyHistory = () => {
    const [user, setUser] = useState(null);
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalDonated: 0, completed: 0, pending: 0 });
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
                // Replace with actual API call
                // const res = await fetch(`http://localhost:5000/api/donor/money-donations/${user.user_id}`);
                // const data = await res.json();

                // Mock data matching the image
                const mockDonations = [
                    { id: 1, amount: 500, paymentMethod: 'Bank Transfer', status: 'Completed', date: '2024-03-10' },
                    { id: 2, amount: 1000, paymentMethod: 'WishMoney', status: 'Pending', date: '2024-03-14' },
                    { id: 3, amount: 250, paymentMethod: 'OMT', status: 'Completed', date: '2024-03-05' },
                    { id: 4, amount: 750, paymentMethod: 'Bank Transfer', status: 'Pending', date: '2024-03-12' },
                ];

                setDonations(mockDonations);

                // Calculate stats
                const total = mockDonations.reduce((sum, d) => sum + d.amount, 0);
                const completed = mockDonations
                    .filter(d => d.status === 'Completed')
                    .reduce((sum, d) => sum + d.amount, 0);
                const pending = mockDonations
                    .filter(d => d.status === 'Pending')
                    .reduce((sum, d) => sum + d.amount, 0);

                setStats({ totalDonated: total, completed, pending });
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
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} />

            <main className="ddb-main">
                {/* Banner */}
                <div className="ddb-banner dmh-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor</p>
                        <h1 className="ddb-banner-title">Donor History</h1>
                        <p className="ddb-banner-subtitle">View your past monetary contributions</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="dmh-stats-grid">
                    <div className="dmh-stat-card">
                        <div className="dmh-stat-icon total">
                            <AttachMoneyIcon />
                        </div>
                        <div className="dmh-stat-content">
                            <span className="dmh-stat-value">${stats.totalDonated}</span>
                            <span className="dmh-stat-label">Total Donated</span>
                        </div>
                    </div>

                    <div className="dmh-stat-card">
                        <div className="dmh-stat-icon completed">
                            <CheckCircleIcon />
                        </div>
                        <div className="dmh-stat-content">
                            <span className="dmh-stat-value">${stats.completed}</span>
                            <span className="dmh-stat-label">Completed</span>
                        </div>
                    </div>

                    <div className="dmh-stat-card">
                        <div className="dmh-stat-icon pending">
                            <PendingIcon />
                        </div>
                        <div className="dmh-stat-content">
                            <span className="dmh-stat-value">${stats.pending}</span>
                            <span className="dmh-stat-label">Pending</span>
                        </div>
                    </div>
                </div>

                {/* Donations Table */}
                <div className="ddb-card dmh-table-container">
                    <div className="ddb-card-header dmh-table-header">
                        <h3 className="ddb-card-title">Monetary Donations</h3>
                    </div>

                    {loading ? (
                        <div className="dmh-loading">Loading your donation history...</div>
                    ) : donations.length === 0 ? (
                        <div className="dmh-empty">
                            <p>No monetary donations yet.</p>
                            <p className="dmh-empty-sub">Your contributions will appear here.</p>
                        </div>
                    ) : (
                        <div className="dmh-table-responsive">
                            <table className="dmh-table">
                                <thead>
                                    <tr>
                                        <th>Amount</th>
                                        <th>Payment Method</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donations.map((donation) => (
                                        <tr key={donation.id}>
                                            <td className="dmh-amount">${donation.amount}</td>
                                            <td>{donation.paymentMethod}</td>
                                            <td>
                                                <span className={`dmh-status ${donation.status.toLowerCase()}`}>
                                                    {donation.status}
                                                </span>
                                            </td>
                                            <td>{formatDate(donation.date)}</td>
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