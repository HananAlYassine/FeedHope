// ============================================================
//  FeedHope — Omar&Hanan — Components/Admin/AdminSidebar.js
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Styles/Admin/AdminSidebar.css';

// MUI Icons
import DashboardIcon        from '@mui/icons-material/Dashboard';
import PersonIcon           from '@mui/icons-material/Person';
import PeopleIcon           from '@mui/icons-material/People';
import RestaurantMenuIcon   from '@mui/icons-material/RestaurantMenu';
import LocalShippingIcon    from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon      from '@mui/icons-material/AttachMoney';
import AccountBalanceIcon   from '@mui/icons-material/AccountBalance';
import BarChartIcon         from '@mui/icons-material/BarChart';
import NotificationsIcon    from '@mui/icons-material/Notifications';
import LogoutIcon           from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const NAV_SECTIONS = [
    {
        section: 'OVERVIEW',
        items: [
            { key: 'dashboard', label: 'Dashboard',     Icon: DashboardIcon,     path: '/admin-dashboard'         },
            { key: 'profile',   label: 'My Profile',    Icon: PersonIcon,        path: '/admin-profile'           },
        ]
    },
    {
        section: 'USERS',
        items: [
            { key: 'users',     label: 'User Management', Icon: PeopleIcon,      path: '/admin-users'             },
        ]
    },
    {
        section: 'FOOD',
        items: [
            { key: 'food-offers', label: 'Food Offers',  Icon: RestaurantMenuIcon, path: '/admin-food-offers'     },
            { key: 'deliveries',  label: 'Deliveries',   Icon: LocalShippingIcon,  path: '/admin-deliveries'      },
        ]
    },
    {
        section: 'FINANCE',
        items: [
            { key: 'money-donations',   label: 'Money Donations',   Icon: AttachMoneyIcon,    path: '/admin-money-donations'   },
            { key: 'fund-distribution', label: 'Fund Distribution', Icon: AccountBalanceIcon, path: '/admin-fund-distribution' },
        ]
    },
    {
        section: 'ACTIVITY',
        items: [
            { key: 'notifications', label: 'Notifications', Icon: NotificationsIcon, path: '/admin-notifications', hasBadge: true },
        ]
    },
];

const AdminSidebar = ({ onLogout, activePage }) => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);


    // Get logged‑in admin user from localStorage
    const storedUser = localStorage.getItem('feedhope_user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const adminUserId = user?.user_id;


    const fetchUnreadCount = async () => {
        if (!adminUserId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/admin/notifications/unread-count/${adminUserId}`);
            const data = await res.json();
            setUnreadCount(data.count || 0);
        } catch (err) {
            console.error("Failed to fetch unread count:", err);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        const handleRead = () => fetchUnreadCount();
        window.addEventListener('notification-read', handleRead);
        return () => window.removeEventListener('notification-read', handleRead);
    }, [adminUserId]);

    return (
        <aside className="asb-sidebar">
            {/* ── Logo ── */}
            <div className="asb-logo">
                <div className="asb-logo-circle">
                    <img src="/Images/logo-circle.png" alt="FeedHope Logo" className="asb-logo-img" />
                </div>
                <span className="asb-logo-text">FeedHope</span>
            </div>

            {/* ── Admin badge ── */}
            <div className="asb-role-row">
                <div className="asb-role-avatar">
                    <AdminPanelSettingsIcon sx={{ fontSize: 16 }} />
                </div>
                <span className="asb-role-label">Administrator</span>
            </div>

            {/* ── Navigation ── */}
            <nav className="asb-nav">
                {NAV_SECTIONS.map(({ section, items }) => (
                    <div key={section}>
                        <p className="asb-nav-label">{section}</p>
                        {items.map(({ key, label, Icon, path, hasBadge }) => (
                            <button
                                key={key}
                                className={`asb-nav-item ${activePage === key ? 'asb-nav-item--active' : ''}`}
                                onClick={() => navigate(path)}
                            >
                                <Icon sx={{ fontSize: 18 }} />
                                {label}
                                {hasBadge && unreadCount > 0 && (
                                    <span className="asb-badge">{unreadCount}</span>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>

            {/* ── Logout ── */}
            <button className="asb-logout" onClick={onLogout}>
                <LogoutIcon sx={{ fontSize: 18 }} />
                Log Out
            </button>
        </aside>
    );
};

export default AdminSidebar;
