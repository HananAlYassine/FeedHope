// =============================================
//  FeedHope — Omar & Hanan 
//  Receiving History (completed deliveries)
// =============================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';
import '../../Styles/Receiver/ReceiverDashboard.css';
import '../../Styles/Receiver/ReceiverAcceptedOffers.css'; // reuse table styles
import '../../Styles/Receiver/ReceiverHistory.css';        // additional custom styles

// MUI Icons
import HistoryIcon from '@mui/icons-material/History';
import FeedbackIcon from '@mui/icons-material/Feedback';
import InventoryIcon from '@mui/icons-material/Inventory';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

// Helper: format date
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
};

// ==============================================================
// RateExperienceModal (same as in ReceiverAcceptedOffers)
// ==============================================================
const RateExperienceModal = ({ isOpen, onClose, onSubmit, offerTitle, donorName, volunteerName }) => {
    const [donorRating, setDonorRating] = useState(5);
    const [volunteerRating, setVolunteerRating] = useState(5);
    const [comment, setComment] = useState('');
    const [hoverDonor, setHoverDonor] = useState(0);
    const [hoverVolunteer, setHoverVolunteer] = useState(0);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit(donorRating, volunteerRating, comment);
        setDonorRating(5);
        setVolunteerRating(5);
        setComment('');
        onClose();
    };

    return (
        <div className="ram-modal-overlay">
            <div className="ram-modal rate-experience-modal">
                <div className="ram-modal-header">
                    <h3>Rate Your Experience</h3>
                    <button className="ram-modal-close" onClick={onClose}>
                        <CloseIcon fontSize="small" />
                    </button>
                </div>
                <div className="ram-modal-body">
                    <p className="rate-intro">
                        Your delivery of <strong>“{offerTitle}”</strong> has been completed.<br />
                        Please rate the donor and the volunteer.
                    </p>
                    <div className="rate-section">
                        <label>Rate Donor: <strong>{donorName}</strong></label>
                        <div className="ram-stars">
                            {[1,2,3,4,5].map(star => (
                                <span key={star} className="ram-star"
                                      onClick={() => setDonorRating(star)}
                                      onMouseEnter={() => setHoverDonor(star)}
                                      onMouseLeave={() => setHoverDonor(0)}>
                                    {star <= (hoverDonor || donorRating) ?
                                        <StarIcon sx={{ color: '#f5b042' }} /> :
                                        <StarBorderIcon sx={{ color: '#ccc' }} />}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="rate-section">
                        <label>Rate Volunteer: <strong>{volunteerName || 'the volunteer'}</strong></label>
                        <div className="ram-stars">
                            {[1,2,3,4,5].map(star => (
                                <span key={star} className="ram-star"
                                      onClick={() => setVolunteerRating(star)}
                                      onMouseEnter={() => setHoverVolunteer(star)}
                                      onMouseLeave={() => setHoverVolunteer(0)}>
                                    {star <= (hoverVolunteer || volunteerRating) ?
                                        <StarIcon sx={{ color: '#f5b042' }} /> :
                                        <StarBorderIcon sx={{ color: '#ccc' }} />}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="ram-comment">
                        <label>Comment (optional)</label>
                        <textarea rows="3" value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  placeholder="Share your experience..." />
                    </div>
                </div>
                <div className="ram-modal-footer">
                    <button className="ram-btn-skip" onClick={onClose}>Skip</button>
                    <button className="ram-btn-submit" onClick={handleSubmit}>Submit Feedback</button>
                </div>
            </div>
        </div>
    );
};

// ==============================================================
// Main Component
// ==============================================================
const ReceiverHistory = () => {
    const navigate = useNavigate();
    const [user] = useState(() => {
        const stored = localStorage.getItem('feedhope_user');
        return stored ? JSON.parse(stored) : null;
    });
    const userId = user?.user_id;
    const firstName = user?.name?.split(' ')[0] || 'Receiver';

    // State
    const [profileStats, setProfileStats] = useState(null);   // from profile API
    const [history, setHistory] = useState([]);               // completed deliveries
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [feedbackOffer, setFeedbackOffer] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch profile stats (reuse existing API)
    const fetchProfileStats = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/profile/${userId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load stats');
            setProfileStats({
                totalReceived: data.stats?.totalReceived ?? data.profile?.total_received ?? 0,
                peopleServed: data.stats?.peopleServed ?? data.profile?.people_served ?? 0,
                deliveriesReceived: data.stats?.deliveriesReceived ?? data.profile?.deliveries_received ?? 0,
                memberSince: data.profile?.foundation_date || '—'
            });
        } catch (err) {
            console.error("Profile stats error:", err);
        }
    }, [userId]);

    // Fetch history (new endpoint)
    const fetchHistory = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/history/${userId}`);
            if (!res.ok) throw new Error('Failed to load history');
            const data = await res.json();
            setHistory(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            navigate('/signin');
            return;
        }
        fetchProfileStats();
        fetchHistory();
    }, [userId, navigate, fetchProfileStats, fetchHistory]);

    // Open feedback modal
    const openFeedbackModal = (item) => {
        setFeedbackOffer(item);
        setIsModalOpen(true);
    };

    // Submit feedback (reuse existing endpoint)
    const submitFeedback = async (donorRating, volunteerRating, comment) => {
        if (!feedbackOffer) return;
        setActionLoading(feedbackOffer.offer_id);
        try {
            const res = await fetch('http://localhost:5000/api/receiver/feedback-offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    offerId: feedbackOffer.offer_id,
                    userId,
                    donorRating,
                    volunteerRating,
                    comment
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Feedback failed');
            alert('Thank you for your feedback!');
            // Refresh history to update feedback_given flag
            fetchHistory();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
            setFeedbackOffer(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    if (loading) {
        return (
            <div className="rdb-layout">
                <ReceiverSidebar onLogout={handleLogout} unreadCount={0} activePage="history" />
                <main className="rdb-main">
                    <div className="rdb-loading-screen">
                        <div className="rdb-spinner" />
                        <p>Loading receiving history…</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rdb-layout">
                <ReceiverSidebar onLogout={handleLogout} unreadCount={0} activePage="history" />
                <main className="rdb-main">
                    <div className="rdb-error-screen">
                        <p className="rdb-error-msg">{error}</p>
                        <button className="rdb-retry-btn" onClick={fetchHistory}>Retry</button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="rdb-layout">
            <ReceiverSidebar onLogout={handleLogout} unreadCount={0} activePage="history" />

            <main className="rdb-main">
                {/* Banner */}
                <div className="rdb-banner rob-banner rao-banner rh-banner">
                    <div className="rdb-banner-text">
                        <p className="rdb-banner-greeting">Welcome back, {firstName}</p>
                        <h1 className="rdb-banner-title">Receiving History</h1>
                        <p className="rdb-banner-subtitle">Review your past received donations</p>
                        <div className="rao-date-badge">{formattedDate}</div>
                    </div>
                    <div className="rdb-banner-icon">
                        <HistoryIcon sx={{ fontSize: 48, color: '#fff' }} />
                    </div>
                    <div className="rob-banner-stat">
                        <span className="rob-banner-stat-num">{history.length}</span>
                        <span className="rob-banner-stat-label">Completed Donations</span>
                    </div>
                </div>

                {/* Stats Row (reused from profile API) */}
                <div className="rdb-stats-row">
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--blue">
                            <InventoryIcon fontSize="small" />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{profileStats?.totalReceived ?? '—'}</span>
                            <span className="rdb-stat-label">Total Received</span>
                        </div>
                    </div>
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--green">
                            <GroupsIcon fontSize="small" />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{profileStats?.peopleServed ?? '—'}</span>
                            <span className="rdb-stat-label">People Served</span>
                        </div>
                    </div>
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--orange">
                            <LocalShippingIcon fontSize="small" />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{profileStats?.deliveriesReceived ?? '—'}</span>
                            <span className="rdb-stat-label">Completed</span>
                        </div>
                    </div>
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--purple">
                            <CalendarMonthIcon fontSize="small" />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number rdb-stat-number--sm">
                                {profileStats?.memberSince ? formatDate(profileStats.memberSince) : '—'}
                            </span>
                            <span className="rdb-stat-label">Member Since</span>
                        </div>
                    </div>
                </div>

                {/* Table of Past Received Donations */}
                <div className="rao-table-container">
                    <h3 className="rh-table-title">Past Received Donations</h3>
                    <table className="rao-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Donor</th>
                                <th>Quantity</th>
                                <th>Status</th>
                                <th>Delivered Date</th>
                                <th>Feedback</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr className="rao-empty-row">
                                    <td colSpan="6">No completed donations yet.</td>
                                </tr>
                            ) : (
                                history.map(item => (
                                    <tr key={item.offer_id}>
                                        <td data-label="Title">{item.title}</td>
                                        <td data-label="Donor">{item.donor_name}</td>
                                        <td data-label="Quantity">{item.quantity}</td>
                                        <td data-label="Status">
                                            <span className="rao-status-badge rao-status-delivered">
                                                Delivered
                                            </span>
                                        </td>
                                        <td data-label="Delivered Date">{item.delivered_date}</td>
                                        <td data-label="Feedback">
                                            {item.feedback_given ? (
                                                <span className="rh-feedback-given">Feedback given</span>
                                            ) : (
                                                <button
                                                    className="rao-btn-feedback"
                                                    onClick={() => openFeedbackModal(item)}
                                                    disabled={actionLoading === item.offer_id}
                                                >
                                                    <FeedbackIcon fontSize="small" />
                                                    Give Feedback
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Feedback Modal (reused from Accepted page) */}
            <RateExperienceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={submitFeedback}
                offerTitle={feedbackOffer?.title || ''}
                donorName={feedbackOffer?.donor_name || 'Donor'}
                volunteerName={feedbackOffer?.volunteer_name || 'the volunteer'}
            />
        </div>
    );
};

export default ReceiverHistory;