// ============================================================
//  FeedHope — Volunteer Accepted Offers Page (My Deliveries)
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import '../../Styles/Volunteer/VolunteerDashboard.css';
import '../../Styles/Volunteer/VolunteerMyDeliveries.css';

// MUI Icons
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HistoryIcon from '@mui/icons-material/History';
import StarIcon from '@mui/icons-material/Star';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';

const VolunteerAcceptedOffers = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
    const [markingId, setMarkingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);

    // Mock data for accepted deliveries
    const [deliveries, setDeliveries] = useState([
        {
            id: 1,
            title: 'Cakes & Desserts',
            donor: 'Sweet Dreams Bakery',
            donorAddress: '123 Bakery Lane, Downtown',
            receiver: 'City Food Bank',
            receiverAddress: '456 Food Drive, Cityville',
            distance: 5.2,
            status: 'in_transit', // 'pending', 'in_transit', 'delivered'
            pickupTime: '14:00 - 15:00',
            deliveryDeadline: '17:00',
            category: 'Bakery',
            weight: 12,
            acceptedAt: '2026-03-23T10:30:00'
        },
        {
            id: 2,
            title: 'Fresh Vegetables',
            donor: 'Fresh Bites Restaurant',
            donorAddress: '789 Restaurant Row, Downtown',
            receiver: 'City Food Bank',
            receiverAddress: '456 Food Drive, Cityville',
            distance: 4.5,
            status: 'delivered',
            pickupTime: '09:00 - 10:00',
            deliveryDeadline: '12:00',
            category: 'Produce',
            weight: 25,
            acceptedAt: '2026-03-22T08:15:00',
            deliveredAt: '2026-03-22T11:45:00'
        },
        {
            id: 3,
            title: 'Soup & Sandwiches',
            donor: 'Community Kitchen',
            donorAddress: '321 Help Street, Downtown',
            receiver: 'Hope Shelter',
            receiverAddress: '555 Shelter Ave, Cityville',
            distance: 3.8,
            status: 'pending',
            pickupTime: '11:00 - 12:00',
            deliveryDeadline: '14:00',
            category: 'Prepared Meals',
            weight: 18,
            acceptedAt: '2026-03-23T09:00:00'
        }
    ]);

    const handleMarkDelivered = (deliveryId) => {
        setMarkingId(deliveryId);
        setTimeout(() => {
            setDeliveries(prev => prev.map(delivery =>
                delivery.id === deliveryId
                    ? { ...delivery, status: 'delivered', deliveredAt: new Date().toISOString() }
                    : delivery
            ));
            setMarkingId(null);
            setSuccessMessage('Delivery marked as delivered!');
            setTimeout(() => setSuccessMessage(''), 3000);
        }, 800);
    };

    const handleOpenReport = (delivery) => {
        setSelectedDelivery(delivery);
        setShowReportModal(true);
    };

    const handleCloseReport = () => {
        setShowReportModal(false);
        setSelectedDelivery(null);
    };

    const handleLogout = () => {
        localStorage.removeItem('volunteer_user');
        navigate('/signin');
    };

    // Filter deliveries based on search and active tab
    const filteredDeliveries = deliveries.filter(delivery => {
        const matchesSearch = delivery.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            delivery.donor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            delivery.receiver.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesTab = activeTab === 'active'
            ? delivery.status !== 'delivered'
            : delivery.status === 'delivered';

        return matchesSearch && matchesTab;
    });

    // Get status badge class and text
    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending':
                return { class: 'status-pending', text: 'Pending Pickup', icon: '⏳' };
            case 'in_transit':
                return { class: 'status-transit', text: 'In Transit', icon: '🚚' };
            case 'delivered':
                return { class: 'status-delivered', text: 'Delivered', icon: '✅' };
            default:
                return { class: 'status-pending', text: 'Pending', icon: '⏳' };
        }
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Get active deliveries count
    const activeCount = deliveries.filter(d => d.status !== 'delivered').length;
    const historyCount = deliveries.filter(d => d.status === 'delivered').length;

    return (
        <div className="vao-accepted-layout">
            <VolunteerSidebar user={{ name: 'John Smith' }} onLogout={handleLogout} activePage="my-deliveries" />

            <main className="vao-accepted-main">
                {/* Header Banner */}
                <div className="vao-accepted-header">
                    <div className="vao-accepted-header-text">
                        <h1 className="vao-accepted-title">My Deliveries</h1>
                        <p className="vao-accepted-subtitle">Track and update your active deliveries</p>
                    </div>
                    <button className="vao-report-btn" onClick={() => handleOpenReport({})}>
                        <DescriptionIcon style={{ fontSize: 18, marginRight: 6 }} />
                        + New Report
                    </button>
                </div>

                {/* Stats Overview Cards */}
                <div className="vao-accepted-stats">
                    <div className="vao-stat-card-mini">
                        <div className="vao-stat-mini-icon blue">
                            <LocalShippingIcon />
                        </div>
                        <div className="vao-stat-mini-info">
                            <span className="vao-stat-mini-number">{activeCount}</span>
                            <span className="vao-stat-mini-label">Active Deliveries</span>
                        </div>
                    </div>
                    <div className="vao-stat-card-mini">
                        <div className="vao-stat-mini-icon green">
                            <CheckCircleIcon />
                        </div>
                        <div className="vao-stat-mini-info">
                            <span className="vao-stat-mini-number">{historyCount}</span>
                            <span className="vao-stat-mini-label">Completed</span>
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="vao-accepted-success">
                        <CheckCircleIcon /> {successMessage}
                    </div>
                )}

                {/* Tabs */}
                <div className="vao-accepted-tabs">
                    <button
                        className={`vao-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveTab('active')}
                    >
                        <AssignmentIcon style={{ fontSize: 18 }} />
                        Active Deliveries ({activeCount})
                    </button>
                    <button
                        className={`vao-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <HistoryIcon style={{ fontSize: 18 }} />
                        History ({historyCount})
                    </button>
                </div>

                {/* Search Bar */}
                <div className="vao-accepted-search">
                    <div className="vao-accepted-search-wrapper">
                        <SearchIcon className="vao-accepted-search-icon" />
                        <input
                            type="text"
                            placeholder="Search users, donations, or deliveries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="vao-accepted-search-input"
                        />
                    </div>
                </div>

                {/* Deliveries Table */}
                {filteredDeliveries.length === 0 ? (
                    <div className="vao-accepted-empty">
                        <p>No {activeTab === 'active' ? 'active' : 'completed'} deliveries found.</p>
                        {activeTab === 'active' && (
                            <button onClick={() => navigate('/volunteer/available-offers')}>
                                Browse Available Offers
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="vao-accepted-table-container">
                        <table className="vao-accepted-table">
                            <thead>
                                <tr>
                                    <th>Offer</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Distance</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDeliveries.map(delivery => {
                                    const statusInfo = getStatusInfo(delivery.status);
                                    return (
                                        <tr key={delivery.id}>
                                            <td className="offer-cell">
                                                <div className="offer-title">{delivery.title}</div>
                                                <div className="offer-meta">
                                                    <span><Inventory2Icon style={{ fontSize: 12 }} /> {delivery.weight} KG</span>
                                                    <span><AccessTimeIcon style={{ fontSize: 12 }} /> {delivery.pickupTime}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="party-info">
                                                    <strong>{delivery.donor}</strong>
                                                    <small>{delivery.donorAddress}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="party-info">
                                                    <strong>{delivery.receiver}</strong>
                                                    <small>{delivery.receiverAddress}</small>
                                                </div>
                                            </td>
                                            <td className="distance-cell">{delivery.distance} km</td>
                                            <td className="status-cell">
                                                <span className={`status-badge ${statusInfo.class}`}>
                                                    {statusInfo.icon} {statusInfo.text}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                {delivery.status !== 'delivered' ? (
                                                    <button
                                                        className="mark-delivered-btn"
                                                        onClick={() => handleMarkDelivered(delivery.id)}
                                                        disabled={markingId === delivery.id}
                                                    >
                                                        {markingId === delivery.id ? 'Processing...' : 'Mark Delivered'}
                                                    </button>
                                                ) : (
                                                    <div className="completed-badge">
                                                        <CheckCircleIcon style={{ fontSize: 16 }} />
                                                        <span>Complete</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Report Modal */}
                {showReportModal && (
                    <div className="vao-modal-overlay" onClick={handleCloseReport}>
                        <div className="vao-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="vao-modal-header">
                                <h3>Generate Delivery Report</h3>
                                <button className="vao-modal-close" onClick={handleCloseReport}>×</button>
                            </div>
                            <div className="vao-modal-body">
                                <label className="vao-form-label">
                                    Delivery
                                    <select className="vao-form-select">
                                        <option>Select a delivery</option>
                                        {deliveries.filter(d => d.status === 'delivered').map(d => (
                                            <option key={d.id}>{d.title} - {d.donor} to {d.receiver}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="vao-form-label">
                                    Report Type
                                    <select className="vao-form-select">
                                        <option>Delivery Summary</option>
                                        <option>Issue Report</option>
                                        <option>Feedback Report</option>
                                    </select>
                                </label>
                                <label className="vao-form-label">
                                    Additional Notes
                                    <textarea className="vao-form-textarea" rows="4" placeholder="Enter any issues, feedback, or additional information..."></textarea>
                                </label>
                            </div>
                            <div className="vao-modal-footer">
                                <button className="vao-modal-cancel" onClick={handleCloseReport}>Cancel</button>
                                <button className="vao-modal-submit" onClick={handleCloseReport}>Generate Report</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default VolunteerAcceptedOffers;