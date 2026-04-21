import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../../Styles/Volunteer/VolunteerSidebar.css';

// Material UI Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HistoryIcon from '@mui/icons-material/History';
import RateReviewIcon from '@mui/icons-material/RateReview';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

const VolunteerSidebar = () => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    // Mock user (replace with actual localStorage data later)
    const user = { user_id: 1 };

    // Simulate fetching unread notifications count (demo)
    useEffect(() => {
        // For demo, set a random count or 0
        setUnreadCount(2);
        // In real app: fetch from API similar to donor sidebar
    }, []);

    const handleLogout = () => {
        // Demo logout - no backend call
        localStorage.removeItem('volunteer_user');
        alert('Logged out (demo)');
        navigate('/signin');
    };

    return (
        <aside className="vs-sidebar">
            <div className="vs-sidebar-header">
                <div className="logo-circle">
                    <img src="/Images/logo-circle.png" alt="Logo" className="header-logo-img" />
                </div>
                <h1 className="vs-logo-text">FeedHope</h1>
            </div>

            <div className="vs-role-box">
                <div className="vs-role-inner">
                    <div className="vs-role-info">
                        <div className="vs-role-icon-small">
                            <DashboardIcon sx={{ fontSize: 14, color: '#666' }} />
                        </div>
                        <span className="vs-role-name">Volunteer</span>
                    </div>
                    <button className="vs-role-switch" title="Switch role">
                        <SwapHorizIcon sx={{ fontSize: 16 }} />
                    </button>
                </div>
            </div>

            <nav className="vs-sidebar-nav">
                <p className="vs-nav-label">Main</p>
                <SidebarLink to="/volunteer-dashboard" icon={<DashboardIcon />} label="Dashboard" />
                <SidebarLink to="/volunteer-profile" icon={<PersonIcon />} label="My Profile" />

                <p className="vs-nav-label">Deliveries</p>
                <SidebarLink to="/volunteer-available-offers" icon={<RestaurantMenuIcon />} label="Available Offers" />
                <SidebarLink to="/volunteer-my-deliveries" icon={<LocalShippingIcon />} label="My Deliveries" />
                <SidebarLink to="/volunteer-history" icon={<HistoryIcon />} label="History" />

                <p className="vs-nav-label">Feedback</p>
                <SidebarLink to="/volunteer/feedback-ratings" icon={<RateReviewIcon />} label="Feedback & Rating" />
                <SidebarLink
                    to="/volunteer/notifications"
                    icon={<NotificationsIcon />}
                    label="Notifications"
                    badge={unreadCount > 0 ? unreadCount : null}
                />
            </nav>

            <div className="vs-sidebar-footer">
                <button className="vs-logout-btn" onClick={handleLogout}>
                    <ExitToAppIcon sx={{ fontSize: 20 }} />
                    <span>Log Out</span>
                </button>
            </div>
        </aside>
    );
};

const SidebarLink = ({ to, icon, label, badge }) => (
    <NavLink to={to} className={({ isActive }) => `vs-nav-item ${isActive ? 'active' : ''}`}>
        <div className="vs-nav-content">
            <span className="vs-nav-icon">{icon}</span>
            <span className="vs-nav-text">{label}</span>
        </div>
        {badge && <span className="vs-nav-badge">{badge}</span>}
    </NavLink>
);

export default VolunteerSidebar;