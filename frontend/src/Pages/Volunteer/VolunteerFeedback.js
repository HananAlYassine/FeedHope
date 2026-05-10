// ============================================================
//  FeedHope — Volunteer Ratings & Feedback Page
//  Lists every rating receivers have left for this volunteer.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import DashboardChatbot from '../../Components/Shared/DashboardChatbot';
import '../../Styles/Volunteer/VolunteerDashboard.css';
import '../../Styles/Volunteer/VolunteerFeedback.css';

// MUI Icons
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarHalfIcon from '@mui/icons-material/StarHalf';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import CommentIcon from '@mui/icons-material/Comment';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';

const API_BASE = 'http://localhost:5000';

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
};

const VolunteerFeedback = () => {
    const navigate = useNavigate();

    const [user] = useState(() => {
        const raw = localStorage.getItem('feedhope_user');
        return raw ? JSON.parse(raw) : null;
    });

    const [feedbacks, setFeedbacks] = useState([]);
    const [stats, setStats] = useState({ totalRatings: 0, averageRating: 0, fiveStarCount: 0 });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchFeedback = useCallback(async () => {
        if (!user?.user_id) return;
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/api/volunteer/feedback/${user.user_id}`);
            setFeedbacks(res.data.feedbacks || []);
            setStats(res.data.stats || { totalRatings: 0, averageRating: 0, fiveStarCount: 0 });
        } catch (err) {
            console.error('Failed to load feedback:', err);
            setErrorMessage(err.response?.data?.error || 'Failed to load feedback.');
        } finally {
            setLoading(false);
        }
    }, [user?.user_id]);

    useEffect(() => {
        if (!user) {
            navigate('/signin');
            return;
        }
        fetchFeedback();
    }, [fetchFeedback, navigate, user]);

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        localStorage.removeItem('volunteer_user');
        navigate('/signin');
    };

    const filteredFeedbacks = feedbacks.filter(fb => {
        const search = searchTerm.toLowerCase();
        return (
            (fb.food_name || '').toLowerCase().includes(search) ||
            (fb.donor_name || '').toLowerCase().includes(search) ||
            (fb.receiver_org || '').toLowerCase().includes(search) ||
            (fb.receiver_name || '').toLowerCase().includes(search) ||
            (fb.reviewer_name || '').toLowerCase().includes(search) ||
            (fb.comment || '').toLowerCase().includes(search)
        );
    });

    const renderStars = (rating) => {
        const r = Number(rating) || 0;
        const fullStars = Math.floor(r);
        const hasHalfStar = r % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        return (
            <div className="vr-stars">
                {[...Array(fullStars)].map((_, i) => (
                    <StarIcon key={`full-${i}`} className="vr-star-filled" />
                ))}
                {hasHalfStar && <StarHalfIcon className="vr-star-half" />}
                {[...Array(Math.max(0, emptyStars))].map((_, i) => (
                    <StarBorderIcon key={`empty-${i}`} className="vr-star-empty" />
                ))}
            </div>
        );
    };

    return (
        <div className="vr-layout">
            <VolunteerSidebar user={user} onLogout={handleLogout} activePage="ratings" />

            <main className="vr-main">
                {/* Header Banner */}
                <div className="vr-header">
                    <div className="vr-header-text">
                        <h1 className="vr-title">My Ratings</h1>
                        <p className="vr-subtitle">View feedback and ratings from receivers</p>
                    </div>
                </div>

                {/* Rating Summary Card */}
                <div className="vr-summary-card">
                    <div className="vr-summary-left">
                        <div className="vr-average-rating">
                            <span className="vr-average-number">{stats.averageRating || '—'}</span>
                            <div className="vr-average-stars">
                                {renderStars(stats.averageRating)}
                            </div>
                        </div>
                        <div className="vr-stats-info">
                            <div className="vr-stat-item">
                                <span className="vr-stat-value">{stats.totalRatings}</span>
                                <span className="vr-stat-label">Total Ratings</span>
                            </div>
                            <div className="vr-stat-divider"></div>
                            <div className="vr-stat-item">
                                <span className="vr-stat-value">{stats.fiveStarCount}</span>
                                <span className="vr-stat-label">5-Star Ratings</span>
                            </div>
                        </div>
                    </div>
                    <div className="vr-summary-right">
                        <div className="vr-rating-badge">
                            <ThumbUpIcon />
                            <span>
                                Based on {stats.totalRatings} rating{stats.totalRatings !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="vr-search-section">
                    <div className="vr-search-wrapper">
                        <SearchIcon className="vr-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by food, donor, receiver, or comment..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="vr-search-input"
                        />
                    </div>
                </div>

                {/* Error */}
                {errorMessage && (
                    <div className="vr-empty-state">
                        <p style={{ color: '#991b1b' }}>{errorMessage}</p>
                    </div>
                )}

                {/* Feedback List */}
                {loading ? (
                    <div className="vr-empty-state">
                        <p>Loading your ratings…</p>
                    </div>
                ) : filteredFeedbacks.length === 0 ? (
                    <div className="vr-empty-state">
                        <EmojiEmotionsIcon className="vr-empty-icon" />
                        <p>{feedbacks.length === 0
                            ? "You haven't received any ratings yet."
                            : 'No ratings match your search.'}
                        </p>
                        {feedbacks.length > 0 && (
                            <button onClick={() => setSearchTerm('')}>Clear Search</button>
                        )}
                    </div>
                ) : (
                    <div className="vr-ratings-list">
                        {filteredFeedbacks.map(fb => {
                            const receiver = fb.receiver_org || fb.receiver_name || fb.reviewer_name || 'Receiver';
                            return (
                                <div key={fb.feedback_id} className="vr-rating-card">
                                    <div className="vr-rating-header">
                                        <div className="vr-rating-title-section">
                                            <h3 className="vr-rating-title">{fb.food_name || 'Delivery'}</h3>
                                            <div className="vr-rating-stars">
                                                {renderStars(fb.rating)}
                                                <span className="vr-rating-value">{Number(fb.rating).toFixed(1)}/5.0</span>
                                            </div>
                                        </div>
                                        <div className="vr-rating-date">
                                            <CalendarTodayIcon style={{ fontSize: 14 }} />
                                            <span>{formatDate(fb.feedback_date)}</span>
                                        </div>
                                    </div>

                                    <div className="vr-routing-info">
                                        <div className="vr-route-item">
                                            <PersonIcon style={{ fontSize: 14 }} />
                                            <span className="vr-donor">{fb.donor_name || 'Donor'}</span>
                                        </div>
                                        <ArrowForwardIcon className="vr-arrow-icon" />
                                        <div className="vr-route-item">
                                            <LocationOnIcon style={{ fontSize: 14 }} />
                                            <span className="vr-receiver">{receiver}</span>
                                        </div>
                                    </div>

                                    {fb.comment ? (
                                        <div className="vr-rating-comment">
                                            <CommentIcon className="vr-comment-icon" />
                                            <p className="vr-comment-text">"{fb.comment}"</p>
                                        </div>
                                    ) : (
                                        <div className="vr-rating-comment">
                                            <CommentIcon className="vr-comment-icon" />
                                            <p className="vr-comment-text" style={{ color: '#94a3b8' }}>
                                                No comment was left.
                                            </p>
                                        </div>
                                    )}

                                    <div className="vr-rating-footer">
                                        <div className="vr-delivery-meta">
                                            {fb.category_name && (
                                                <span className="vr-meta-tag">{fb.category_name}</span>
                                            )}
                                            {fb.quantity_by_kg && (
                                                <span className="vr-meta-tag">{fb.quantity_by_kg} KG</span>
                                            )}
                                            {fb.reviewer_name && (
                                                <span className="vr-meta-tag">by {fb.reviewer_name}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        <DashboardChatbot role="Volunteer" />
            </div>
    );
};

export default VolunteerFeedback;
