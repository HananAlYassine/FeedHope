// ==============================================================
//  FeedHope — Omar & Hanan — Pages/Receiver/ReceiverNotifications.js
// ==============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';
import '../../Styles/Receiver/ReceiverDashboard.css';
import '../../Styles/Receiver/ReceiverNotifications.css';

import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';

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

const getNotificationIcon = (type) => {
    switch (type) {
        case 'offer_accepted': return <RestaurantMenuIcon fontSize="small" />;
        case 'delivery_update': return <LocalShippingIcon fontSize="small" />;
        case 'cancellation': return <CancelIcon fontSize="small" />;
        default: return <InfoIcon fontSize="small" />;
    }
};

// Clean white confirmation modal (no slide from top)
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                </div>
                <div className="modal-content">
                    <p>{message}</p>
                </div>
                <div className="modal-actions">
                    <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="modal-btn modal-btn-confirm" onClick={onConfirm}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReceiverNotifications = () => {
    const navigate = useNavigate();
    const [user] = useState(() => {
        const stored = localStorage.getItem('feedhope_user');
        return stored ? JSON.parse(stored) : null;
    });
    const userId = user?.user_id;
    const organizationName = user?.name || 'Receiver';

    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [totalNotificationsCount, setTotalNotificationsCount] = useState(0); // NEW: total count for delete all button
    
    // Modal state
    const [modalState, setModalState] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null
    });

    // Fetch total count of all notifications (for enabling/disabling Delete All)
    const fetchTotalCount = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/notifications/${userId}?status=all`);
            if (!res.ok) throw new Error('Failed to fetch total count');
            const data = await res.json();
            setTotalNotificationsCount(data.length);
        } catch (err) {
            console.error("Error fetching total count:", err);
        }
    }, [userId]);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const url = `http://localhost:5000/api/receiver/notifications/${userId}?status=${filter}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch notifications');
            const data = await res.json();
            setNotifications(data);
            
            const unreadRes = await fetch(`http://localhost:5000/api/receiver/notifications/${userId}?status=unread`);
            const unreadData = await unreadRes.json();
            setUnreadCount(unreadData.length);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, filter]);

    // Refresh total count after any deletion
    const refreshTotalCount = useCallback(() => {
        fetchTotalCount();
    }, [fetchTotalCount]);

    useEffect(() => {
        if (!userId) {
            navigate('/signin');
            return;
        }
        fetchNotifications();
        fetchTotalCount(); // get initial total count
    }, [userId, navigate, fetchNotifications, fetchTotalCount]);

    // Mark single as read
    const markAsRead = async (notificationId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (!res.ok) throw new Error('Failed to mark as read');
            setNotifications(prev =>
                prev.map(n =>
                    n.notification_id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            window.dispatchEvent(new Event('notification-read'));
        } catch (err) {
            console.error("Mark as read error:", err);
            alert(err.message);
        }
    };

    // Delete single notification
    const deleteSingleNotification = async (notificationId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (!res.ok) throw new Error('Failed to delete notification');
            await fetchNotifications();
            refreshTotalCount(); // update total count after deletion
            window.dispatchEvent(new Event('notification-read'));
        } catch (err) {
            alert(err.message);
        }
    };

    // Delete all notifications
    const deleteAllNotifications = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/notifications/clear/${userId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete notifications');
            await fetchNotifications();
            refreshTotalCount(); // update total count after deletion
            window.dispatchEvent(new Event('notification-read'));
        } catch (err) {
            alert(err.message);
        }
    };

    // Open confirmation modal for single delete
    const openDeleteSingleModal = (notificationId) => {
        setModalState({
            open: true,
            title: 'Delete Notification',
            message: 'Are you sure you want to delete this notification? This action cannot be undone.',
            onConfirm: async () => {
                await deleteSingleNotification(notificationId);
                closeModal();
            }
        });
    };

    // Open confirmation modal for delete all
    const openDeleteAllModal = () => {
        setModalState({
            open: true,
            title: 'Delete All Notifications',
            message: 'Are you sure you want to delete all notifications? This action cannot be undone.',
            onConfirm: async () => {
                await deleteAllNotifications();
                closeModal();
            }
        });
    };

    const closeModal = () => {
        setModalState({
            open: false,
            title: '',
            message: '',
            onConfirm: null
        });
    };

    const markAllAsRead = async () => {
        if (markingAll) return;
        setMarkingAll(true);
        try {
            const res = await fetch(`http://localhost:5000/api/receiver/notifications/mark-all-read/${userId}`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to mark all as read');
            await fetchNotifications();
            window.dispatchEvent(new Event('notification-read'));
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
                <ReceiverSidebar onLogout={handleLogout} activePage="notifications" />
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
                <ReceiverSidebar onLogout={handleLogout} activePage="notifications" />
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
            <ReceiverSidebar onLogout={handleLogout} activePage="notifications" />

            <main className="rdb-main">
                <div className="rdb-banner rn-banner">
                    <div className="rdb-banner-text">
                        <p className="rdb-banner-greeting">Welcome back, {organizationName}</p>
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
                    
                    <div className="rn-action-buttons">
                        <button
                            className="rn-mark-all-btn"
                            onClick={markAllAsRead}
                            disabled={markingAll || !hasUnread}
                        >
                            <DoneAllIcon fontSize="small" />
                            {markingAll ? 'Marking…' : 'Mark All Read'}
                        </button>
                        <button
                            className="rn-delete-all-btn"
                            onClick={openDeleteAllModal}
                            disabled={totalNotificationsCount === 0}   // Disabled when no notifications exist
                        >
                            🗑️ Delete All
                        </button>
                    </div>
                </div>

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
                                    </div>
                                    <p className="rn-notification-message">{notif.message}</p>
                                </div>
                                <div className="rn-notification-actions">
                                    <span className="rn-notification-time">
                                        {formatNotificationDate(notif.date)}
                                    </span>
                                    <button
                                        className="rn-delete-single-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openDeleteSingleModal(notif.notification_id);
                                        }}
                                        aria-label="Delete notification"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </button>
                                    {!notif.read_at && <div className="rn-unread-dot" />}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Clean White Confirmation Modal */}
            <ConfirmationModal
                isOpen={modalState.open}
                title={modalState.title}
                message={modalState.message}
                onConfirm={modalState.onConfirm}
                onCancel={closeModal}
            />
        </div>
    );
};

export default ReceiverNotifications;