// ============================================================
//  FeedHope — Volunteer History Page
//  Lists every delivery the volunteer has completed
//  (Food_offer.status = 'delivered'), with feedback received.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import DashboardChatbot from '../../Components/Shared/DashboardChatbot';
import '../../Styles/Volunteer/VolunteerDashboard.css';
import '../../Styles/Volunteer/VolunteerHistory.css';

// MUI Icons
import SearchIcon from '@mui/icons-material/Search';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RouteIcon from '@mui/icons-material/Route';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NotesIcon from '@mui/icons-material/Notes';

const API_BASE = 'http://localhost:5000';

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const VolunteerHistory = () => {
    const navigate = useNavigate();

    const [user] = useState(() => {
        const raw = localStorage.getItem('feedhope_user');
        return raw ? JSON.parse(raw) : null;
    });

    const [deliveries, setDeliveries] = useState([]);
    const [stats, setStats] = useState({ totalDeliveries: 0, peopleHelped: 0, avgRating: 0, totalDistance: 0 });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRating, setSelectedRating] = useState('all');
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);

    const fetchHistory = useCallback(async () => {
        if (!user?.user_id) return;
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/api/volunteer/history/${user.user_id}`);
            setDeliveries(res.data.deliveries || []);
            setStats(res.data.stats || { totalDeliveries: 0, peopleHelped: 0, avgRating: 0, totalDistance: 0 });
        } catch (err) {
            console.error('Failed to load history:', err);
            setErrorMessage(err.response?.data?.error || 'Failed to load delivery history.');
        } finally {
            setLoading(false);
        }
    }, [user?.user_id]);

    useEffect(() => {
        if (!user) {
            navigate('/signin');
            return;
        }
        fetchHistory();
    }, [fetchHistory, navigate, user]);

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        localStorage.removeItem('volunteer_user');
        navigate('/signin');
    };

    const handleViewFeedback = (delivery) => {
        setSelectedDelivery(delivery);
        setShowFeedbackModal(true);
    };

    const handleCloseModal = () => {
        setShowFeedbackModal(false);
        setSelectedDelivery(null);
    };

    // Filter deliveries based on search and rating
    const filteredDeliveries = deliveries.filter(delivery => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
            (delivery.food_name || '').toLowerCase().includes(search) ||
            (delivery.donor_name || '').toLowerCase().includes(search) ||
            (delivery.receiver_name || '').toLowerCase().includes(search);

        const matchesRating =
            selectedRating === 'all' ||
            (selectedRating === 'unrated' && delivery.rating == null) ||
            (delivery.rating != null && Math.round(delivery.rating) === parseInt(selectedRating, 10));

        return matchesSearch && matchesRating;
    });

    // Render star rating
    const renderStars = (rating) => {
        const rounded = rating != null ? Math.round(rating) : 0;
        return (
            <div className="rating-stars">
                {[1, 2, 3, 4, 5].map(star => (
                    star <= rounded ? (
                        <StarIcon key={star} className="star-filled" />
                    ) : (
                        <StarBorderIcon key={star} className="star-empty" />
                    )
                ))}
            </div>
        );
    };

    return (
        <div className="vh-layout">
            <VolunteerSidebar user={user} onLogout={handleLogout} activePage="history" />

            <main className="vh-main">
                {/* Header Banner */}
                <div className="vh-header">
                    <div className="vh-header-text">
                        <h1 className="vh-title">Delivery History</h1>
                        <p className="vh-subtitle">Review your past deliveries and impact</p>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="vh-stats-grid">
                    <div className="vh-stat-card">
                        <div className="vh-stat-icon blue">
                            <LocalShippingIcon />
                        </div>
                        <div className="vh-stat-info">
                            <span className="vh-stat-number">{stats.totalDeliveries}</span>
                            <span className="vh-stat-label">Total Deliveries</span>
                        </div>
                    </div>
                    <div className="vh-stat-card">
                        <div className="vh-stat-icon green">
                            <PeopleIcon />
                        </div>
                        <div className="vh-stat-info">
                            <span className="vh-stat-number">{stats.peopleHelped}</span>
                            <span className="vh-stat-label">People Helped</span>
                        </div>
                    </div>
                    <div className="vh-stat-card">
                        <div className="vh-stat-icon yellow">
                            <StarIcon />
                        </div>
                        <div className="vh-stat-info">
                            <span className="vh-stat-number">{stats.avgRating || '—'}</span>
                            <span className="vh-stat-label">Avg Rating</span>
                        </div>
                    </div>
                    <div className="vh-stat-card">
                        <div className="vh-stat-icon purple">
                            <RouteIcon />
                        </div>
                        <div className="vh-stat-info">
                            <span className="vh-stat-number">{stats.totalDistance}km</span>
                            <span className="vh-stat-label">Distance Covered</span>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="vh-search-section">
                    <div className="vh-search-wrapper">
                        <SearchIcon className="vh-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by food, donor, or receiver..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="vh-search-input"
                        />
                    </div>

                    <select
                        className="vh-rating-filter"
                        value={selectedRating}
                        onChange={(e) => setSelectedRating(e.target.value)}
                    >
                        <option value="all">All Ratings</option>
                        <option value="5">5 Stars ★★★★★</option>
                        <option value="4">4 Stars ★★★★☆</option>
                        <option value="3">3 Stars ★★★☆☆</option>
                        <option value="2">2 Stars ★★☆☆☆</option>
                        <option value="1">1 Star ★☆☆☆☆</option>
                        <option value="unrated">Not yet rated</option>
                    </select>
                </div>

                {/* Error */}
                {errorMessage && (
                    <div className="vh-empty-state">
                        <p style={{ color: '#991b1b' }}>{errorMessage}</p>
                    </div>
                )}

                {/* Deliveries Table */}
                {loading ? (
                    <div className="vh-empty-state">
                        <p>Loading your delivery history…</p>
                    </div>
                ) : filteredDeliveries.length === 0 ? (
                    <div className="vh-empty-state">
                        <CheckCircleIcon className="vh-empty-icon" />
                        <p>{deliveries.length === 0
                            ? "You haven't completed any deliveries yet."
                            : 'No past deliveries match your search.'}
                        </p>
                        {deliveries.length > 0 && (
                            <button onClick={() => { setSearchTerm(''); setSelectedRating('all'); }}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="vh-table-container">
                        <table className="vh-table">
                            <thead>
                                <tr>
                                    <th>Offer</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Distance</th>
                                    <th>Rating</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDeliveries.map(delivery => (
                                    <tr key={delivery.delivery_id}>
                                        <td className="vh-offer-cell">
                                            <div className="vh-offer-title">{delivery.food_name}</div>
                                            <div className="vh-offer-meta">
                                                {delivery.quantity_by_kg && (
                                                    <span className="vh-offer-meta-item">
                                                        <Inventory2Icon style={{ fontSize: 14 }} />
                                                        {delivery.quantity_by_kg} KG
                                                    </span>
                                                )}
                                                {delivery.category && (
                                                    <span className="vh-offer-meta-item">
                                                        <TrendingUpIcon style={{ fontSize: 14 }} />
                                                        {delivery.category}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="vh-party-info">
                                                <strong>{delivery.donor_name}</strong>
                                                <small>{delivery.donor_address || '—'}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="vh-party-info">
                                                <strong>{delivery.receiver_name || '—'}</strong>
                                                <small>{delivery.receiver_address || '—'}</small>
                                            </div>
                                        </td>
                                        <td className="vh-distance">
                                            {delivery.distance_km != null ? `${delivery.distance_km} km` : '—'}
                                        </td>
                                        <td className="vh-rating-cell">
                                            {delivery.rating != null ? (
                                                <>
                                                    {renderStars(delivery.rating)}
                                                    <span className="vh-rating-text">{delivery.rating}/5</span>
                                                </>
                                            ) : (
                                                <span className="vh-rating-text" style={{ color: '#94a3b8' }}>
                                                    Not yet rated
                                                </span>
                                            )}
                                        </td>
                                        <td className="vh-date-cell">
                                            <div className="vh-date-row">
                                                <CalendarTodayIcon style={{ fontSize: 14 }} />
                                                <span>{formatDate(delivery.delivery_time)}</span>
                                            </div>
                                            {formatTime(delivery.delivery_time) && (
                                                <small>{formatTime(delivery.delivery_time)}</small>
                                            )}
                                        </td>
                                        <td className="vh-actions-cell">
                                            <button
                                                className="vh-feedback-btn"
                                                onClick={() => handleViewFeedback(delivery)}
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Impact Summary Footer */}
                {!loading && filteredDeliveries.length > 0 && (
                    <div className="vh-impact-summary">
                        <div className="vh-impact-text">
                            <TrendingUpIcon />
                            <span>
                                Total impact from displayed deliveries:{' '}
                                <strong>
                                    {filteredDeliveries.reduce((sum, d) => sum + (Number(d.number_of_person) || 0), 0)} people helped
                                </strong>
                                {' '}with{' '}
                                <strong>
                                    {filteredDeliveries.reduce((sum, d) => sum + (Number(d.quantity_by_kg) || 0), 0)} KG
                                </strong>
                                {' '}of food delivered
                            </span>
                        </div>
                    </div>
                )}

                {/* Detail / Feedback Modal */}
                {showFeedbackModal && selectedDelivery && (
                    <div className="vh-modal-overlay" onClick={handleCloseModal}>
                        <div className="vh-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="vh-modal-header">
                                <h3>Delivery Details</h3>
                                <button className="vh-modal-close" onClick={handleCloseModal}>×</button>
                            </div>
                            <div className="vh-modal-body">
                                <div className="vh-feedback-item">
                                    <label>Offer:</label>
                                    <p>{selectedDelivery.food_name}</p>
                                </div>
                                <div className="vh-feedback-item">
                                    <label>From → To:</label>
                                    <p>{selectedDelivery.donor_name} → {selectedDelivery.receiver_name || '—'}</p>
                                </div>
                                <div className="vh-feedback-item">
                                    <label>Delivered On:</label>
                                    <p>
                                        {formatDate(selectedDelivery.delivery_time)}
                                        {formatTime(selectedDelivery.delivery_time)
                                            ? ` at ${formatTime(selectedDelivery.delivery_time)}`
                                            : ''}
                                    </p>
                                </div>
                                {selectedDelivery.number_of_person != null && (
                                    <div className="vh-feedback-item">
                                        <label>People Helped:</label>
                                        <p>{selectedDelivery.number_of_person} individuals/families</p>
                                    </div>
                                )}
                                <div className="vh-feedback-item">
                                    <label>
                                        <NotesIcon style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }} />
                                        Your Delivery Notes:
                                    </label>
                                    <p className="vh-feedback-comment">
                                        {selectedDelivery.delivery_notes || 'No notes were left for this delivery.'}
                                    </p>
                                </div>
                                <div className="vh-feedback-item">
                                    <label>Rating Received:</label>
                                    {selectedDelivery.rating != null ? (
                                        <>
                                            <div className="vh-feedback-rating">
                                                {renderStars(selectedDelivery.rating)}
                                                <span className="vh-rating-text" style={{ marginLeft: 8 }}>
                                                    {selectedDelivery.rating}/5
                                                </span>
                                            </div>
                                            <p className="vh-feedback-comment">
                                                {selectedDelivery.rating_comment || 'No comment was left.'}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="vh-feedback-comment" style={{ color: '#94a3b8' }}>
                                            No rating received yet for this delivery.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="vh-modal-footer">
                                <button className="vh-modal-close-btn" onClick={handleCloseModal}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        <DashboardChatbot role="Volunteer" />
            </div>
    );
};

export default VolunteerHistory;
