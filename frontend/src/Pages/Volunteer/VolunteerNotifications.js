// ============================================================
//  FeedHope — Volunteer Notifications Page
//  Receives notifications inserted by ANY action across the
//  app (deliveries, ratings received, profile changes, etc.).
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import DashboardChatbot from '../../Components/Shared/DashboardChatbot';
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
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const API_BASE = 'http://localhost:5000';

const VolunteerNotifications = () => {
    const navigate = useNavigate();

    const [user] = useState(() => {
        const raw = localStorage.getItem('feedhope_user');
        return raw ? JSON.parse(raw) : null;
    });

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [filter, setFilter] = useState('All');

    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'Delete',
    });

    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

    const fetchNotifications = useCallback(async () => {
        if (!user?.user_id) return;
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/api/volunteer/notifications/all/${user.user_id}`);
            setNotifications(res.data || []);
        } catch (err) {
            console.error('Failed to load notifications:', err);
            setErrorMessage(err.response?.data?.error || 'Failed to load notifications.');
        } finally {
            setLoading(false);
        }
    }, [user?.user_id]);

    useEffect(() => {
        if (!user) {
            navigate('/signin');
            return;
        }
        fetchNotifications();
    }, [fetchNotifications, navigate, user]);

    // Silent polling + cross-event refresh: keeps the list in lockstep with the
    // sidebar badge so the user never sees a stale count or missing item.
    useEffect(() => {
        if (!user?.user_id) return;
        const silentRefresh = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/volunteer/notifications/all/${user.user_id}`);
                setNotifications(res.data || []);
            } catch {}
        };
        const interval = setInterval(silentRefresh, 3000);
        window.addEventListener('notifUpdated', silentRefresh);
        window.addEventListener('notification-read', silentRefresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener('notifUpdated', silentRefresh);
            window.removeEventListener('notification-read', silentRefresh);
        };
    }, [user?.user_id]);

    const broadcastBadgeUpdate = () => {
        // Sidebar listens for this and refreshes its unread badge
        window.dispatchEvent(new Event('notifUpdated'));
    };

    const handleMarkRead = async (notif) => {
        if (notif.read_at) return; // already read
        // Optimistic UI
        setNotifications(prev =>
            prev.map(n => n.notification_id === notif.notification_id
                ? { ...n, read_at: new Date().toISOString() }
                : n)
        );
        try {
            await axios.post(`${API_BASE}/api/volunteer/notifications/mark-read/${notif.notification_id}`);
            broadcastBadgeUpdate();
        } catch (err) {
            console.error('Mark read failed:', err);
            // Revert
            setNotifications(prev =>
                prev.map(n => n.notification_id === notif.notification_id
                    ? { ...n, read_at: null }
                    : n)
            );
        }
    };

    const handleMarkAllRead = async () => {
        if (!user?.user_id) return;
        try {
            await axios.post(`${API_BASE}/api/volunteer/notifications/mark-all-read/${user.user_id}`);
            await fetchNotifications();
            broadcastBadgeUpdate();
        } catch (err) {
            console.error('Mark all read failed:', err);
            setErrorMessage(err.response?.data?.error || 'Failed to mark all as read.');
        }
    };

    const handleDeleteSingle = async (notifId) => {
        if (!user?.user_id) return;
        try {
            await axios.delete(`${API_BASE}/api/volunteer/notifications/${notifId}`, {
                data: { userId: user.user_id }
            });
            setNotifications(prev => prev.filter(n => n.notification_id !== notifId));
            broadcastBadgeUpdate();
        } catch (err) {
            console.error('Delete notification failed:', err);
            setErrorMessage(err.response?.data?.error || 'Failed to delete notification.');
        } finally {
            closeModal();
        }
    };

    const handleDeleteAll = async () => {
        if (!user?.user_id) return;
        try {
            await axios.delete(`${API_BASE}/api/volunteer/notifications/delete-all/${user.user_id}`);
            setNotifications([]);
            broadcastBadgeUpdate();
        } catch (err) {
            console.error('Delete all notifications failed:', err);
            setErrorMessage(err.response?.data?.error || 'Failed to clear notifications.');
        } finally {
            closeModal();
        }
    };

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

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        localStorage.removeItem('volunteer_user');
        navigate('/signin');
    };

    // Sorting + filtering
    const sortedAndFiltered = [...notifications]
        .filter(notif => filter === 'Unread' ? notif.read_at === null : true)
        .sort((a, b) => {
            if (a.read_at === null && b.read_at !== null) return -1;
            if (a.read_at !== null && b.read_at === null) return 1;
            return new Date(b.date) - new Date(a.date);
        });

    const unreadCount = notifications.filter(n => n.read_at === null).length;

    // Group notifications by category derived from the `type` field
    const categorize = (type) => {
        if (!type) return 'general';
        const t = type.toLowerCase();
        if (t.includes('delivery') || t.includes('volunteer_assigned')) return 'delivery';
        if (t.includes('feedback') || t.includes('rating')) return 'rating';
        if (t.includes('offer')) return 'offer';
        if (t.includes('security') || t.includes('password')) return 'security';
        if (t.includes('profile')) return 'profile';
        return 'general';
    };

    const grouped = sortedAndFiltered.reduce((groups, notif) => {
        const cat = categorize(notif.type);
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(notif);
        return groups;
    }, {});

    const getCategoryIcon = (cat) => {
        switch (cat) {
            case 'delivery': return <LocalShippingIcon />;
            case 'rating':   return <StarIcon />;
            case 'offer':    return <AssignmentIcon />;
            case 'security': return <SecurityIcon />;
            case 'profile':  return <PersonIcon />;
            default:         return <NotificationsIcon />;
        }
    };

    const getCategoryTitle = (cat) => {
        switch (cat) {
            case 'delivery': return 'Deliveries';
            case 'rating':   return 'Ratings & Feedback';
            case 'offer':    return 'Available Offers';
            case 'security': return 'Security';
            case 'profile':  return 'Profile';
            default:         return 'General';
        }
    };

    return (
        <div className="vn-layout">
            <VolunteerSidebar user={user} onLogout={handleLogout} activePage="notifications" />

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

                {/* Banner */}
                <div className="vn-banner">
                    <div className="vn-banner-text">
                        <h1 className="vn-banner-title">Notifications</h1>
                        <p className="vn-banner-subtitle">
                            You have {unreadCount} new update{unreadCount !== 1 ? 's' : ''}.
                        </p>
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
                        <button
                            className="vn-mark-all-btn"
                            onClick={handleMarkAllRead}
                            disabled={unreadCount === 0}
                            title={unreadCount === 0 ? 'No unread notifications' : 'Mark every notification as read'}
                        >
                            <DoneAllIcon fontSize="small" /> Mark All Read
                        </button>
                        <button
                            className="vn-delete-all-btn"
                            onClick={triggerDeleteAllModal}
                            disabled={notifications.length === 0}
                            title={notifications.length === 0 ? 'No notifications to delete' : 'Delete every notification'}
                        >
                            <DeleteSweepIcon fontSize="small" /> Delete All
                        </button>
                    </div>
                </div>

                {/* Error */}
                {errorMessage && (
                    <div className="vn-empty">
                        <p style={{ color: '#991b1b' }}>{errorMessage}</p>
                        <button onClick={fetchNotifications} className="vn-clear-filter-btn">
                            Retry
                        </button>
                    </div>
                )}

                {/* Notifications List */}
                {loading ? (
                    <div className="vn-empty">
                        <p>Loading notifications…</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="vn-empty">
                        <NotificationsIcon className="vn-empty-icon" />
                        <p>No notifications yet</p>
                        <span>When you receive notifications, they'll appear here</span>
                    </div>
                ) : Object.entries(grouped).length === 0 ? (
                    <div className="vn-empty">
                        <CheckCircleIcon className="vn-empty-icon" />
                        <p>No {filter.toLowerCase()} notifications</p>
                        <button onClick={() => setFilter('All')} className="vn-clear-filter-btn">
                            Show all notifications
                        </button>
                    </div>
                ) : (
                    <div className="vn-notifications-container">
                        {Object.entries(grouped).map(([cat, items]) => (
                            <div key={cat} className="vn-category-section">
                                <div className="vn-category-header">
                                    <div className="vn-category-icon">{getCategoryIcon(cat)}</div>
                                    <h3 className="vn-category-title">{getCategoryTitle(cat)}</h3>
                                </div>
                                <div className="vn-category-items">
                                    {items.map((notif) => (
                                        <div
                                            key={notif.notification_id}
                                            className={`vn-notification-item ${notif.read_at === null ? 'unread' : ''}`}
                                            onClick={() => handleMarkRead(notif)}
                                        >
                                            <div className="vn-notification-content">
                                                <div className="vn-notification-title">{notif.message_title}</div>
                                                <div className="vn-notification-description">{notif.message}</div>
                                                <div className="vn-notification-date">
                                                    {notif.date ? new Date(notif.date).toLocaleString() : '—'}
                                                </div>
                                            </div>

                                            <div className="vn-actions-container">
                                                {notif.read_at === null && <div className="vn-unread-dot"></div>}
                                                <button
                                                    className="vn-single-delete-btn"
                                                    onClick={(e) => triggerDeleteSingleModal(e, notif.notification_id)}
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
        <DashboardChatbot role="Volunteer" />
            </div>
    );
};

export default VolunteerNotifications;
