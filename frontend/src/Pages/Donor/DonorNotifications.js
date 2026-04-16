import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorNotifications.css';

// MUI Icons
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import SecurityIcon from '@mui/icons-material/Security';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const DonorNotifications = () => {
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('All');
    const [loading, setLoading] = useState(true);

    // Modal State specifically for Deletion actions
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'Delete',
    });

    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('feedhope_user'));
        if (!storedUser) {
            navigate('/signin');
        } else {
            setUser(storedUser);
        }
    }, [navigate]);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await axios.get(`http://localhost:5000/api/donor/notifications/all/${user.user_id}`);
            setNotifications(res.data);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const triggerSidebarUpdate = () => {
        window.dispatchEvent(new Event('notifUpdated'));
    };

    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

    // --- Core Action Logic ---

    const executeMarkRead = async (notif) => {
        if (notif.read_at !== null) return;
        try {
            await axios.post(`http://localhost:5000/api/donor/notifications/mark-read/${notif.notification_id}`);
            setNotifications(prev =>
                prev.map(n => n.notification_id === notif.notification_id
                    ? { ...n, read_at: new Date().toISOString() }
                    : n
                )
            );
            triggerSidebarUpdate();
        } catch (err) {
            console.error("Mark read failed:", err);
        }
    };

    // Mark All Read - Form removed, executes immediately
    const executeMarkAllRead = async () => {
        if (!user) return;
        try {
            await axios.post(`http://localhost:5000/api/donor/notifications/mark-all-read/${user.user_id}`);
            setNotifications(prev => prev.map(n => ({
                ...n,
                read_at: n.read_at || new Date().toISOString()
            })));
            triggerSidebarUpdate();
        } catch (err) {
            console.error("Mark all read failed:", err);
        }
    };

    const executeDeleteAll = async () => {
        try {
            await axios.delete(`http://localhost:5000/api/donor/notifications/delete-all/${user.user_id}`);
            setNotifications([]);
            triggerSidebarUpdate();
            closeModal();
        } catch (err) {
            console.error("Delete all failed:", err);
        }
    };

    const executeDeleteSingle = async (notifId) => {
        try {
            await axios.delete(`http://localhost:5000/api/donor/notifications/${notifId}`, {
                data: { userId: user.user_id }
            });
            setNotifications(prev => prev.filter(n => n.notification_id !== notifId));
            triggerSidebarUpdate();
            closeModal();
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    // --- Modal Triggers (Deletion Only) ---

    const triggerDeleteAllModal = () => {
        setModal({
            isOpen: true,
            title: 'Delete All Notifications?',
            message: 'This will permanently remove all notifications. This action cannot be undone.',
            onConfirm: executeDeleteAll,
            confirmText: 'Delete All'
        });
    };

    const triggerDeleteSingleModal = (e, notifId) => {
        e.stopPropagation();
        setModal({
            isOpen: true,
            title: 'Delete Notification',
            message: 'Are you sure you want to delete this message?',
            onConfirm: () => executeDeleteSingle(notifId),
            confirmText: 'Delete'
        });
    };

    // --- Sorting and Filtering ---

    const sortedAndFiltered = [...notifications]
        .filter(notif => filter === 'Unread' ? notif.read_at === null : true)
        .sort((a, b) => {
            if (a.read_at === null && b.read_at !== null) return -1;
            if (a.read_at !== null && b.read_at === null) return 1;
            return new Date(b.date) - new Date(a.date);
        });

    const unreadCount = notifications.filter(n => n.read_at === null).length;

    const grouped = sortedAndFiltered.reduce((groups, notif) => {
        const type = notif.type || 'system';
        if (!groups[type]) groups[type] = [];
        groups[type].push(notif);
        return groups;
    }, {});

    const getCategoryIcon = (type) => {
        switch (type) {
            case 'profile_update': return <RestaurantIcon />;
            case 'security': return <SecurityIcon />;
            case 'deletion': return <DeleteSweepIcon />;
            default: return <NotificationsIcon />;
        }
    };

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={() => navigate('/signin')} />

            <main className="ddb-main">
                {/* Custom Modal for Deletion Confirmation */}
                {modal.isOpen && (
                    <div className="dn-modal-overlay" onClick={closeModal}>
                        <div className="dn-delete-form" onClick={(e) => e.stopPropagation()}>
                            <h3>{modal.title}</h3>
                            <p>{modal.message}</p>
                            <div className="dn-form-actions">
                                <button className="dn-cancel-btn" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button className="dn-confirm-btn" onClick={modal.onConfirm}>
                                    {modal.confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="ddb-banner dn-banner">
                    <div className="ddb-banner-text">
                        <h1 className="ddb-banner-title">Notifications</h1>
                        <p className="ddb-banner-subtitle">You have {unreadCount} new updates.</p>
                    </div>
                </div>

                <div className="dn-action-bar">
                    <div className="dn-filter-buttons">
                        <button className={`dn-filter-btn ${filter === 'All' ? 'active' : ''}`} onClick={() => setFilter('All')}>All</button>
                        <button className={`dn-filter-btn ${filter === 'Unread' ? 'active' : ''}`} onClick={() => setFilter('Unread')}>
                            Unread {unreadCount > 0 && `(${unreadCount})`}
                        </button>
                    </div>

                    <div className="dn-bulk-actions">
                        <button className="dn-mark-all-btn" onClick={executeMarkAllRead}>
                            <DoneAllIcon fontSize="small" /> Mark All Read
                        </button>
                        <button className="dn-delete-all-btn" onClick={triggerDeleteAllModal}>
                            <DeleteSweepIcon fontSize="small" /> Delete All
                        </button>
                    </div>
                </div>

                {loading ? <div className="dn-loading">Loading...</div> : (
                    <div className="dn-notifications-container">
                        {Object.entries(grouped).map(([type, items]) => (
                            <div key={type} className="dn-category-section">
                                <div className="dn-category-header">
                                    <div className="dn-category-icon">{getCategoryIcon(type)}</div>
                                    <h3 className="dn-category-title">{type.replace('_', ' ').toUpperCase()}</h3>
                                </div>
                                <div className="dn-category-items">
                                    {items.map((notif) => (
                                        <div
                                            key={notif.notification_id}
                                            className={`dn-notification-item ${notif.read_at === null ? 'unread' : ''}`}
                                            onClick={() => executeMarkRead(notif)}
                                        >
                                            <div className="dn-notification-content">
                                                <div className="dn-notification-title">{notif.message_title}</div>
                                                <div className="dn-notification-description">{notif.message}</div>
                                                <div className="dn-notification-date">
                                                    {new Date(notif.date).toLocaleString()}
                                                </div>
                                            </div>

                                            <div className="dn-actions-container">
                                                {notif.read_at === null && <div className="dn-unread-dot"></div>}
                                                <button
                                                    className="dn-single-delete-btn"
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
        </div>
    );
};

export default DonorNotifications;