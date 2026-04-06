// ============================================================
//  FeedHope — Pages/Receiver/ReceiverDashboard.js
//
//  This is the main Receiver Dashboard page.
//  It fetches all dashboard data from the backend when it mounts,
//  then passes the data down to smaller sub-components.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate }                 from 'react-router-dom';
import ReceiverSidebar                 from '../../Components/Receiver/ReceiverSidebar';
import '../../Styles/Receiver/ReceiverDashboard.css';

// ── MUI Icon imports ──────────────────────────────────────────
// Each icon is imported individually from @mui/icons-material to
// keep the bundle small (tree-shakeable). Make sure you have
// @mui/icons-material and @mui/material installed:
//   npm install @mui/icons-material @mui/material @emotion/react @emotion/styled

import RestaurantMenuIcon  from '@mui/icons-material/RestaurantMenu';   // Represents food/offers
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';       // Accepted / confirmed actions
import LocalShippingIcon   from '@mui/icons-material/LocalShipping';     // Incoming deliveries (truck)
import ArticleIcon         from '@mui/icons-material/Article';           // Meals log / document-style stat
import NotificationsIcon   from '@mui/icons-material/Notifications';     // Notification bell
import PlaceIcon           from '@mui/icons-material/Place';             // Location pin on offer cards
import AccessTimeIcon      from '@mui/icons-material/AccessTime';        // Clock / pickup time
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'; // "What I'm Looking For" list
import ChevronRightIcon    from '@mui/icons-material/ChevronRight';      // "View All" arrow
import PeopleIcon          from '@mui/icons-material/People';            // Welcome banner illustration

// ── Fake "What I'm Looking For" data ──────────────────────────
// These are hardcoded for now. In a future sprint you will add a DB table
// (e.g. Receiver_needs) and let the receiver edit their needs list.
const FAKE_NEEDS = [
    { id: 1, name: 'Fresh Produce',  desc: 'Vegetables and fruits',    priority: 'HIGH',   color: 'red'    },
    { id: 2, name: 'Dairy Products', desc: 'Milk, cheese, yogurt',     priority: 'MEDIUM', color: 'orange' },
    { id: 3, name: 'Protein',        desc: 'Eggs, meat, fish',         priority: 'HIGH',   color: 'red'    },
    { id: 4, name: 'Bread & Bakery', desc: 'Fresh bread and pastries', priority: 'LOW',    color: 'green'  },
];

// ── Format a pickup_time datetime string into a readable time ──
// Example input:  "2024-03-14T14:00:00.000Z"
// Example output: "14:00"
const formatTime = (datetimeStr) => {
    if (!datetimeStr) return '—';
    return new Date(datetimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Format a full date+time notification timestamp ──
const formatNotifDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
};

// ==============================================================
//  Main Component
// ==============================================================
const ReceiverDashboard = () => {
    const navigate = useNavigate();

    // ── Read the signed-in user from localStorage ──
    // This was saved by the SignIn page after a successful /api/signin response.
    const storedUser = localStorage.getItem('feedhope_user');
    const user       = storedUser ? JSON.parse(storedUser) : null;

    // ── Component state ──
    const [dashboardData, setDashboardData] = useState(null); // All data from the backend
    const [loading,       setLoading]       = useState(true);  // True while fetching
    const [error,         setError]         = useState(null);  // Error message, if any
    const [accepting,     setAccepting]     = useState(null);  // offerId currently being accepted

    // ── Fetch dashboard data on mount ──
    useEffect(() => {
        // If there's no user in storage, redirect to sign-in
        if (!user) {
            navigate('/signin');
            return;
        }

        const fetchDashboard = async () => {
            try {
                setLoading(true);

                // Call the backend endpoint with this user's ID
                const res  = await fetch(`http://localhost:5000/api/receiver/dashboard/${user.user_id}`);
                const data = await res.json();

                if (!res.ok) {
                    // Backend returned an error (e.g. 404 if receiver record not found)
                    setError(data.error || 'Failed to load dashboard.');
                    return;
                }

                // Store the full response in state — all sub-sections read from here
                setDashboardData(data);
            } catch (err) {
                // Network error (backend not running, etc.)
                setError('Could not connect to the server. Make sure the backend is running.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty array = run once when the component first mounts

    // ── Handle "Accept Offer" button click ──
    const handleAcceptOffer = async (offerId) => {
        // Show a loading state on just this one button while the request is in flight
        setAccepting(offerId);

        try {
            const res  = await fetch('http://localhost:5000/api/receiver/accept-offer', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    offerId,
                    receiverId: dashboardData.receiver.receiver_id
                })
            });
            const data = await res.json();

            if (res.ok) {
                // Re-fetch the dashboard so all counts and lists update
                const refreshRes  = await fetch(`http://localhost:5000/api/receiver/dashboard/${user.user_id}`);
                const refreshData = await refreshRes.json();
                if (refreshRes.ok) setDashboardData(refreshData);
            } else {
                alert(data.error || 'Could not accept offer.');
            }
        } catch {
            alert('Network error. Please try again.');
        } finally {
            setAccepting(null); // Clear the loading state
        }
    };

    // ── Handle "Log Out" ──
    const handleLogout = () => {
        localStorage.removeItem('feedhope_user'); // Wipe the stored user
        navigate('/signin');                       // Send to sign-in page
    };

    // ── Loading state ──
    if (loading) {
        return (
            <div className="rdb-loading-screen">
                <div className="rdb-spinner" />
                <p>Loading your dashboard…</p>
            </div>
        );
    }

    // ── Error state ──
    if (error) {
        return (
            <div className="rdb-error-screen">
                <p className="rdb-error-msg">{error}</p>
                <button className="rdb-retry-btn" onClick={() => window.location.reload()}>
                    Retry
                </button>
            </div>
        );
    }

    // Destructure the data object for easier access in the JSX below
    const { receiver, stats, offers, notifications, acceptedOffers } = dashboardData;

    // Count unread notifications (read_at is null = not yet read)
    const unreadCount = notifications.filter(n => !n.read_at).length;

    // ── Render ──
    return (
        <div className="rdb-layout">

            {/* ── SIDEBAR ─────────────────────────────────────── */}
            <ReceiverSidebar
                onLogout={handleLogout}
                unreadCount={unreadCount}
                activePage="dashboard"
            />

            {/* ── MAIN CONTENT ─────────────────────────────────── */}
            <main className="rdb-main">

                {/* ══ WELCOME BANNER ══════════════════════════════ */}
                <div className="rdb-banner">
                    <div className="rdb-banner-text">
                        {/* Greeting line above the main title */}
                        <p className="rdb-banner-greeting">Good to see you!</p>

                        {/* Main title uses the organization name from the DB */}
                        <h1 className="rdb-banner-title">
                            Hello, {receiver.organization_name || receiver.name}!
                        </h1>

                        {/* Dynamic subtitle based on how many offers are available */}
                        <p className="rdb-banner-subtitle">
                            {stats.availableOffers > 0
                                ? `${stats.availableOffers} new offer${stats.availableOffers !== 1 ? 's are' : ' is'} available near you. Browse and find what you need today!`
                                : 'No new offers right now. Check back soon!'}
                        </p>
                    </div>

                    {/* Decorative icon circle on the right side of the banner.
                        PeopleIcon (MUI) replaces the old inline <IconPeople> SVG.
                        fontSize="inherit" lets the parent div control the size via CSS. */}
                    <div className="rdb-banner-icon">
                        <PeopleIcon sx={{ fontSize: 64, opacity: 0.9 }} />
                    </div>

                    {/* CTA button — takes user to browse all offers */}
                    <button
                        className="rdb-banner-btn"
                        onClick={() => navigate('/receiver-browse')}
                    >
                        Browse Offers
                    </button>
                </div>

                {/* ══ STATS ROW ════════════════════════════════════
                     Four summary cards showing key numbers at a glance */}
                <div className="rdb-stats-row">

                    {/* Stat 1: How many offers are currently available.
                        RestaurantMenuIcon (MUI) replaces the old inline <IconFood> SVG. */}
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--blue">
                            <RestaurantMenuIcon fontSize="small" />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{stats.availableOffers}</span>
                            <span className="rdb-stat-label">Available Offers</span>
                        </div>
                    </div>

                    {/* Stat 2: How many offers this receiver has accepted.
                        CheckCircleIcon (MUI) replaces the old inline <IconCheck> SVG. */}
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--green">
                            <CheckCircleIcon fontSize="small" />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{stats.myAccepted}</span>
                            <span className="rdb-stat-label">My Accepted</span>
                        </div>
                    </div>

                    {/* Stat 3: Deliveries currently in transit or assigned.
                        LocalShippingIcon (MUI) replaces the old inline <IconTruck> SVG. */}
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--orange">
                            <LocalShippingIcon fontSize="small" />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{stats.incomingDeliveries}</span>
                            <span className="rdb-stat-label">Incoming Deliveries</span>
                        </div>
                    </div>

                    {/* Stat 4: Total meals received historically.
                        ArticleIcon (MUI) replaces the old inline <IconMeals> SVG. */}
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--purple">
                            <ArticleIcon fontSize="small" />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{stats.mealsReceived}</span>
                            <span className="rdb-stat-label">Meals Received</span>
                        </div>
                    </div>
                </div>

                {/* ══ MAIN GRID: LEFT + RIGHT COLUMNS ═════════════ */}
                <div className="rdb-grid">

                    {/* ── LEFT COLUMN ──────────────────────────── */}
                    <div className="rdb-col-left">

                        {/* ── Available Offers Card ── */}
                        <section className="rdb-card">
                            <div className="rdb-card-header">
                                <div className="rdb-card-title">
                                    {/* RestaurantMenuIcon used again as a section heading icon */}
                                    <RestaurantMenuIcon fontSize="small" />
                                    Available Offers
                                </div>
                                <button
                                    className="rdb-view-all"
                                    onClick={() => navigate('/receiver-browse')}
                                >
                                    {/* ChevronRightIcon (MUI) replaces the old inline <IconArrow> SVG */}
                                    View All <ChevronRightIcon fontSize="small" />
                                </button>
                            </div>

                            {/* If no offers exist, show an empty state message */}
                            {offers.length === 0 ? (
                                <p className="rdb-empty-state">
                                    No food offers available right now. Check back soon!
                                </p>
                            ) : (
                                // Map over the offers array and render one card per offer
                                offers.map(offer => (
                                    <div className="rdb-offer-card" key={offer.offer_id}>
                                        <div className="rdb-offer-body">
                                            <div className="rdb-offer-info">
                                                {/* Offer name (food_name from DB) */}
                                                <h3 className="rdb-offer-title">{offer.food_name}</h3>

                                                {/* Donor's organization name */}
                                                <p className="rdb-offer-source">{offer.donor_name}</p>

                                                {/* Location: street + city.
                                                    PlaceIcon (MUI) replaces the old inline <IconPin> SVG. */}
                                                <p className="rdb-offer-meta">
                                                    <PlaceIcon sx={{ fontSize: 13 }} />
                                                    {offer.donor_street}, {offer.donor_city}
                                                </p>

                                                {/* Pickup time formatted from the datetime field.
                                                    AccessTimeIcon (MUI) replaces the old inline <IconClock> SVG. */}
                                                <p className="rdb-offer-meta">
                                                    <AccessTimeIcon sx={{ fontSize: 13 }} />
                                                    Pickup: {formatTime(offer.pickup_time)}
                                                </p>
                                            </div>

                                            {/* Number of portions — green circle badge */}
                                            <span className="rdb-offer-portions">
                                                {offer.portions || '—'}
                                            </span>
                                        </div>

                                        {/* Action buttons row */}
                                        <div className="rdb-offer-actions">
                                            {/* Details button — will navigate to offer detail page later */}
                                            <button
                                                className="rdb-btn-details"
                                                onClick={() => navigate(`/receiver-offer/${offer.offer_id}`)}
                                            >
                                                Details
                                            </button>

                                            {/* Accept Offer button — calls the accept endpoint */}
                                            <button
                                                className="rdb-btn-accept"
                                                onClick={() => handleAcceptOffer(offer.offer_id)}
                                                disabled={accepting === offer.offer_id}
                                            >
                                                {/* Show "Accepting…" while the API call is in progress */}
                                                {accepting === offer.offer_id ? 'Accepting…' : 'Accept Offer'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </section>

                        {/* ── Notifications Card ── */}
                        <section className="rdb-card">
                            <div className="rdb-card-header">
                                <div className="rdb-card-title">
                                    {/* NotificationsIcon (MUI) replaces the old inline <IconBell> SVG */}
                                    <NotificationsIcon fontSize="small" />
                                    Notifications
                                </div>
                                <button
                                    className="rdb-view-all"
                                    onClick={() => navigate('/receiver-notifications')}
                                >
                                    View All
                                </button>
                            </div>

                            {/* Empty state if no notifications */}
                            {notifications.length === 0 ? (
                                <p className="rdb-empty-state">No notifications yet.</p>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.notification_id}
                                        // Add a highlight class if this notification hasn't been read yet
                                        className={`rdb-notif-item ${!notif.read_at ? 'rdb-notif-item--new' : ''}`}
                                    >
                                        {/* Notification icon square.
                                            RestaurantMenuIcon (MUI) used here to represent a food notification. */}
                                        <div className="rdb-notif-icon">
                                            <RestaurantMenuIcon fontSize="small" />
                                        </div>
                                        <div className="rdb-notif-body">
                                            {/* Title of the notification (message_title from DB) */}
                                            <p className="rdb-notif-title">{notif.title}</p>
                                            {/* Body text of the notification (message from DB) */}
                                            <p className="rdb-notif-text">{notif.message}</p>
                                            {/* When the notification was created */}
                                            <p className="rdb-notif-time">{formatNotifDate(notif.date)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </section>
                    </div>
                    {/* ── END LEFT COLUMN ──────────────────────── */}

                    {/* ── RIGHT COLUMN ─────────────────────────── */}
                    <div className="rdb-col-right">

                        {/* ── What I'm Looking For Card ── */}
                        <section className="rdb-card">
                            <div className="rdb-card-header">
                                <div className="rdb-card-title">
                                    {/* FormatListBulletedIcon (MUI) replaces the old inline <IconList> SVG */}
                                    <FormatListBulletedIcon fontSize="small" />
                                    What I'm Looking For
                                </div>
                                {/* Edit button — placeholder for a future "edit needs" flow */}
                                <button className="rdb-btn-edit">Edit</button>
                            </div>

                            {/* Render each hardcoded need item */}
                            {FAKE_NEEDS.map(need => (
                                <div className="rdb-need-item" key={need.id}>
                                    {/* Color-coded icon square.
                                        RestaurantMenuIcon (MUI) used as a generic food category icon. */}
                                    <div className={`rdb-need-icon rdb-need-icon--${need.color}`}>
                                        <RestaurantMenuIcon fontSize="small" />
                                    </div>
                                    <div className="rdb-need-info">
                                        <span className="rdb-need-name">{need.name}</span>
                                        <span className="rdb-need-desc">{need.desc}</span>
                                    </div>
                                    {/* Priority badge: HIGH / MEDIUM / LOW */}
                                    <span className={`rdb-priority rdb-priority--${need.priority.toLowerCase()}`}>
                                        {need.priority}
                                    </span>
                                </div>
                            ))}
                        </section>

                        {/* ── My Accepted Offers Card ── */}
                        <section className="rdb-card">
                            <div className="rdb-card-header">
                                <div className="rdb-card-title">
                                    {/* CheckCircleIcon (MUI) replaces the old inline <IconCheck> SVG */}
                                    <CheckCircleIcon fontSize="small" />
                                    My Accepted Offers
                                </div>
                                <button
                                    className="rdb-view-all"
                                    onClick={() => navigate('/receiver-accepted')}
                                >
                                    {/* ChevronRightIcon (MUI) replaces the old inline <IconArrow> SVG */}
                                    View All <ChevronRightIcon fontSize="small" />
                                </button>
                            </div>

                            {/* Empty state if no accepted offers yet */}
                            {acceptedOffers.length === 0 ? (
                                <p className="rdb-empty-state">
                                    You haven't accepted any offers yet.
                                </p>
                            ) : (
                                acceptedOffers.map(item => (
                                    <div className="rdb-accepted-item" key={item.offer_id}>
                                        <div className="rdb-accepted-info">
                                            {/* Name of the food offer */}
                                            <span className="rdb-accepted-name">{item.food_name}</span>
                                            {/* Donor who posted the offer */}
                                            <span className="rdb-accepted-source">{item.donor_name}</span>
                                        </div>
                                        {/* Status badge — always 'Accepted' here but reusable */}
                                        <span className="rdb-status-badge rdb-status-badge--accepted">
                                            Accepted
                                        </span>
                                    </div>
                                ))
                            )}
                        </section>

                    </div>
                    {/* ── END RIGHT COLUMN ─────────────────────── */}

                </div>
                {/* ── END MAIN GRID ──────────────────────────── */}

            </main>
            {/* ── END MAIN CONTENT ─────────────────────────────── */}

        </div>
        // ── END LAYOUT ───────────────────────────────────────────
    );
};

export default ReceiverDashboard;
