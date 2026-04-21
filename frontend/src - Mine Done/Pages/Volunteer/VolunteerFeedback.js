// ============================================================
//  FeedHope — Volunteer Ratings & Feedback Page
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
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
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import CommentIcon from '@mui/icons-material/Comment';
import DescriptionIcon from '@mui/icons-material/Description';

const VolunteerRatings = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedRating, setSelectedRating] = useState(null);

    // Mock ratings data
    const [ratings] = useState([
        {
            id: 1,
            title: 'Fresh Vegetables',
            donor: 'Fresh Bites Restaurant',
            receiver: 'City Food Bank',
            rating: 4.0,
            comment: 'Good delivery, arrived a bit early. The vegetables were fresh and well-organized.',
            date: '2026-03-12',
            deliveryTime: '11:45 AM',
            category: 'Produce',
            weight: 25,
            peopleHelped: 15,
            helpful: 12
        },
        {
            id: 2,
            title: 'Cakes & Desserts',
            donor: 'Sweet Dreams Bakery',
            receiver: 'Hope Shelter',
            rating: 5.0,
            comment: 'Excellent service! The volunteer was very professional and handled the desserts with care. Arrived exactly on time.',
            date: '2026-03-10',
            deliveryTime: '10:30 AM',
            category: 'Bakery',
            weight: 12,
            peopleHelped: 8,
            helpful: 24
        },
        {
            id: 3,
            title: 'Soup & Sandwiches',
            donor: 'Community Kitchen',
            receiver: 'Downtown Mission',
            rating: 4.5,
            comment: 'Quick and efficient delivery. Very friendly volunteer who helped unload the food.',
            date: '2026-03-08',
            deliveryTime: '12:15 PM',
            category: 'Prepared Meals',
            weight: 18,
            peopleHelped: 12,
            helpful: 8
        },
        {
            id: 4,
            title: 'Dairy Products',
            donor: 'Dairy Farm Fresh',
            receiver: 'Family Support Center',
            rating: 3.5,
            comment: 'Good but slight delay. The volunteer communicated well about the delay though.',
            date: '2026-03-03',
            deliveryTime: '9:45 AM',
            category: 'Refrigerated',
            weight: 30,
            peopleHelped: 10,
            helpful: 5
        }
    ]);

    // Calculate statistics
    const totalRatings = ratings.length;
    const averageRating = (ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1);
    const totalHelpful = ratings.reduce((sum, r) => sum + r.helpful, 0);
    const fiveStarCount = ratings.filter(r => r.rating >= 4.5).length;

    const handleLogout = () => {
        localStorage.removeItem('volunteer_user');
        navigate('/signin');
    };

    const handleOpenReport = (rating) => {
        setSelectedRating(rating);
        setShowReportModal(true);
    };

    const handleCloseReport = () => {
        setShowReportModal(false);
        setSelectedRating(null);
    };

    // Filter ratings based on search
    const filteredRatings = ratings.filter(rating => {
        return rating.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rating.donor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rating.receiver.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rating.comment.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Render star rating (supports half stars)
    const renderStars = (rating) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return (
            <div className="vr-stars">
                {[...Array(fullStars)].map((_, i) => (
                    <StarIcon key={`full-${i}`} className="vr-star-filled" />
                ))}
                {hasHalfStar && <StarHalfIcon className="vr-star-half" />}
                {[...Array(emptyStars)].map((_, i) => (
                    <StarBorderIcon key={`empty-${i}`} className="vr-star-empty" />
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
        <div className="vr-layout">
            <VolunteerSidebar user={{ name: 'John Smith' }} onLogout={handleLogout} activePage="ratings" />

            <main className="vr-main">
                {/* Header Banner */}
                <div className="vr-header">
                    <div className="vr-header-text">
                        <h1 className="vr-title">My Ratings</h1>
                        <p className="vr-subtitle">View feedback and ratings from receivers</p>
                    </div>
                    <button className="vr-report-btn" onClick={() => handleOpenReport(null)}>
                        <DescriptionIcon style={{ fontSize: 18, marginRight: 6 }} />
                        + New Report
                    </button>
                </div>

                {/* Rating Summary Card */}
                <div className="vr-summary-card">
                    <div className="vr-summary-left">
                        <div className="vr-average-rating">
                            <span className="vr-average-number">{averageRating}</span>
                            <div className="vr-average-stars">
                                {renderStars(parseFloat(averageRating))}
                            </div>
                        </div>
                        <div className="vr-stats-info">
                            <div className="vr-stat-item">
                                <span className="vr-stat-value">{totalRatings}</span>
                                <span className="vr-stat-label">Total Ratings</span>
                            </div>
                            <div className="vr-stat-divider"></div>
                            <div className="vr-stat-item">
                                <span className="vr-stat-value">{totalHelpful}</span>
                                <span className="vr-stat-label">Helpful Votes</span>
                            </div>
                            <div className="vr-stat-divider"></div>
                            <div className="vr-stat-item">
                                <span className="vr-stat-value">{fiveStarCount}</span>
                                <span className="vr-stat-label">5-Star Ratings</span>
                            </div>
                        </div>
                    </div>
                    <div className="vr-summary-right">
                        <div className="vr-rating-badge">
                            <ThumbUpIcon />
                            <span>Based on {totalRatings} rating{totalRatings !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="vr-search-section">
                    <div className="vr-search-wrapper">
                        <SearchIcon className="vr-search-icon" />
                        <input
                            type="text"
                            placeholder="Search users, donations, or deliveries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="vr-search-input"
                        />
                    </div>
                </div>

                {/* Ratings List */}
                {filteredRatings.length === 0 ? (
                    <div className="vr-empty-state">
                        <EmojiEmotionsIcon className="vr-empty-icon" />
                        <p>No ratings found matching your search.</p>
                        <button onClick={() => setSearchTerm('')}>Clear Search</button>
                    </div>
                ) : (
                    <div className="vr-ratings-list">
                        {filteredRatings.map(rating => (
                            <div key={rating.id} className="vr-rating-card">
                                <div className="vr-rating-header">
                                    <div className="vr-rating-title-section">
                                        <h3 className="vr-rating-title">{rating.title}</h3>
                                        <div className="vr-rating-stars">
                                            {renderStars(rating.rating)}
                                            <span className="vr-rating-value">{rating.rating}/5.0</span>
                                        </div>
                                    </div>
                                    <div className="vr-rating-date">
                                        <CalendarTodayIcon style={{ fontSize: 14 }} />
                                        <span>{formatDate(rating.date)}</span>
                                    </div>
                                </div>

                                <div className="vr-routing-info">
                                    <div className="vr-route-item">
                                        <PersonIcon style={{ fontSize: 14 }} />
                                        <span className="vr-donor">{rating.donor}</span>
                                    </div>
                                    <ArrowForwardIcon className="vr-arrow-icon" />
                                    <div className="vr-route-item">
                                        <LocationOnIcon style={{ fontSize: 14 }} />
                                        <span className="vr-receiver">{rating.receiver}</span>
                                    </div>
                                </div>

                                <div className="vr-rating-comment">
                                    <CommentIcon className="vr-comment-icon" />
                                    <p className="vr-comment-text">"{rating.comment}"</p>
                                </div>

                                <div className="vr-rating-footer">
                                    <div className="vr-delivery-meta">
                                        <span className="vr-meta-tag">{rating.category}</span>
                                        <span className="vr-meta-tag">{rating.weight} KG</span>
                                        <span className="vr-meta-tag">{rating.deliveryTime}</span>
                                    </div>
                                    <button
                                        className="vr-view-report-btn"
                                        onClick={() => handleOpenReport(rating)}
                                    >
                                        View Full Report
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Report Modal */}
                {showReportModal && (
                    <div className="vr-modal-overlay" onClick={handleCloseReport}>
                        <div className="vr-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="vr-modal-header">
                                <h3>Delivery Report</h3>
                                <button className="vr-modal-close" onClick={handleCloseReport}>×</button>
                            </div>
                            <div className="vr-modal-body">
                                {selectedRating ? (
                                    <>
                                        <div className="vr-report-section">
                                            <label>Delivery Details</label>
                                            <div className="vr-report-field">
                                                <strong>Offer:</strong> {selectedRating.title}
                                            </div>
                                            <div className="vr-report-field">
                                                <strong>From:</strong> {selectedRating.donor}
                                            </div>
                                            <div className="vr-report-field">
                                                <strong>To:</strong> {selectedRating.receiver}
                                            </div>
                                            <div className="vr-report-field">
                                                <strong>Date:</strong> {formatDate(selectedRating.date)} at {selectedRating.deliveryTime}
                                            </div>
                                        </div>

                                        <div className="vr-report-section">
                                            <label>Rating & Feedback</label>
                                            <div className="vr-report-rating">
                                                {renderStars(selectedRating.rating)}
                                                <span className="vr-report-rating-value">{selectedRating.rating}/5.0</span>
                                            </div>
                                            <div className="vr-report-comment">
                                                "{selectedRating.comment}"
                                            </div>
                                        </div>

                                        <div className="vr-report-section">
                                            <label>Impact Metrics</label>
                                            <div className="vr-report-metrics">
                                                <div className="vr-metric">
                                                    <span className="vr-metric-value">{selectedRating.weight} KG</span>
                                                    <span className="vr-metric-label">Food Delivered</span>
                                                </div>
                                                <div className="vr-metric">
                                                    <span className="vr-metric-value">{selectedRating.peopleHelped}</span>
                                                    <span className="vr-metric-label">People Helped</span>
                                                </div>
                                                <div className="vr-metric">
                                                    <span className="vr-metric-value">{selectedRating.helpful}</span>
                                                    <span className="vr-metric-label">Helpful Votes</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="vr-report-section">
                                            <label>Additional Notes</label>
                                            <textarea
                                                className="vr-report-textarea"
                                                rows="3"
                                                placeholder="Add any additional notes or comments..."
                                            ></textarea>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="vr-report-section">
                                            <label>Report Type</label>
                                            <select className="vr-report-select">
                                                <option>Monthly Summary Report</option>
                                                <option>Quarterly Impact Report</option>
                                                <option>Custom Date Range</option>
                                                <option>Performance Report</option>
                                            </select>
                                        </div>
                                        <div className="vr-report-section">
                                            <label>Date Range</label>
                                            <div className="vr-date-range">
                                                <input type="date" className="vr-date-input" placeholder="Start Date" />
                                                <span>to</span>
                                                <input type="date" className="vr-date-input" placeholder="End Date" />
                                            </div>
                                        </div>
                                        <div className="vr-report-section">
                                            <label>Include Metrics</label>
                                            <div className="vr-checkbox-group">
                                                <label><input type="checkbox" defaultChecked /> Ratings Summary</label>
                                                <label><input type="checkbox" defaultChecked /> Feedback Comments</label>
                                                <label><input type="checkbox" defaultChecked /> Delivery Statistics</label>
                                                <label><input type="checkbox" /> Individual Delivery Reports</label>
                                            </div>
                                        </div>
                                        <div className="vr-report-section">
                                            <label>Additional Notes</label>
                                            <textarea
                                                className="vr-report-textarea"
                                                rows="3"
                                                placeholder="Enter any specific requirements or notes for this report..."
                                            ></textarea>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="vr-modal-footer">
                                <button className="vr-modal-cancel" onClick={handleCloseReport}>Cancel</button>
                                <button className="vr-modal-submit" onClick={handleCloseReport}>
                                    {selectedRating ? 'Download Report' : 'Generate Report'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default VolunteerRatings;