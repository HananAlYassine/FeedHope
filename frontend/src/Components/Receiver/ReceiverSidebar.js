// ============================================================
//  FeedHope — Omar & Hanan — Components/Receiver/ReceiverSidebar.js
//
//  The fixed left sidebar shown on every Receiver page.
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Styles/Receiver/ReceiverSidebar.css';

// ── MUI Icon imports ──────────────────────────────────────────
// Each icon is imported individually from @mui/icons-material to
// keep the bundle small (tree-shakeable). 

import DashboardIcon       from '@mui/icons-material/Dashboard';         // Dashboard nav item
import PersonIcon          from '@mui/icons-material/Person';             // Profile nav item & role avatar
import SearchIcon          from '@mui/icons-material/Search';             // Browse Offers nav item
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';        // My Accepted nav item
import HistoryIcon         from '@mui/icons-material/History';            // History nav item
import NotificationsIcon   from '@mui/icons-material/Notifications';      // Notifications nav item (with badge)
import SwapHorizIcon       from '@mui/icons-material/SwapHoriz';          // Switch role button
import LogoutIcon          from '@mui/icons-material/Logout';             // Log out button

// ── Navigation items configuration ───────────────────────────
// Each item has a key (used for the active highlight),
// a label, an icon component, and the route to navigate to.
// The Icon field now references an MUI icon component instead of a hand-crafted SVG.
const NAV_ITEMS = [
    // OVERVIEW section
    { section: 'OVERVIEW', key: 'dashboard',    label: 'Dashboard',      Icon: DashboardIcon,     path: '/receiver-dashboard'      },
    { section: 'OVERVIEW', key: 'profile',      label: 'My Profile',     Icon: PersonIcon,        path: '/receiver-profile'        },
    // FOOD section
    { section: 'FOOD',     key: 'browse',       label: 'Browse Offers',  Icon: SearchIcon,        path: '/receiver-browse'         },
    { section: 'FOOD',     key: 'accepted',     label: 'My Accepted',    Icon: CheckCircleIcon,   path: '/receiver-accepted'       },
    // ACTIVITY section
    { section: 'ACTIVITY', key: 'history',      label: 'History',        Icon: HistoryIcon,       path: '/receiver-history'        },
    { section: 'ACTIVITY', key: 'notifications',label: 'Notifications',  Icon: NotificationsIcon, path: '/receiver-notifications', hasBadge: true },
];

// ─────────────────────────────────────────────────────────────
//  Sidebar Component
// ─────────────────────────────────────────────────────────────
const ReceiverSidebar = ({ onLogout, unreadCount, activePage }) => {
    const navigate = useNavigate();

    // Group nav items by their section label so we can render section headers.
    // Result shape: { OVERVIEW: [...], FOOD: [...], ACTIVITY: [...] }
    const sections = NAV_ITEMS.reduce((acc, item) => {
        if (!acc[item.section]) acc[item.section] = [];
        acc[item.section].push(item);
        return acc;
    }, {});

    return (
        <aside className="rsb-sidebar">

            {/* ── Logo ── */}
            <div className="rsb-logo">
                <div className="logo-circle">
                    {/* App logo image — stored in /public/Images/ */}
                    <img
                        src="/Images/logo-circle.png"
                        alt="FeedHope Logo"
                        className="header-logo-img"
                    />
                </div>

                {/* Project name text next to the logo */}
                <span className="rsb-logo-text">FeedHope</span>
            </div>

            {/* ── Role indicator with switch button ── */}
            {/* Shows the current role ("Receiver") and a small icon button to switch roles */}
            <div className="rsb-role-row">
                {/* Small circular avatar using MUI PersonIcon instead of the old inline SVG */}
                <div className="rsb-role-avatar">
                    <PersonIcon sx={{ fontSize: 16 }} />
                </div>

                {/* Label text indicating the current user role */}
                <span className="rsb-role-label">Receiver</span>

                {/* Switch role button — SwapHorizIcon (MUI) replaces the old inline <IconSwitch> SVG.
                    Placeholder for multi-role users who can toggle between Donor / Receiver views. */}
                <button className="rsb-role-switch" title="Switch role">
                    <SwapHorizIcon sx={{ fontSize: 16 }} />
                </button>
            </div>

            {/* ── Navigation ── */}
            {/* Fills available vertical space between the role row and the logout button */}
            <nav className="rsb-nav">
                {/* Loop over each section (OVERVIEW, FOOD, ACTIVITY) */}
                {Object.entries(sections).map(([sectionName, items]) => (
                    <div key={sectionName}>
                        {/* Section label rendered in all-caps via CSS (e.g. "OVERVIEW") */}
                        <p className="rsb-nav-label">{sectionName}</p>

                        {/* Nav items within this section */}
                        {items.map(({ key, label, Icon, path, hasBadge }) => (
                            <button
                                key={key}
                                // Add 'rsb-nav-item--active' class when this is the current page
                                className={`rsb-nav-item ${activePage === key ? 'rsb-nav-item--active' : ''}`}
                                onClick={() => navigate(path)}
                            >
                                {/* MUI icon component — rendered at 18px to match the original SVG size.
                                    The Icon variable holds a different MUI component for each nav item. */}
                                <Icon sx={{ fontSize: 18 }} />

                                {/* Nav item label text */}
                                {label}

                                {/* Show unread badge only on the Notifications item.
                                    The badge count comes from the unreadCount prop passed by the parent. */}
                                {hasBadge && unreadCount > 0 && (
                                    <span className="rsb-badge">{unreadCount}</span>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>

            {/* ── Log Out button ──
                LogoutIcon (MUI) replaces the old inline <IconLogout> SVG.
                Calls the onLogout prop which clears localStorage and redirects to /signin. */}
            <button className="rsb-logout" onClick={onLogout}>
                <LogoutIcon sx={{ fontSize: 18 }} />
                Log Out
            </button>
        </aside>
    );
};

export default ReceiverSidebar;
