// ==============================================================
//  FeedHope — Omar & Hanan — Pages/Receiver/ReceiverNotifications.js
//  Notifications page with filter and mark-all-read functionality
// ==============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';
import '../../Styles/Receiver/ReceiverDashboard.css';
import '../../Styles/Receiver/ReceiverNotifications.css';

// MUI Icons
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';

// Helper: format relative time
const formatNotificationDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
};

// Map notification type to an icon
const getNotificationIcon = (type) => {
    switch (type) {
        case 'offer_accepted': return <RestaurantMenuIcon fontSize="small" />;
        case 'delivery_update': return <LocalShippingIcon fontSize="small" />;
        case 'cancellation': return <CancelIcon fontSize="small" />;
        default: return <InfoIcon fontSize="small" />;
    }
};

const ReceiverNotifications = () => {
    const navigate = useNavigate();
    const [user] = useState(() => {
        const stored = localStorage.getItem('feedhope_user');
        return stored ? JSON.parse(stored) : null;
    });
    const userId = user?.user_id;
    const firstName = user?.name?.split(' ')[0] || 'Receiver';

    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all'); // 'all' or 'unread'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch notifications based on current filter
    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const url = `http://localhost:5000/api/receiver/notifications/${userId}?status=${filter}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch notifications');
            const data = await res.json();
            setNotifications(data);
            
            // Also fetch the unread count for the sidebar badge
            const unreadRes = await fetch(`http://localhost:5000/api/receiver/notifications/${userId}?status=unread`);
            const unreadData = await unreadRes.json();
            setUnreadCount(unreadData.length);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, filter]);

    useEffect(() => {
        if (!userId) {
            navigate('/signin');
            return;
        }
        fetchNotifications();
    }, [userId, navigate, fetchNotifications]);

    // Mark a single notification as read (optimistic update)
    const markAsRead = async (notificationId) => {
        try {
            await fetch(`http://localhost:5000/api/receiver/notifications/${notificationId}/read`, {
                method: 'PATCH'
            });
            // Update local state
            setNotifications(prev =>
                prev.map(n =>
                    n.notification_id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Mark as read error:", err);
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        if (markingAll) return;
        setMarkingAll(true);
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/notifications/mark-all-read/${userId}`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to mark all as read');
            // Refresh notifications (re-fetch with current filter)
            await fetchNotifications();
        } catch (err) {
            alert(err.message);
        } finally {
            setMarkingAll(false);
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

    const displayedNotifications = notifications;
    const hasUnread = displayedNotifications.some(n => !n.read_at);

    if (loading && notifications.length === 0) {
        return (
            <div className="rdb-layout">
                <ReceiverSidebar onLogout={handleLogout} unreadCount={unreadCount} activePage="notifications" />
                <main className="rdb-main">
                    <div className="rdb-loading-screen">
                        <div className="rdb-spinner" />
                        <p>Loading notifications…</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rdb-layout">
                <ReceiverSidebar onLogout={handleLogout} unreadCount={unreadCount} activePage="notifications" />
                <main className="rdb-main">
                    <div className="rdb-error-screen">
                        <p className="rdb-error-msg">{error}</p>
                        <button className="rdb-retry-btn" onClick={fetchNotifications}>Retry</button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="rdb-layout">
            <ReceiverSidebar onLogout={handleLogout} unreadCount={unreadCount} activePage="notifications" />

            <main className="rdb-main">
                {/* Banner */}
                <div className="rdb-banner rn-banner">
                    <div className="rdb-banner-text">
                        <p className="rdb-banner-greeting">Welcome back, {firstName}</p>
                        <h1 className="rdb-banner-title">Notifications</h1>
                        <p className="rdb-banner-subtitle">Stay updated on available food and deliveries</p>
                        <div className="rn-date-badge">{formattedDate}</div>
                    </div>
                    <div className="rdb-banner-icon">
                        <NotificationsIcon sx={{ fontSize: 48, color: '#fff' }} />
                    </div>
                    <div className="rn-banner-stat">
                        <span className="rn-banner-stat-num">{unreadCount}</span>
                        <span className="rn-banner-stat-label">Unread</span>
                    </div>
                </div>

                {/* Filter and Action Bar */}
                <div className="rn-filter-bar">
                    <div className="rn-filter-buttons">
                        <button
                            className={`rn-filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All Notifications
                        </button>
                        <button
                            className={`rn-filter-btn ${filter === 'unread' ? 'active' : ''}`}
                            onClick={() => setFilter('unread')}
                        >
                            Unread Notifications
                        </button>
                    </div>
                    <button
                        className="rn-mark-all-btn"
                        onClick={markAllAsRead}
                        disabled={markingAll || !hasUnread}
                    >
                        <DoneAllIcon fontSize="small" />
                        {markingAll ? 'Marking…' : 'Mark All Read'}
                    </button>
                </div>

                {/* Notifications List */}
                <div className="rn-list-container">
                    {displayedNotifications.length === 0 ? (
                        <div className="rn-empty-state">
                            <NotificationsIcon sx={{ fontSize: 48, color: '#ccc' }} />
                            <p>No {filter === 'unread' ? 'unread ' : ''}notifications.</p>
                        </div>
                    ) : (
                        displayedNotifications.map(notif => (
                            <div
                                key={notif.notification_id}
                                className={`rn-notification-item ${!notif.read_at ? 'rn-notification-item--unread' : ''}`}
                                onClick={() => !notif.read_at && markAsRead(notif.notification_id)}
                            >
                                <div className="rn-notification-icon">
                                    {getNotificationIcon(notif.type)}
                                </div>
                                <div className="rn-notification-content">
                                    <div className="rn-notification-header">
                                        <span className="rn-notification-title">{notif.title}</span>
                                        <span className="rn-notification-time">
                                            {formatNotificationDate(notif.date)}
                                        </span>
                                    </div>
                                    <p className="rn-notification-message">{notif.message}</p>
                                </div>
                                {!notif.read_at && <div className="rn-unread-dot" />}
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReceiverNotifications;