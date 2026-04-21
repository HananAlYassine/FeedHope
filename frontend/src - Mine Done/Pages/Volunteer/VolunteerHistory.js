// ============================================================
//  FeedHope — Volunteer History Page (Past Deliveries)
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import '../../Styles/Volunteer/VolunteerDashboard.css';
import '../../Styles/Volunteer/VolunteerHistory.css';

// MUI Icons
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RouteIcon from '@mui/icons-material/Route';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const VolunteerHistory = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRating, setSelectedRating] = useState('all');
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);

    // Mock data for completed deliveries
    const [deliveries] = useState([
        {
            id: 1,
            title: 'Fresh Vegetables',
            donor: 'Fresh Bites Restaurant',
            donorAddress: '789 Restaurant Row, Downtown',
            receiver: 'City Food Bank',
            receiverAddress: '456 Food Drive, Cityville',
            distance: 4.5,
            rating: 4,
            ratingComment: 'Great delivery, on time!',
            date: '2026-03-12',
            weight: 25,
            category: 'Produce',
            deliveryTime: '11:45 AM',
            peopleHelped: 15
        },
        {
            id: 2,
            title: 'Cakes & Desserts',
            donor: 'Sweet Dreams Bakery',
            donorAddress: '123 Bakery Lane, Downtown',
            receiver: 'Hope Shelter',
            receiverAddress: '555 Shelter Ave, Cityville',
            distance: 5.2,
            rating: 5,
            ratingComment: 'Excellent service, very professional!',
            date: '2026-03-10',
            weight: 12,
            category: 'Bakery',
            deliveryTime: '10:30 AM',
            peopleHelped: 8
        },
        {
            id: 3,
            title: 'Soup & Sandwiches',
            donor: 'Community Kitchen',
            donorAddress: '321 Help Street, Downtown',
            receiver: 'Downtown Mission',
            receiverAddress: '789 Mission Blvd, Cityville',
            distance: 3.8,
            rating: 4,
            ratingComment: 'Quick and efficient delivery',
            date: '2026-03-08',
            weight: 18,
            category: 'Prepared Meals',
            deliveryTime: '12:15 PM',
            peopleHelped: 12
        },
        {
            id: 4,
            title: 'Bulk Rice & Grains',
            donor: 'Wholesale Foods Co.',
            donorAddress: '456 Industrial Blvd, Cityville',
            receiver: 'Regional Food Bank',
            receiverAddress: '123 Food Bank Way, Cityville',
            distance: 8.5,
            rating: 5,
            ratingComment: 'Handled bulk items with care',
            date: '2026-03-05',
            weight: 150,
            category: 'Non-Perishable',
            deliveryTime: '2:30 PM',
            peopleHelped: 50
        },
        {
            id: 5,
            title: 'Dairy Products',
            donor: 'Dairy Farm Fresh',
            donorAddress: '78 Farm Road, Cityville',
            receiver: 'Family Support Center',
            receiverAddress: '234 Family Ave, Cityville',
            distance: 6.2,
            rating: 3,
            ratingComment: 'Good but slight delay',
            date: '2026-03-03',
            weight: 30,
            category: 'Refrigerated',
            deliveryTime: '9:45 AM',
            peopleHelped: 10
        }
    ]);

    // Calculate statistics
    const stats = {
        totalDeliveries: deliveries.length,
        peopleHelped: deliveries.reduce((sum, d) => sum + d.peopleHelped, 0),
        avgRating: (deliveries.reduce((sum, d) => sum + d.rating, 0) / deliveries.length).toFixed(1),
        totalDistance: deliveries.reduce((sum, d) => sum + d.distance, 0)
    };

    const handleLogout = () => {
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
        const matchesSearch = delivery.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            delivery.donor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            delivery.receiver.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRating = selectedRating === 'all' || delivery.rating === parseInt(selectedRating);

        return matchesSearch && matchesRating;
    });

    // Render star rating
    const renderStars = (rating) => {
        return (
            <div className="rating-stars">
                {[1, 2, 3, 4, 5].map(star => (
                    star <= rating ? (
                        <StarIcon key={star} className="star-filled" />
                    ) : (
                        <StarBorderIcon key={star} className="star-empty" />
                    )
                ))}
            </div>
        );
    };

    // Format date
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="vh-layout">
            <VolunteerSidebar user={{ name: 'John Smith' }} onLogout={handleLogout} activePage="history" />

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
                            <span className="vh-stat-number">{stats.avgRating}</span>
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
                            placeholder="Search users, donations, or deliveries..."
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
                    </select>
                </div>

                {/* Deliveries Table */}
                {filteredDeliveries.length === 0 ? (
                    <div className="vh-empty-state">
                        <CheckCircleIcon className="vh-empty-icon" />
                        <p>No past deliveries found matching your criteria.</p>
                        <button onClick={() => { setSearchTerm(''); setSelectedRating('all'); }}>
                            Clear Filters
                        </button>
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
                                    <tr key={delivery.id}>
                                        <td className="vh-offer-cell">
                                            <div className="vh-offer-title">{delivery.title}</div>
                                            <div className="vh-offer-meta">
                                                <span><Inventory2Icon style={{ fontSize: 12 }} /> {delivery.weight} KG</span>
                                                <span><TrendingUpIcon style={{ fontSize: 12 }} /> {delivery.category}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="vh-party-info">
                                                <strong>{delivery.donor}</strong>
                                                <small>{delivery.donorAddress}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="vh-party-info">
                                                <strong>{delivery.receiver}</strong>
                                                <small>{delivery.receiverAddress}</small>
                                            </div>
                                        </td>
                                        <td className="vh-distance">{delivery.distance} km</td>
                                        <td className="vh-rating-cell">
                                            {renderStars(delivery.rating)}
                                            <span className="vh-rating-text">{delivery.rating}/5</span>
                                        </td>
                                        <td className="vh-date-cell">
                                            <CalendarTodayIcon style={{ fontSize: 14 }} />
                                            <span>{formatDate(delivery.date)}</span>
                                            <small>{delivery.deliveryTime}</small>
                                        </td>
                                        <td className="vh-actions-cell">
                                            <button
                                                className="vh-feedback-btn"
                                                onClick={() => handleViewFeedback(delivery)}
                                            >
                                                View Feedback
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Impact Summary Footer */}
                {filteredDeliveries.length > 0 && (
                    <div className="vh-impact-summary">
                        <div className="vh-impact-text">
                            <TrendingUpIcon />
                            <span>Total impact from displayed deliveries: <strong>{filteredDeliveries.reduce((sum, d) => sum + d.peopleHelped, 0)} people helped</strong> with <strong>{filteredDeliveries.reduce((sum, d) => sum + d.weight, 0)} KG</strong> of food delivered</span>
                        </div>
                    </div>
                )}

                {/* Feedback Modal */}
                {showFeedbackModal && selectedDelivery && (
                    <div className="vh-modal-overlay" onClick={handleCloseModal}>
                        <div className="vh-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="vh-modal-header">
                                <h3>Delivery Feedback</h3>
                                <button className="vh-modal-close" onClick={handleCloseModal}>×</button>
                            </div>
                            <div className="vh-modal-body">
                                <div className="vh-feedback-item">
                                    <label>Offer:</label>
                                    <p>{selectedDelivery.title}</p>
                                </div>
                                <div className="vh-feedback-item">
                                    <label>Rating:</label>
                                    <div className="vh-feedback-rating">
                                        {renderStars(selectedDelivery.rating)}
                                    </div>
                                </div>
                                <div className="vh-feedback-item">
                                    <label>Feedback:</label>
                                    <p className="vh-feedback-comment">{selectedDelivery.ratingComment || 'No comment provided.'}</p>
                                </div>
                                <div className="vh-feedback-item">
                                    <label>Delivery Date:</label>
                                    <p>{formatDate(selectedDelivery.date)} at {selectedDelivery.deliveryTime}</p>
                                </div>
                                <div className="vh-feedback-item">
                                    <label>People Helped:</label>
                                    <p>{selectedDelivery.peopleHelped} individuals/families</p>
                                </div>
                            </div>
                            <div className="vh-modal-footer">
                                <button className="vh-modal-close-btn" onClick={handleCloseModal}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default VolunteerHistory;