// DonorNotifications.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorNotifications.css';

// MUI Icons
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkunreadIcon from '@mui/icons-material/Markunread';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import RestaurantIcon from '@mui/icons-material/Restaurant';

const DonorNotifications = () => {
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('All'); // 'All' or 'Unread'
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Load user
    useEffect(() => {
        const storedUser = localStorage.getItem('feedhope_user');
        if (!storedUser) {
            navigate('/signin');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    // Fetch notifications (mock data matching image)
    useEffect(() => {
        if (!user) return;

        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const mockNotifications = [
                    {
                        id: 1,
                        category: 'Donations',
                        title: 'Offer Accepted!',
                        description: "Your offer 'Soup & Sandwiches' has been accepted by Hope Community Shelter.",
                        date: '2024-03-14',
                        isRead: false,
                    },
                    {
                        id: 2,
                        category: 'Donations',
                        title: 'Offer Delivered',
                        description: "Your donation 'Rice & Curry Dishes' was successfully delivered. Thank you for your generosity!",
                        date: '2024-03-13',
                        isRead: false,
                    },
                    {
                        id: 3,
                        category: 'Finance',
                        title: 'Money Donation Confirmed',
                        description: 'Your monetary donation of $150.00 has been received and added to the fund. Thank you!',
                        date: '2024-03-14',
                        isRead: false,
                    },
                    {
                        id: 4,
                        category: 'Tracking',
                        title: 'Funds Distributed',
                        description: 'Your donation funds have been distributed to Hope Community Shelter for food supplies.',
                        date: '2024-03-14',
                        isRead: false,
                    },
                    {
                        id: 5,
                        category: 'Deliveries',
                        title: 'Offer In Transit',
                        description: "Your offer 'Cakes & Desserts' is being delivered by volunteer John Smith.",
                        date: '2024-03-14',
                        isRead: false,
                    },
                    {
                        id: 6,
                        category: 'Donations',
                        title: 'Offer Expired',
                        description: "Your offer 'Sandwich Bread Loaves' has expired without being claimed.",
                        date: '2024-03-12',
                        isRead: true,
                    },
                ];
                setNotifications(mockNotifications);
            } catch (err) {
                console.error('Failed to load notifications:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [user]);

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    const markAllAsRead = () => {
        setNotifications(prev =>
            prev.map(notif => ({ ...notif, isRead: true }))
        );
    };

    const markAsRead = (id) => {
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === id ? { ...notif, isRead: true } : notif
            )
        );
    };

    const filteredNotifications = notifications.filter(notif => {
        if (filter === 'Unread') return !notif.isRead;
        return true;
    });

    // Group notifications by category
    const grouped = filteredNotifications.reduce((groups, notif) => {
        const cat = notif.category;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(notif);
        return groups;
    }, {});

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Donations': return <RestaurantIcon />;
            case 'Finance': return <AttachMoneyIcon />;
            case 'Tracking': return <CheckCircleIcon />;
            case 'Deliveries': return <LocalShippingIcon />;
            default: return <NotificationsIcon />;
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} />

            <main className="ddb-main">
                {/* Banner */}
                <div className="ddb-banner dn-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor</p>
                        <h1 className="ddb-banner-title">Notifications</h1>
                        <p className="ddb-banner-subtitle">Stay updated on your donations and deliveries</p>
                    </div>
                    <div className="ddb-banner-icon">
                        <NotificationsIcon sx={{ fontSize: 48 }} />
                    </div>
                </div>

                {/* Action Bar */}
                <div className="dn-action-bar">
                    <div className="dn-filter-buttons">
                        <button
                            className={`dn-filter-btn ${filter === 'All' ? 'active' : ''}`}
                            onClick={() => setFilter('All')}
                        >
                            All
                        </button>
                        <button
                            className={`dn-filter-btn ${filter === 'Unread' ? 'active' : ''}`}
                            onClick={() => setFilter('Unread')}
                        >
                            Unread {unreadCount > 0 && `(${unreadCount})`}
                        </button>
                    </div>
                    <button className="dn-mark-all-btn" onClick={markAllAsRead}>
                        <DoneAllIcon fontSize="small" />
                        Mark All Read
                    </button>
                </div>

                {/* Notifications List */}
                {loading ? (
                    <div className="dn-loading">Loading notifications...</div>
                ) : Object.keys(grouped).length === 0 ? (
                    <div className="dn-empty">
                        <p>No notifications found.</p>
                        <p className="dn-empty-sub">When you have updates, they'll appear here.</p>
                    </div>
                ) : (
                    <div className="dn-notifications-container">
                        {Object.entries(grouped).map(([category, items]) => (
                            <div key={category} className="dn-category-section">
                                <div className="dn-category-header">
                                    <div className="dn-category-icon">{getCategoryIcon(category)}</div>
                                    <h3 className="dn-category-title">{category}</h3>
                                </div>
                                <div className="dn-category-items">
                                    {items.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`dn-notification-item ${!notif.isRead ? 'unread' : ''}`}
                                            onClick={() => markAsRead(notif.id)}
                                        >
                                            <div className="dn-notification-content">
                                                <div className="dn-notification-title">{notif.title}</div>
                                                <div className="dn-notification-description">{notif.description}</div>
                                                <div className="dn-notification-date">{formatDate(notif.date)}</div>
                                            </div>
                                            {!notif.isRead && <div className="dn-unread-dot"></div>}
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