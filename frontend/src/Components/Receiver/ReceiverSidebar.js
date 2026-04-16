// ==========================
//  FeedHope — Omar & Hanan 
// ==========================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../Styles/Receiver/ReceiverSidebar.css';

// MUI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LogoutIcon from '@mui/icons-material/Logout';

const NAV_ITEMS = [
    { section: 'OVERVIEW', key: 'dashboard', label: 'Dashboard', Icon: DashboardIcon, path: '/receiver-dashboard' },
    { section: 'OVERVIEW', key: 'profile', label: 'My Profile', Icon: PersonIcon, path: '/receiver-profile' },
    { section: 'FOOD', key: 'browse', label: 'Browse Offers', Icon: SearchIcon, path: '/receiver-browse' },
    { section: 'FOOD', key: 'accepted', label: 'My Accepted', Icon: CheckCircleIcon, path: '/receiver-accepted' },
    { section: 'ACTIVITY', key: 'history', label: 'History', Icon: HistoryIcon, path: '/receiver-history' },
    { section: 'ACTIVITY', key: 'notifications', label: 'Notifications', Icon: NotificationsIcon, path: '/receiver-notifications', hasBadge: true },
];

const ReceiverSidebar = ({ activePage }) => {  // removed unreadCount from props
    const navigate = useNavigate();
    const storedUser = localStorage.getItem('feedhope_user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.user_id;

    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread count from backend
    const fetchUnreadCount = async () => {
        if (!userId) return;
        try {
            const response = await axios.get(`http://localhost:5000/api/receiver/notifications/unread-count/${userId}`);
            setUnreadCount(response.data.count);
        } catch (err) {
            console.error("Failed to fetch unread count:", err);
        }
    };

    // Listen for notification-read events (dispatched when notifications are marked read or deleted)
    useEffect(() => {
        fetchUnreadCount();
        window.addEventListener('notification-read', fetchUnreadCount);
        return () => {
            window.removeEventListener('notification-read', fetchUnreadCount);
        };
    }, [userId]);

    // --- LOGOUT WITH SYSLOG ---
    const handleLogout = async () => {
        try {
            if (user && user.user_id) {
                await axios.post("http://localhost:5000/api/logout", {
                    userId: user.user_id,
                    role: 'Receiver'
                });
            }
        } catch (err) {
            console.error("Logout syslog failed:", err);
        } finally {
            localStorage.removeItem('feedhope_user');
            navigate('/signin');
        }
    };

    const sections = NAV_ITEMS.reduce((acc, item) => {
        if (!acc[item.section]) acc[item.section] = [];
        acc[item.section].push(item);
        return acc;
    }, {});

    return (
        <aside className="rsb-sidebar">
            <div className="rsb-logo">
                <div className="logo-circle">
                    <img src="/Images/logo-circle.png" alt="Logo" className="header-logo-img" />
                </div>
                <span className="rsb-logo-text">FeedHope</span>
            </div>

            <div className="rsb-role-row">
                <div className="rsb-role-avatar"><PersonIcon sx={{ fontSize: 16 }} /></div>
                <span className="rsb-role-label">Receiver</span>
                <button className="rsb-role-switch" title="Switch role"><SwapHorizIcon sx={{ fontSize: 16 }} /></button>
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
                                {hasBadge && unreadCount > 0 && <span className="rsb-badge">{unreadCount}</span>}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>

            <button className="rsb-logout" onClick={handleLogout}>
                <LogoutIcon sx={{ fontSize: 18 }} />
                Log Out
            </button>
        </aside>
    );
};

export default ReceiverSidebar;