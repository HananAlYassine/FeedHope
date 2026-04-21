import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorFundDistributions.css';

// MUI Icons
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DescriptionIcon from '@mui/icons-material/Description';

const DonorFundDistributions = () => {
    const [user, setUser] = useState(null);
    const [distributions, setDistributions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalReceived: 0,
        count: 0
    });
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
                const res = await fetch(`http://localhost:5000/api/donor/fund-distributions/${user.user_id}`);
                const data = await res.json();

                if (res.ok) {
                    setDistributions(data);

                    // Calculate statistics
                    const total = data.reduce((sum, d) => sum + parseFloat(d.amount), 0);

                    setStats({
                        totalReceived: total.toLocaleString(undefined, { minimumFractionDigits: 2 }),
                        count: data.length
                    });
                }
            } catch (err) {
                console.error('Failed to load fund distributions:', err);
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

    // Get status badge class
    const getStatusClass = (confirmation) => {
        return confirmation === 'confirmed' ? 'confirmed' : 'pending';
    };

    // Get status display text
    const getStatusText = (confirmation) => {
        return confirmation === 'confirmed' ? 'Confirmed' : 'Pending';
    };

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} />

            <main className="ddb-main">
                <div className="ddb-banner dfd-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor Account</p>
                        <h1 className="ddb-banner-title">Fund Distributions</h1>
                        <p className="ddb-banner-subtitle">Track all funds distributed to you from the platform</p>
                    </div>
                </div>

                <div className="dfd-metrics">
                    <div className="dfd-metric-card">
                        <div className="dfd-metric-icon total">
                            <AccountBalanceWalletIcon />
                        </div>
                        <div className="dfd-metric-content">
                            <span className="dfd-metric-value">${stats.totalReceived}</span>
                            <span className="dfd-metric-label">Total Received</span>
                        </div>
                    </div>

                    <div className="dfd-metric-card">
                        <div className="dfd-metric-icon count">
                            <TrendingUpIcon />
                        </div>
                        <div className="dfd-metric-content">
                            <span className="dfd-metric-value">{stats.count}</span>
                            <span className="dfd-metric-label">Total Distributions</span>
                        </div>
                    </div>
                </div>

                <div className="ddb-card dfd-table-container">
                    <div className="ddb-card-header dfd-table-header">
                        <h3 className="ddb-card-title">Distribution Records</h3>
                    </div>

                    {loading ? (
                        <div className="dfd-loading">Fetching your records...</div>
                    ) : distributions.length === 0 ? (
                        <div className="dfd-empty">
                            <p>No distributions recorded yet.</p>
                        </div>
                    ) : (
                        <div className="dfd-table-responsive">
                            <table className="dfd-table">
                                <thead>
                                    <tr>
                                        <th>Amount</th>
                                        <th>Payment Method</th>
                                        <th>Purpose</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {distributions.map((distribution, index) => (
                                        <tr key={index}>
                                            <td className="dfd-amount-cell">
                                                ${parseFloat(distribution.amount).toFixed(2)}
                                            </td>
                                            <td>
                                                <div className="dfd-method-cell">
                                                    {distribution.payment_method}
                                                </div>
                                            </td>
                                            <td className="dfd-purpose">
                                                {distribution.purpose ? (
                                                    <span className="dfd-purpose-text">
                                                        {distribution.purpose}
                                                    </span>
                                                ) : "-"}
                                            </td>
                                            <td>
                                                <span className={`dfd-status ${distribution.status}`}>
                                                    {distribution.status}
                                                </span>
                                            </td>
                                            <td className="dfd-date">
                                                {formatDate(distribution.distribution_date)}
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

export default DonorFundDistributions;