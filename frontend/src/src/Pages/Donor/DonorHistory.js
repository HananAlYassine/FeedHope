import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/FoodHistory.css';

import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import StarRateIcon from '@mui/icons-material/StarRate';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const DonorHistory = () => {
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user] = useState(() => {
        const saved = localStorage.getItem('feedhope_user');
        return saved ? JSON.parse(saved) : null;
    });
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/signin');
            return;
        }

        const fetchHistory = async () => {
            try {
                setLoading(true);
                const res = await fetch(`http://localhost:5000/api/donor/history/${user.user_id}`);
                if (!res.ok) throw new Error('Failed to load history');
                const data = await res.json();
                setDonations(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [user, navigate]);

    // --- METRIC CALCULATIONS (Delivered Only) ---

    // 1. Total KGs Donated
    const totalKgs = donations.reduce((sum, d) => sum + Number(d.quantity || 0), 0);

    // 2. Total Portions/Persons Fed
    const totalPeopleHelped = donations.reduce((sum, d) => sum + Number(d.people_helped || 0), 0);

    // 3. Quality Score (Total Stars / Count of Receivers who Rated)
    const ratedDonations = donations.filter(d => Number(d.rating) > 0);
    const avgRating = ratedDonations.length > 0
        ? (ratedDonations.reduce((sum, d) => sum + Number(d.rating), 0) / ratedDonations.length).toFixed(1)
        : "0.0";

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    if (loading) return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} activePage="history" />
            <main className="ddb-main"><div className="dh-loading">Loading History...</div></main>
        </div>
    );

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} activePage="history" />

            <main className="ddb-main">
                <div className="ddb-banner dh-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor Account</p>
                        <h1 className="ddb-banner-title">Impact History</h1>
                        <p className="ddb-banner-subtitle">Your delivered contributions and community reach</p>
                    </div>
                </div>

                <div className="dh-metrics">
                    <div className="dh-metric-card">
                        <div className="dh-metric-icon food"><RestaurantMenuIcon /></div>
                        <div className="dh-metric-content">
                            <span className="dh-metric-value">{totalKgs} kg</span>
                            <span className="dh-metric-label">Food Volume</span>
                        </div>
                    </div>

                    <div className="dh-metric-card">
                        <div className="dh-metric-icon families"><PeopleAltIcon /></div>
                        <div className="dh-metric-content">
                            <span className="dh-metric-value">{totalPeopleHelped}</span>
                            <span className="dh-metric-label">Portions Served</span>
                        </div>
                    </div>

                    <div className="dh-metric-card">
                        <div className="dh-metric-icon rating"><StarRateIcon /></div>
                        <div className="dh-metric-content">
                            <span className="dh-metric-value">{avgRating} / 5</span>
                            <span className="dh-metric-label">Quality Score</span>
                        </div>
                    </div>
                </div>

                <div className="ddb-card dh-table-container">
                    <div className="ddb-card-header dh-table-header">
                        <h3 className="ddb-card-title">Delivered Donations</h3>
                        <div className="dh-delivered-badge">
                            <CheckCircleIcon fontSize="small" />
                            <span>Verified Deliveries</span>
                        </div>
                    </div>

                    {donations.length === 0 ? (
                        <div className="dh-empty">
                            <p>No delivered donations found.</p>
                        </div>
                    ) : (
                        <div className="dh-table-responsive">
                            <table className="dh-table">
                                <thead>
                                    <tr>
                                        <th>Food Title</th>
                                        <th>Receiver</th>
                                        <th>Weight</th>
                                        <th>Portions</th>
                                        <th>Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donations.map((donation) => (
                                        <tr key={donation.id}>
                                            <td className="dh-title">{donation.title}</td>
                                            <td>{donation.receiver}</td>
                                            <td>{donation.quantity} kg</td>
                                            <td>{donation.people_helped} persons</td>
                                            <td>{donation.rating > 0 ? `${donation.rating} ⭐` : 'Not Rated'}</td>
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