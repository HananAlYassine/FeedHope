// DonorHistory.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';   // reuse layout styles
import '../../Styles/Donor/FoodHistory.css';      // your independent CSS file

// MUI Icons
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import StarRateIcon from '@mui/icons-material/StarRate';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const DonorHistory = () => {
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('feedhope_user');
        if (!storedUser) {
            navigate('/signin');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    // Fetch delivered donations (mock or real API)
    useEffect(() => {
        if (!user) return;

        const fetchDeliveredDonations = async () => {
            try {
                setLoading(true);
                // Replace with your real endpoint
                // const res = await fetch(`http://localhost:5000/api/donor/history/${user.user_id}?status=delivered`);
                // const data = await res.json();

                // MOCK DATA (only delivered)
                const mockData = [
                    { id: 1, title: "Rice & Curry Dishes", receiver: "Hope Community Shelter", quantity: 15, status: "Delivered", familiesHelped: 10, rating: 4.9 },
                    { id: 2, title: "Vegetable Soup", receiver: "Downtown Mission", quantity: 25, status: "Delivered", familiesHelped: 15, rating: 4.7 },
                    { id: 3, title: "Pasta Meal", receiver: "Sunshine Orphanage", quantity: 30, status: "Delivered", familiesHelped: 20, rating: 4.8 },
                    { id: 4, title: "Bread Basket", receiver: "Community Kitchen", quantity: 20, status: "Delivered", familiesHelped: 12, rating: 4.6 },
                    { id: 5, title: "Canned Goods", receiver: "Food Bank Network", quantity: 18, status: "Delivered", familiesHelped: 12, rating: 5.0 },
                    { id: 6, title: "Fruit Hamper", receiver: "Family Support Center", quantity: 48, status: "Delivered", familiesHelped: 20, rating: 4.8 }
                ];
                setDonations(mockData);
            } catch (err) {
                setError('Failed to load donation history.');
            } finally {
                setLoading(false);
            }
        };

        fetchDeliveredDonations();
    }, [user]);

    // Compute summary metrics
    const totalDonated = donations.reduce((sum, d) => sum + d.quantity, 0);
    const totalFamilies = donations.reduce((sum, d) => sum + (d.familiesHelped || 0), 0);
    const avgRating = donations.length
        ? (donations.reduce((sum, d) => sum + (d.rating || 0), 0) / donations.length).toFixed(1)
        : '0.0';

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    if (loading) {
        return (
            <div className="ddb-layout">
                <DonorSidebar user={user} onLogout={handleLogout} />
                <main className="ddb-main">
                    <div className="dh-loading">Loading your history…</div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ddb-layout">
                <DonorSidebar user={user} onLogout={handleLogout} />
                <main className="ddb-main">
                    <div className="dh-error">{error}</div>
                </main>
            </div>
        );
    }

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} />

            <main className="ddb-main">
                {/* Header */}
                <div className="ddb-banner dh-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor</p>
                        <h1 className="ddb-banner-title">Donation History</h1>
                        <p className="ddb-banner-subtitle">
                            Review your past donations and their impact
                        </p>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="dh-metrics">
                    <div className="dh-metric-card">
                        <div className="dh-metric-icon food">
                            <RestaurantMenuIcon />
                        </div>
                        <div className="dh-metric-content">
                            <span className="dh-metric-value">{totalDonated}</span>
                            <span className="dh-metric-label">Total Donated</span>
                        </div>
                    </div>
                    <div className="dh-metric-card">
                        <div className="dh-metric-icon families">
                            <PeopleAltIcon />
                        </div>
                        <div className="dh-metric-content">
                            <span className="dh-metric-value">{totalFamilies}</span>
                            <span className="dh-metric-label">Families Helped</span>
                        </div>
                    </div>
                    <div className="dh-metric-card">
                        <div className="dh-metric-icon rating">
                            <StarRateIcon />
                        </div>
                        <div className="dh-metric-content">
                            <span className="dh-metric-value">{avgRating}</span>
                            <span className="dh-metric-label">Avg Rating</span>
                        </div>
                    </div>
                </div>

                {/* Past Donations Table */}
                <div className="ddb-card dh-table-container">
                    <div className="ddb-card-header dh-table-header">
                        <h3 className="ddb-card-title">Past Donations</h3>
                        <div className="dh-delivered-badge">
                            <CheckCircleIcon fontSize="small" />
                            <span>Showing only delivered offers</span>
                        </div>
                    </div>

                    {donations.length === 0 ? (
                        <div className="dh-empty">
                            <p>No delivered donations yet.</p>
                            <p className="dh-empty-sub">Your completed donations will appear here.</p>
                        </div>
                    ) : (
                        <div className="dh-table-responsive">
                            <table className="dh-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Receiver</th>
                                        <th>Quantity</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donations.map((donation) => (
                                        <tr key={donation.id}>
                                            <td className="dh-title">{donation.title}</td>
                                            <td>{donation.receiver}</td>
                                            <td>{donation.quantity}</td>
                                            <td>
                                                <span className="dh-status delivered">Delivered</span>
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

export default DonorHistory;