// ==============================================================
//  FeedHope — Omar & Hanan — Pages/Receiver/ReceiverDashboard.js
// ==============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Sidebar shared across all Receiver pages ──────────────────
import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';

// ── Page-specific styles ──────────────────────────────────────
import '../../Styles/Receiver/ReceiverDashboard.css';

// ── MUI Icon imports ─────────────────────────────────────────
import RestaurantMenuIcon  from '@mui/icons-material/RestaurantMenu';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import LocalShippingIcon   from '@mui/icons-material/LocalShipping';
import ArticleIcon         from '@mui/icons-material/Article';
import NotificationsIcon   from '@mui/icons-material/Notifications';
import PlaceIcon           from '@mui/icons-material/Place';
import AccessTimeIcon      from '@mui/icons-material/AccessTime';
import ChevronRightIcon    from '@mui/icons-material/ChevronRight';
import CancelIcon          from '@mui/icons-material/Cancel';
import InfoIcon            from '@mui/icons-material/Info';

// ── Format a pickup_time datetime string into a readable time ──
const formatTime = (datetimeStr) => {
    if (!datetimeStr) return '—';
    return new Date(datetimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// helper: first letter of name
const getInitial = (name = '') => name.trim().charAt(0).toUpperCase() || '?';

// ── Format a full date+time notification timestamp ──
const formatNotifDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
};

// Map notification type to icon (same as Notifications page)
const getNotificationIcon = (type) => {
    switch (type) {
        case 'offer_accepted': return <RestaurantMenuIcon fontSize="small" />;
        case 'delivery_update': return <LocalShippingIcon fontSize="small" />;
        case 'cancellation': return <CancelIcon fontSize="small" />;
        default: return <InfoIcon fontSize="small" />;
    }
};

// ==============================================================
//  Main Component
// ==============================================================
const ReceiverDashboard = () => {
    const navigate = useNavigate();

    const storedUser = localStorage.getItem('feedhope_user');
    const user       = storedUser ? JSON.parse(storedUser) : null;

    const [dashboardData, setDashboardData] = useState(null); // used to display values
    const [loading,       setLoading]       = useState(true); // show spinner
    const [error,         setError]         = useState(null); // show error message
    const [accepting,     setAccepting]     = useState(null);

    
    useEffect(() => {
        // If there is no logged-in user Redirect them to Sign In page
        if (!user) {
            navigate('/signin');
            return;
        }

        const fetchDashboard = async () => {
            try {
                setLoading(true); // We are loading data now
                // Call the backend API
                const res  = await fetch(`http://localhost:5000/api/receiver/dashboard/${user.user_id}`);
                const data = await res.json(); // Backend sends data → we convert it into usable JavaScript object.

                // if something went wrong: 1. Show error message 2. Stop execution
                if (!res.ok) {
                    setError(data.error || 'Failed to load dashboard.');
                    return;
                }
                setDashboardData(data);  // Store the API result in React state
            } catch (err) {
                // If server is down or network fails: Show error message
                setError('Could not connect to the server. Make sure the backend is running.');
            } finally {
                setLoading(false); // Stop loading
            }
        };

        fetchDashboard(); // Call the function
    }, []);

    // This function runs when the user clicks "Accept Offer"
    const handleAcceptOffer = async (offerId) => {
        setAccepting(offerId); // This specific offer is being accepted now
        try {
            const res  = await fetch('http://localhost:5000/api/receiver/accept-offer', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    offerId,
                    userId: user.user_id
                })
            });
            const data = await res.json(); // Convert backend response to JS object
            if (res.ok) {
                const refreshRes  = await fetch(`http://localhost:5000/api/receiver/dashboard/${user.user_id}`);
                const refreshData = await refreshRes.json();
                if (refreshRes.ok) setDashboardData(refreshData); //re-render UI with new data

            // Dispatch event so sidebar refreshes unread count
            window.dispatchEvent(new Event('notification-read'));

            } else {
                alert(data.error || 'Could not accept offer.');
            }
        } catch {
            alert('Network error. Please try again.');
        } finally {
            setAccepting(null); // Reset loading state
        }
    };

    // This logs the user out completely
    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    /* If data is still loading:
        Show spinner
        Show message: Loading your dashboard…
        Prevents empty or broken UI */
    if (loading) {
        return (
            <div className="rdb-loading-screen">
                <div className="rdb-spinner" />
                <p>Loading your dashboard…</p>
            </div>
        );
    }

    /* If something went wrong:
        Show error message
        Show retry button */
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

    /*  Extracting data from state
    What each one means:
        receiver → user info
        stats → numbers (meals, etc.)
        offers → available offers
        notifications → alerts/messages
        acceptedOffers → offers user accepted
    */
    const { receiver, stats, offers, notifications, acceptedOffers } = dashboardData;
    
    return (
        <div className="rdb-layout">
            <ReceiverSidebar
                onLogout={handleLogout}
                activePage="dashboard"
            />

            <main className="rdb-main">
                {/* Banner - unchanged */}
                <div className="rdb-banner">
                    <div className="rdb-banner-text">
                        <p className="rdb-banner-greeting">Good to see you!</p>
                        <h1 className="rdb-banner-title">
                            Hello, {receiver.organization_name || receiver.name}!
                        </h1>
                        <p className="rdb-banner-subtitle">
                            {stats.availableOffers > 0
                                ? `${stats.availableOffers} new offer${stats.availableOffers !== 1 ? 's are' : ' is'} available near you. Browse and find what you need today!`
                                : 'No new offers right now. Check back soon!'}
                        </p>
                    </div>
                    
                    <div className="rdb-banner-icon rdb-banner-avatar">
                        {receiver.profile_picture ? (
                            <img 
                                src={`http://localhost:5000${receiver.profile_picture}`} 
                                alt="profile" 
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            getInitial(receiver.organization_name || receiver.name)
                        )}
                    </div>
                    <button
                        className="rdb-banner-btn"
                        onClick={() => navigate('/receiver-browse')}
                    >
                        Browse Offers
                    </button>
                </div>

                {/* Stats Row */}
                <div className="rdb-stats-row">
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--blue">
                            <RestaurantMenuIcon fontSize="small" />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{stats.availableOffers}</span>
                            <span className="rdb-stat-label">Available Offers</span>
                        </div>
                    </div>
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--green">
                            <CheckCircleIcon fontSize="small" />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{stats.myAccepted}</span>
                            <span className="rdb-stat-label">My Accepted</span>
                        </div>
                    </div>
                    <div className="rdb-stat-card">
                        <div className="rdb-stat-icon rdb-stat-icon--orange">
                            <LocalShippingIcon fontSize="small" />
                        </div>
                        <div className="rdb-stat-info">
                            <span className="rdb-stat-number">{stats.incomingDeliveries}</span>
                            <span className="rdb-stat-label">Incoming Deliveries</span>
                        </div>
                    </div>
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

                {/* Main Grid */}
                <div className="rdb-grid">
                    {/* LEFT COLUMN */}
                    <div className="rdb-col-left">
                        {/* Available Offers Card - unchanged */}
                        <section className="rdb-card">
                            <div className="rdb-card-header">
                                <div className="rdb-card-title">
                                    <RestaurantMenuIcon fontSize="small" />
                                    Available Offers
                                </div>
                                <button
                                    className="rdb-view-all"
                                    onClick={() => navigate('/receiver-browse')}
                                >
                                    View All <ChevronRightIcon fontSize="small" />
                                </button>
                            </div>
                            {offers.length === 0 ? (
                                <p className="rdb-empty-state">
                                    No food offers available right now. Check back soon!
                                </p>
                            ) : (
                                offers.map(offer => (
                                    <div className="rdb-offer-card" key={offer.offer_id}>
                                        <div className="rdb-offer-body">
                                            <div className="rdb-offer-info">
                                                <h3 className="rdb-offer-title">{offer.food_name}</h3>
                                                <p className="rdb-offer-source">{offer.donor_name}</p>
                                                <p className="rdb-offer-meta">
                                                    <PlaceIcon sx={{ fontSize: 13 }} />
                                                    {offer.donor_street}, {offer.donor_city}
                                                </p>
                                                <p className="rdb-offer-meta">
                                                    <AccessTimeIcon sx={{ fontSize: 13 }} />
                                                    Pickup: {formatTime(offer.pickup_time)}
                                                </p>
                                            </div>
                                            <span className="rdb-offer-portions">
                                                {offer.portions || '—'}
                                            </span>
                                        </div>
                                        <div className="rdb-offer-actions">
                                            <button
                                                className="rdb-btn-details"
                                                onClick={() => navigate(`/receiver-offer/${offer.offer_id}`)}
                                            >
                                                Details
                                            </button>
                                            <button
                                                className="rdb-btn-accept"
                                                onClick={() => handleAcceptOffer(offer.offer_id)}
                                                disabled={accepting === offer.offer_id}
                                            >
                                                {accepting === offer.offer_id ? 'Accepting…' : 'Accept Offer'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </section>

                        {/* Notifications Card with dynamic icons */}
                        <section className="rdb-card">
                            <div className="rdb-card-header">
                                <div className="rdb-card-title">
                                    <NotificationsIcon fontSize="small" />
                                    Notifications
                                </div>
                                <button
                                    className="rdb-view-all"
                                    onClick={() => navigate('/receiver-notifications')}
                                >
                                    View All <ChevronRightIcon fontSize="small" />
                                </button>
                            </div>

                            {notifications.length === 0 ? (
                                <p className="rdb-empty-state">No notifications yet.</p>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.notification_id}
                                        className={`rdb-notif-item ${!notif.read_at ? 'rdb-notif-item--new' : ''}`}
                                    >
                                        {/* dynamic icon based on notification type */}
                                        <div className="rdb-notif-icon">
                                            {getNotificationIcon(notif.type)}
                                        </div>
                                        <div className="rdb-notif-body">
                                            <p className="rdb-notif-title">{notif.title}</p>
                                            <p className="rdb-notif-text">{notif.message}</p>
                                            <p className="rdb-notif-time">{formatNotifDate(notif.date)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </section>
                    </div>

                    {/* RIGHT COLUMN  */}
                    <div className="rdb-col-right">
                        <section className="rdb-card">
                            <div className="rdb-card-header">
                                <div className="rdb-card-title">
                                    <CheckCircleIcon fontSize="small" />
                                    My Accepted Offers
                                </div>
                                <button
                                    className="rdb-view-all"
                                    onClick={() => navigate('/receiver-accepted')}
                                >
                                    View All <ChevronRightIcon fontSize="small" />
                                </button>
                            </div>
                            {acceptedOffers.length === 0 ? (
                                <p className="rdb-empty-state">
                                    You haven't accepted any offers yet.
                                </p>
                            ) : (
                                acceptedOffers.map(item => (
                                    <div className="rdb-accepted-item" key={item.offer_id}>
                                        <div className="rdb-accepted-info">
                                            <span className="rdb-accepted-name">{item.food_name}</span>
                                            <span className="rdb-accepted-source">{item.donor_name}</span>
                                        </div>
                                        <span className="rdb-status-badge rdb-status-badge--accepted">
                                            Accepted
                                        </span>
                                    </div>
                                ))
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReceiverDashboard;
