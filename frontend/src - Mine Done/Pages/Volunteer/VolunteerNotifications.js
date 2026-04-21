// ============================================================
//  FeedHope — Volunteer Notifications Page (Blue Theme - UI Only)
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import '../../Styles/Volunteer/VolunteerDashboard.css';
import '../../Styles/Volunteer/VolunteerNotifications.css';

// MUI Icons
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentIcon from '@mui/icons-material/Assignment';
import StarIcon from '@mui/icons-material/Star';

const VolunteerNotifications = () => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('All');

    // Mock notifications data
    const [notifications, setNotifications] = useState([
        {
            id: 1,
            type: 'delivery',
            message_title: 'New Delivery Assignment',
            message: 'You have been assigned to deliver Fresh Vegetables from GreenGrocer Market to City Food Bank.',
            date: '2026-03-23T10:30:00',
            read_at: null
        },
        {
            id: 2,
            type: 'rating',
            message_title: 'New 5-Star Rating!',
            message: 'City Food Bank gave you a 5-star rating for your delivery of Fresh Vegetables.',
            date: '2026-03-22T15:45:00',
            read_at: null
        },
        {
            id: 3,
            type: 'offer',
            message_title: 'New Available Offer',
            message: 'A new food donation offer (Bread & Pastries) is available in your area.',
            date: '2026-03-22T09:15:00',
            read_at: '2026-03-22T10:00:00'
        },
        {
            id: 4,
            type: 'delivery',
            message_title: 'Delivery Reminder',
            message: 'Your delivery of Soup & Sandwiches is scheduled for today at 2:00 PM.',
            date: '2026-03-21T08:00:00',
            read_at: '2026-03-21T09:30:00'
        },
        {
            id: 5,
            type: 'security',
            message_title: 'Security Alert',
            message: 'Your password was changed successfully. If this wasn\'t you, please contact support.',
            date: '2026-03-20T14:20:00',
            read_at: '2026-03-20T15:00:00'
        },
        {
            id: 6,
            type: 'rating',
            message_title: 'New Feedback Received',
            message: 'Hope Shelter left a comment: "Great delivery, very professional!"',
            date: '2026-03-19T11:00:00',
            read_at: null
        }
    ]);

    // Modal State for Deletion actions
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'Delete',
    });

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

    // Mock action handlers (UI only - no API)
    const handleMarkRead = (notifId) => {
        setNotifications(prev =>
            prev.map(n => n.id === notifId && n.read_at === null
                ? { ...n, read_at: new Date().toISOString() }
                : n
            )
        );
    };

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({
            ...n,
            read_at: n.read_at || new Date().toISOString()
        })));
    };

    const handleDeleteSingle = (notifId) => {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        closeModal();
    };

    const handleDeleteAll = () => {
        setNotifications([]);
        closeModal();
    };

    // Modal triggers
    const triggerDeleteAllModal = () => {
        setModal({
            isOpen: true,
            title: 'Delete All Notifications?',
            message: 'This will permanently remove all notifications. This action cannot be undone.',
            onConfirm: handleDeleteAll,
            confirmText: 'Delete All'
        });
    };

    const triggerDeleteSingleModal = (e, notifId) => {
        e.stopPropagation();
        setModal({
            isOpen: true,
            title: 'Delete Notification',
            message: 'Are you sure you want to delete this message?',
            onConfirm: () => handleDeleteSingle(notifId),
            confirmText: 'Delete'
        });
    };

    // Filtering and sorting
    const sortedAndFiltered = [...notifications]
        .filter(notif => filter === 'Unread' ? notif.read_at === null : true)
        .sort((a, b) => {
            if (a.read_at === null && b.read_at !== null) return -1;
            if (a.read_at !== null && b.read_at === null) return 1;
            return new Date(b.date) - new Date(a.date);
        });

    const unreadCount = notifications.filter(n => n.read_at === null).length;

    const grouped = sortedAndFiltered.reduce((groups, notif) => {
        const type = notif.type;
        if (!groups[type]) groups[type] = [];
        groups[type].push(notif);
        return groups;
    }, {});

    const getCategoryIcon = (type) => {
        switch (type) {
            case 'delivery': return <LocalShippingIcon />;
            case 'rating': return <StarIcon />;
            case 'offer': return <AssignmentIcon />;
            case 'security': return <SecurityIcon />;
            default: return <NotificationsIcon />;
        }
    };

    const getCategoryTitle = (type) => {
        switch (type) {
            case 'delivery': return 'Deliveries';
            case 'rating': return 'Ratings & Feedback';
            case 'offer': return 'Available Offers';
            case 'security': return 'Security';
            default: return type.replace('_', ' ').toUpperCase();
        }
    };

    return (
        <div className="vn-layout">
            <VolunteerSidebar user={{ name: 'John Smith' }} onLogout={handleLogout} activePage="notifications" />

            <main className="vn-main">
                {/* Custom Modal for Deletion Confirmation */}
                {modal.isOpen && (
                    <div className="vn-modal-overlay" onClick={closeModal}>
                        <div className="vn-delete-form" onClick={(e) => e.stopPropagation()}>
                            <h3>{modal.title}</h3>
                            <p>{modal.message}</p>
                            <div className="vn-form-actions">
                                <button className="vn-cancel-btn" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button className="vn-confirm-btn" onClick={modal.onConfirm}>
                                    {modal.confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Blue Banner Header */}
                <div className="vn-banner">
                    <div className="vn-banner-text">
                        <h1 className="vn-banner-title">Notifications</h1>
                        <p className="vn-banner-subtitle">You have {unreadCount} new update{unreadCount !== 1 ? 's' : ''}.</p>
                    </div>
                    <div className="vn-banner-icon">
                        <NotificationsIcon />
                    </div>
                </div>

                {/* Action Bar */}
                <div className="vn-action-bar">
                    <div className="vn-filter-buttons">
                        <button
                            className={`vn-filter-btn ${filter === 'All' ? 'active' : ''}`}
                            onClick={() => setFilter('All')}
                        >
                            All
                        </button>
                        <button
                            className={`vn-filter-btn ${filter === 'Unread' ? 'active' : ''}`}
                            onClick={() => setFilter('Unread')}
                        >
                            Unread {unreadCount > 0 && `(${unreadCount})`}
                        </button>
                    </div>

                    <div className="vn-bulk-actions">
                        <button className="vn-mark-all-btn" onClick={handleMarkAllRead}>
                            <DoneAllIcon fontSize="small" /> Mark All Read
                        </button>
                        <button className="vn-delete-all-btn" onClick={triggerDeleteAllModal}>
                            <DeleteSweepIcon fontSize="small" /> Delete All
                        </button>
                    </div>
                </div>

                {/* Notifications List */}
                {notifications.length === 0 ? (
                    <div className="vn-empty">
                        <NotificationsIcon className="vn-empty-icon" />
                        <p>No notifications yet</p>
                        <span>When you receive notifications, they'll appear here</span>
                    </div>
                ) : Object.entries(grouped).length === 0 ? (
                    <div className="vn-empty">
                        <NotificationsIcon className="vn-empty-icon" />
                        <p>No {filter.toLowerCase()} notifications found</p>
                        <button onClick={() => setFilter('All')} className="vn-clear-filter-btn">
                            Show all notifications
                        </button>
                    </div>
                ) : (
                    <div className="vn-notifications-container">
                        {Object.entries(grouped).map(([type, items]) => (
                            <div key={type} className="vn-category-section">
                                <div className="vn-category-header">
                                    <div className="vn-category-icon">{getCategoryIcon(type)}</div>
                                    <h3 className="vn-category-title">{getCategoryTitle(type)}</h3>
                                </div>
                                <div className="vn-category-items">
                                    {items.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`vn-notification-item ${notif.read_at === null ? 'unread' : ''}`}
                                            onClick={() => handleMarkRead(notif.id)}
                                        >
                                            <div className="vn-notification-content">
                                                <div className="vn-notification-title">{notif.message_title}</div>
                                                <div className="vn-notification-description">{notif.message}</div>
                                                <div className="vn-notification-date">
                                                    {new Date(notif.date).toLocaleString()}
                                                </div>
                                            </div>

                                            <div className="vn-actions-container">
                                                {notif.read_at === null && <div className="vn-unread-dot"></div>}
                                                <button
                                                    className="vn-single-delete-btn"
                                                    onClick={(e) => triggerDeleteSingleModal(e, notif.id)}
                                                    title="Delete notification"
                                                >
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default VolunteerNotifications;