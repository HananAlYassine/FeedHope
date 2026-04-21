import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorNotifications.css'; // Reusing your layout styles

// MUI Icons
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import FeedbackIcon from '@mui/icons-material/Feedback';

const DonorFeedback = () => {
    const [user, setUser] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('feedhope_user'));
        if (!storedUser) {
            navigate('/signin');
        } else {
            setUser(storedUser);
        }
    }, [navigate]);

    useEffect(() => {
        const fetchFeedback = async () => {
            if (!user) return;
            try {
                const res = await axios.get(`http://localhost:5000/api/donor/feedback/${user.user_id}`);
                setFeedbacks(res.data);
            } catch (err) {
                console.error('Error fetching feedback:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFeedback();
    }, [user]);

    // Helper to render stars based on rating number
    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars.push(<StarIcon key={i} sx={{ color: '#f5a623', fontSize: 20 }} />);
            } else {
                stars.push(<StarBorderIcon key={i} sx={{ color: '#e0e0e0', fontSize: 20 }} />);
            }
        }
        return stars;
    };

    // Calculate average rating
    const averageRating = feedbacks.length > 0
        ? (feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length).toFixed(1)
        : 0;

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={() => navigate('/signin')} />

            <main className="ddb-main">
                <div className="ddb-banner dn-banner">
                    <div className="ddb-banner-text">
                        <h1 className="ddb-banner-title">My Feedback</h1>
                        <p className="ddb-banner-subtitle">
                            See what receivers are saying about your donations.
                        </p>
                    </div>
                </div>

                {/* Summary Card */}
                {!loading && feedbacks.length > 0 && (
                    <div className="dn-action-bar" style={{ background: '#fff', padding: '1.5rem', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1a1a1a' }}>
                                {averageRating}
                            </div>
                            <div>
                                <div style={{ display: 'flex' }}>{renderStars(Math.round(averageRating))}</div>
                                <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '4px' }}>
                                    Based on {feedbacks.length} reviews
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="dn-loading">Loading feedback...</div>
                ) : feedbacks.length === 0 ? (
                    <div className="dn-empty">
                        <FeedbackIcon sx={{ fontSize: 40, color: '#ccc', marginBottom: '10px' }} />
                        <h3>No Feedback Yet</h3>
                        <p className="dn-empty-sub">You haven't received any feedback on your deliveries yet.</p>
                    </div>
                ) : (
                    <div className="dn-notifications-container">
                        <div className="dn-category-section">
                            <div className="dn-category-header">
                                <div className="dn-category-icon"><FeedbackIcon /></div>
                                <h3 className="dn-category-title">RECEIVER REVIEWS</h3>
                            </div>
                            <div className="dn-category-items">
                                {feedbacks.map((item, index) => (
                                    <div key={index} className="dn-notification-item" style={{ cursor: 'default', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                                                {item.first_name} {item.last_name}
                                            </div>
                                            <div className="dn-notification-date">
                                                {new Date(item.feedback_date).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            {renderStars(item.rating)}
                                        </div>

                                        {item.comment && (
                                            <div className="dn-notification-description" style={{ marginTop: '5px', fontStyle: 'italic' }}>
                                                "{item.comment}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DonorFeedback;