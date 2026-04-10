// ============================================================
//  FeedHope — Components/Receiver/ReceiverSidebar.js
//  Now self‑fetches the unread notification count.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Styles/Receiver/ReceiverSidebar.css';

// MUI Icons
import DashboardIcon       from '@mui/icons-material/Dashboard';
import PersonIcon          from '@mui/icons-material/Person';
import SearchIcon          from '@mui/icons-material/Search';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import HistoryIcon         from '@mui/icons-material/History';
import NotificationsIcon   from '@mui/icons-material/Notifications';
import SwapHorizIcon       from '@mui/icons-material/SwapHoriz';
import LogoutIcon          from '@mui/icons-material/Logout';

const NAV_ITEMS = [
    { section: 'OVERVIEW', key: 'dashboard',    label: 'Dashboard',      Icon: DashboardIcon,     path: '/receiver-dashboard'      },
    { section: 'OVERVIEW', key: 'profile',      label: 'My Profile',     Icon: PersonIcon,        path: '/receiver-profile'        },
    { section: 'FOOD',     key: 'browse',       label: 'Browse Offers',  Icon: SearchIcon,        path: '/receiver-browse'         },
    { section: 'FOOD',     key: 'accepted',     label: 'My Accepted',    Icon: CheckCircleIcon,   path: '/receiver-accepted'       },
    { section: 'ACTIVITY', key: 'history',      label: 'History',        Icon: HistoryIcon,       path: '/receiver-history'        },
    { section: 'ACTIVITY', key: 'notifications',label: 'Notifications',  Icon: NotificationsIcon, path: '/receiver-notifications', hasBadge: true },
];

const ReceiverSidebar = ({ onLogout, activePage }) => {   // removed unreadCount prop
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    // Helper to fetch unread count from backend
    const fetchUnreadCount = async () => {
        const storedUser = localStorage.getItem('feedhope_user');
        if (!storedUser) return;
        const user = JSON.parse(storedUser);
        const userId = user.user_id;
        if (!userId) return;

        try {
            const res = await fetch(`http://localhost:5000/api/receiver/notifications/${userId}?status=unread`);
            const data = await res.json();
            setUnreadCount(data.length);
        } catch (err) {
            console.error("Failed to fetch unread count:", err);
        }
    };

    // Fetch on mount and when the component re‑mounts (e.g., after navigation)
    useEffect(() => {
        fetchUnreadCount();

        // Listen for custom event dispatched when notifications are marked as read
        const handleNotificationRead = () => fetchUnreadCount();
        window.addEventListener('notification-read', handleNotificationRead);

        // Also listen for storage events in case user logs in/out in another tab
        const handleStorageChange = (e) => {
            if (e.key === 'feedhope_user') fetchUnreadCount();
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('notification-read', handleNotificationRead);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Group nav items
    const sections = NAV_ITEMS.reduce((acc, item) => {
        if (!acc[item.section]) acc[item.section] = [];
        acc[item.section].push(item);
        return acc;
    }, {});

    return (
        <aside className="rsb-sidebar">
            <div className="rsb-logo">
                <div className="logo-circle">
                    <img src="/Images/logo-circle.png" alt="FeedHope Logo" className="header-logo-img" />
                </div>
                <span className="rsb-logo-text">FeedHope</span>
            </div>

            <div className="rsb-role-row">
                <div className="rsb-role-avatar">
                    <PersonIcon sx={{ fontSize: 16 }} />
                </div>
                <span className="rsb-role-label">Receiver</span>
                <button className="rsb-role-switch" title="Switch role">
                    <SwapHorizIcon sx={{ fontSize: 16 }} />
                </button>
            </div>

            <nav className="rsb-nav">
                {Object.entries(sections).map(([sectionName, items]) => (
                    <div key={sectionName}>
                        <p className="rsb-nav-label">{sectionName}</p>
                        {items.map(({ key, label, Icon, path, hasBadge }) => (
                            <button
                                key={key}
                                className={`rsb-nav-item ${activePage === key ? 'rsb-nav-item--active' : ''}`}
                                onClick={() => navigate(path)}
                            >
                                <Icon sx={{ fontSize: 18 }} />
                                {label}
                                {hasBadge && unreadCount > 0 && (
                                    <span className="rsb-badge">{unreadCount}</span>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>

            <button className="rsb-logout" onClick={onLogout}>
                <LogoutIcon sx={{ fontSize: 18 }} />
                Log Out
            </button>
        </aside>
    );
};

export default ReceiverSidebar;