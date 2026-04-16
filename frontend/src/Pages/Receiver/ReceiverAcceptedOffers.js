// =============================================
//  FeedHope — Omar & Hanan
//  Pages/Receiver/ReceiverAcceptedOffers.js
// ==============================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';
import '../../Styles/Receiver/ReceiverAcceptedOffers.css';

import CancelIcon from '@mui/icons-material/Cancel';
import FeedbackIcon from '@mui/icons-material/Feedback';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import WarningAmberIcon from '@mui/icons-material/WarningAmber'; // for confirmation modal

const formatPickupTime = (datetime) => {
    if (!datetime) return '—';
    return new Date(datetime).toLocaleString();
};

const formatQuantity = (offer) => {
    if (offer.quantity_by_kg) return `${offer.quantity_by_kg} kg`;
    if (offer.number_of_person) return `${offer.number_of_person} portions`;
    return '—';
};

// ========== NEW: Confirmation Modal for Cancel ==========
const ConfirmCancelModal = ({ isOpen, onClose, onConfirm, offerTitle }) => {
    if (!isOpen) return null;

    return (
        <div className="ram-modal-overlay">
            <div className="ram-modal confirm-cancel-modal">
                <div className="ram-modal-header">
                    <h3>Cancel Offer</h3>
                    <button className="ram-modal-close" onClick={onClose}>
                        <CloseIcon fontSize="small" />
                    </button>
                </div>
                <div className="ram-modal-body">
                    <div className="confirm-warning-icon">
                        <WarningAmberIcon sx={{ fontSize: 48, color: '#f5b042' }} />
                    </div>
                    <p className="confirm-message">
                        Are you sure you want to cancel the offer <strong>“{offerTitle}”</strong>?
                    </p>
                    <p className="confirm-submessage">This action cannot be undone.</p>
                </div>
                <div className="ram-modal-footer confirm-footer">
                    <button className="ram-btn-cancel-modal" onClick={onClose}>
                        No, Keep It
                    </button>
                    <button className="ram-btn-submit confirm-btn-danger" onClick={onConfirm}>
                        Yes, Cancel Offer
                    </button>
                </div>
            </div>
        </div>
    );
};
// ========================================================

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

const ReceiverAcceptedOffers = () => {
    const navigate = useNavigate();

    const [user] = useState(() => {
        const stored = localStorage.getItem('feedhope_user');
        return stored ? JSON.parse(stored) : null;
    });

    const organizationName = user?.name || 'Receiver';
    const userId = user?.user_id;

    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [feedbackOffer, setFeedbackOffer] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // state for cancel confirmation modal
    const [cancelConfirm, setCancelConfirm] = useState({ show: false, offerId: null, offerTitle: '' });

    const fetchAcceptedOffers = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/accepted-offers/${userId}`);
            if (!res.ok) throw new Error('Failed to fetch accepted offers');
            const data = await res.json();
            setOffers(data);
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
        fetchAcceptedOffers();
    }, [userId, navigate, fetchAcceptedOffers]);

    // function to open confirmation modal instead of window.confirm
    const handleCancelClick = (offerId, offerTitle) => {
        setCancelConfirm({ show: true, offerId, offerTitle });
    };

    // actual cancel logic after confirmation
    const confirmCancel = async () => {
        const { offerId } = cancelConfirm;
        if (!offerId) return;
        setActionLoading(offerId);
        setCancelConfirm({ show: false, offerId: null, offerTitle: '' });
        try {
            const res = await fetch('http://localhost:5000/api/receiver/cancel-offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offerId, userId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Cancel failed');
            fetchAcceptedOffers();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const openFeedbackModal = (offer) => {
        setFeedbackOffer(offer);
        setIsModalOpen(true);
    };

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
            fetchAcceptedOffers();
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
                <ReceiverSidebar onLogout={handleLogout} activePage="accepted" />
                <main className="rdb-main">
                    <div className="rdb-loading-screen">
                        <div className="rdb-spinner" />
                        <p>Loading accepted offers…</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rdb-layout">
                <ReceiverSidebar onLogout={handleLogout} activePage="accepted" />
                <main className="rdb-main">
                    <div className="rdb-error-screen">
                        <p className="rdb-error-msg">{error}</p>
                        <button className="rdb-retry-btn" onClick={fetchAcceptedOffers}>Retry</button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="rdb-layout">
            <ReceiverSidebar onLogout={handleLogout} activePage="accepted" />

            <main className="rdb-main">
                <div className="rdb-banner rob-banner rao-banner">
                    <div className="rdb-banner-text">
                        <p className="rdb-banner-greeting">Welcome back, {organizationName}</p>
                        <h1 className="rdb-banner-title">My Accepted Offers</h1>
                        <p className="rdb-banner-subtitle">
                            Track and manage your accepted food donations.
                        </p>
                        <div className="rao-date-badge">{formattedDate}</div>
                    </div>
                    <div className="rdb-banner-icon">
                        <RestaurantIcon sx={{ fontSize: 48, color: '#fff' }} />
                    </div>
                    <div className="rob-banner-stat">
                        <span className="rob-banner-stat-num">{offers.length}</span>
                        <span className="rob-banner-stat-label">Accepted Offers</span>
                    </div>
                </div>

                <div className="rao-table-container">
                    <table className="rao-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Donor</th>
                                <th>Quantity</th>
                                <th>Status</th>
                                <th>Pickup Time</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {offers.length === 0 ? (
                                <tr className="rao-empty-row">
                                    <td colSpan="6">You haven't accepted any offers yet.</td>
                                </tr>
                            ) : (
                                offers.map(offer => (
                                    <tr key={offer.offer_id}>
                                        <td data-label="Title">{offer.title}</td>
                                        <td data-label="Donor">{offer.donor_name}</td>
                                        <td data-label="Quantity">{formatQuantity(offer)}</td>
                                        <td data-label="Status">
                                            <span className="rao-status-badge rao-status-accepted">
                                                {offer.status}
                                            </span>
                                        </td>
                                        <td data-label="Pickup Time">{formatPickupTime(offer.pickup_time)}</td>
                                        <td data-label="Action">
                                            <div className="rao-actions">
                                                <button
                                                    className="rao-btn-cancel"
                                                    onClick={() => handleCancelClick(offer.offer_id, offer.title)}
                                                    disabled={actionLoading === offer.offer_id}
                                                >
                                                    <CancelIcon fontSize="small" />
                                                    Cancel
                                                </button>
                                                <button
                                                    className="rao-btn-feedback"
                                                    onClick={() => openFeedbackModal(offer)}
                                                    disabled={actionLoading === offer.offer_id}
                                                >
                                                    <FeedbackIcon fontSize="small" />
                                                    Give Feedback
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            <RateExperienceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={submitFeedback}
                offerTitle={feedbackOffer?.title || ''}
                donorName={feedbackOffer?.donor_name || 'Donor'}
                volunteerName={feedbackOffer?.volunteer_name || 'the volunteer'}
            />

            {/* Cancel Confirmation Modal */}
            <ConfirmCancelModal
                isOpen={cancelConfirm.show}
                onClose={() => setCancelConfirm({ show: false, offerId: null, offerTitle: '' })}
                onConfirm={confirmCancel}
                offerTitle={cancelConfirm.offerTitle}
            />
        </div>
    );
};

export default ReceiverAcceptedOffers;