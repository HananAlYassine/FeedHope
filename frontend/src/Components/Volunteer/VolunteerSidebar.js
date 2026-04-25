import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import '../../Styles/Volunteer/VolunteerSidebar.css';
import BottomNav from '../Shared/BottomNav';

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
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const VolunteerSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => { setIsOpen(false); }, [location.pathname]);
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

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
        navigate('/signin');
    };

    return (
        <>
            <button
                className="vs-mobile-toggle"
                onClick={() => setIsOpen(true)}
                aria-label="Open menu"
                aria-expanded={isOpen}
            >
                <MenuIcon />
            </button>
            <div
                className={`vs-overlay ${isOpen ? 'is-open' : ''}`}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />
        <aside className={`vs-sidebar ${isOpen ? 'is-open' : ''}`}>
            <div className="vs-sidebar-header">
                <div className="logo-circle">
                    <img src="/Images/logo-circle.png" alt="Logo" className="header-logo-img" />
                </div>
                <h1 className="vs-logo-text">FeedHope</h1>
                <button
                    className="vs-mobile-close"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close menu"
                >
                    <CloseIcon />
                </button>
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
                <SidebarLink to="/volunteer/my-deliveries" icon={<LocalShippingIcon />} label="My Deliveries" />
                <SidebarLink to="/volunteer-history" icon={<HistoryIcon />} label="History" />

                <p className="vs-nav-label">Feedback</p>
                <SidebarLink to="/volunteer-feedback" icon={<RateReviewIcon />} label="Feedback & Rating" />
                <SidebarLink to="/volunteer-notifications" icon={<NotificationsIcon />} label="Notifications" badge={unreadCount > 0 ? unreadCount : null} />
            </nav>

            <div className="vs-sidebar-footer">
                <button className="vs-logout-btn" onClick={handleLogout}>
                    <ExitToAppIcon sx={{ fontSize: 20 }} />
                    <span>Log Out</span>
                </button>
            </div>
        </aside>
        <BottomNav
            accent="volunteer"
            items={[
                { to: '/volunteer-dashboard', label: 'Home', icon: <DashboardIcon fontSize="small" />, end: true },
                { to: '/volunteer-available-offers', label: 'Available', icon: <RestaurantMenuIcon fontSize="small" /> },
                { to: '/volunteer/my-deliveries', label: 'Deliveries', icon: <LocalShippingIcon fontSize="small" /> },
                { to: '/volunteer-notifications', label: 'Alerts', icon: <NotificationsIcon fontSize="small" />, badge: unreadCount },
                { to: '/volunteer-profile', label: 'Profile', icon: <PersonIcon fontSize="small" /> },
            ]}
        />
        </>
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