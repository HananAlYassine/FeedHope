// DonorFeedback.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorFeedback.css';

// MUI Icons
import StarIcon from '@mui/icons-material/Star';
import StarHalfIcon from '@mui/icons-material/StarHalf';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import FeedbackIcon from '@mui/icons-material/Feedback';
import PersonIcon from '@mui/icons-material/Person';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const DonorFeedback = () => {
    const [user, setUser] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [overallRating, setOverallRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);
    const navigate = useNavigate();

    // Load user
    useEffect(() => {
        const storedUser = localStorage.getItem('feedhope_user');
        if (!storedUser) {
            navigate('/signin');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    // Fetch feedbacks (mock)
    useEffect(() => {
        if (!user) return;

        const fetchFeedbacks = async () => {
            setLoading(true);
            try {
                // Mock data matching the image
                const mockFeedbacks = [
                    {
                        id: 1,
                        receiverName: 'Hope Community Shelter',
                        deliverer: 'Sarah Johnson',
                        comment: 'Excellent food quality and fast delivery! The curry was still warm when it arrived.',
                        date: '2024-03-13',
                        rating: 5,
                    },
                    {
                        id: 2,
                        receiverName: 'City Food Bank',
                        deliverer: 'John Smith',
                        comment: 'Good delivery, arrived a bit early but food was in great condition.',
                        date: '2024-03-12',
                        rating: 4,
                    },
                ];
                setFeedbacks(mockFeedbacks);
                const total = mockFeedbacks.length;
                const avg = mockFeedbacks.reduce((sum, f) => sum + f.rating, 0) / total;
                setOverallRating(avg);
                setTotalReviews(total);
            } catch (err) {
                console.error('Failed to load feedbacks:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFeedbacks();
    }, [user]);

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // Helper to render stars based on rating
    const renderStars = (rating) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const stars = [];
        for (let i = 0; i < fullStars; i++) {
            stars.push(<StarIcon key={`full-${i}`} className="star-filled" />);
        }
        if (hasHalfStar) {
            stars.push(<StarHalfIcon key="half" className="star-half" />);
        }
        const emptyStars = 5 - stars.length;
        for (let i = 0; i < emptyStars; i++) {
            stars.push(<StarOutlineIcon key={`empty-${i}`} className="star-empty" />);
        }
        return stars;
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
                <div className="ddb-banner dfb-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor</p>
                        <h1 className="ddb-banner-title">Feedback</h1>
                        <p className="ddb-banner-subtitle">View feedback and ratings from receivers</p>
                    </div>
                    <div className="ddb-banner-icon">
                        <FeedbackIcon sx={{ fontSize: 48 }} />
                    </div>
                </div>

                {/* Overall Rating Card */}
                <div className="dfb-rating-card">
                    <div className="dfb-rating-stars">{renderStars(overallRating)}</div>
                    <div className="dfb-rating-number">{overallRating.toFixed(1)}</div>
                    <div className="dfb-rating-label">Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}</div>
                </div>

                {/* Feedbacks List */}
                {loading ? (
                    <div className="dfb-loading">Loading feedback...</div>
                ) : feedbacks.length === 0 ? (
                    <div className="dfb-empty">
                        <p>No feedback yet.</p>
                        <p className="dfb-empty-sub">When receivers rate your donations, they'll appear here.</p>
                    </div>
                ) : (
                    <div className="dfb-feedbacks-list">
                        {feedbacks.map((feedback) => (
                            <div key={feedback.id} className="dfb-feedback-card">
                                <div className="dfb-feedback-header">
                                    <div className="dfb-receiver-info">
                                        <PersonIcon className="dfb-icon" />
                                        <div>
                                            <h3 className="dfb-receiver-name">{feedback.receiverName}</h3>
                                            <div className="dfb-deliverer-info">
                                                <LocalShippingIcon className="dfb-small-icon" />
                                                <span>Delivered by {feedback.deliverer}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="dfb-rating-stars-small">{renderStars(feedback.rating)}</div>
                                </div>
                                <div className="dfb-feedback-comment">
                                    <p>"{feedback.comment}"</p>
                                </div>
                                <div className="dfb-feedback-date">
                                    <CalendarTodayIcon className="dfb-small-icon" />
                                    <span>{formatDate(feedback.date)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default DonorFeedback;