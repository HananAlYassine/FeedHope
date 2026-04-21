import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';

// Material UI Icons
import FastfoodIcon from '@mui/icons-material/Fastfood';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FavoriteIcon from '@mui/icons-material/Favorite';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AssessmentIcon from '@mui/icons-material/Assessment';

const DonorDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem("feedhope_user");
        if (!savedUser) { navigate("/signin"); return; }

        const user = JSON.parse(savedUser);
        fetch(`http://localhost:5000/api/donor/dashboard/${user.user_id}`)
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, [navigate]);

    if (loading) return <div className="ddb-layout">Loading...</div>;

    return (
        <div className="ddb-layout">
            <DonorSidebar />

            <main className="ddb-main">
                {/* ── Welcome Banner ── */}
                <section className="ddb-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Welcome back,</p>
                        <h1 className="ddb-banner-title">{data.organizationName}!</h1>
                        <p className="ddb-banner-subtitle">
                            Ready to share more surplus food today?
                        </p>
                    </div>
                    <button className="ddb-banner-btn" onClick={() => navigate('/donor-new-offer')}>
                        + New Donation
                    </button>
                </section>

                {/* ── Stats Row ── */}
                <div className="ddb-stats-row">
                    <div className="ddb-stat-card">
                        <div className="ddb-stat-icon ddb-stat-icon--orange"><FastfoodIcon /></div>
                        <div className="ddb-stat-info">
                            <span className="ddb-stat-number">{data.stats.activeOffers}</span>
                            <span className="ddb-stat-label">Active Offers</span>
                        </div>
                    </div>
                    <div className="ddb-stat-card">
                        <div className="ddb-stat-icon ddb-stat-icon--blue"><AccessTimeIcon /></div>
                        <div className="ddb-stat-info">
                            <span className="ddb-stat-number">{data.stats.pendingPickups}</span>
                            <span className="ddb-stat-label">Pending Pickups</span>
                        </div>
                    </div>
                    <div className="ddb-stat-card">
                        <div className="ddb-stat-icon ddb-stat-icon--green"><CheckCircleIcon /></div>
                        <div className="ddb-stat-info">
                            <span className="ddb-stat-number">{data.stats.completedDonations}</span>
                            <span className="ddb-stat-label">Completed</span>
                        </div>
                    </div>
                    <div className="ddb-stat-card">
                        <div className="ddb-stat-icon ddb-stat-icon--purple"><PeopleIcon /></div>
                        <div className="ddb-stat-info">
                            <span className="ddb-stat-number">{data.stats.peopleFed}</span>
                            <span className="ddb-stat-label">People Fed</span>
                        </div>
                    </div>
                </div>

                <div className="ddb-grid">
                    {/* Left Column: Recent Offers */}
                    <div className="ddb-col-left">
                        <div className="ddb-card">
                            <div className="ddb-card-header">
                                <h2 className="ddb-card-title"><FastfoodIcon sx={{ fontSize: 18 }} /> Recent Offers</h2>
                                <button className="ddb-view-all" onClick={() => navigate('/donor-my-offers')}>
                                    View All <ChevronRightIcon sx={{ fontSize: 16 }} />
                                </button>
                            </div>
                            <div className="ddb-offer-list">
                                {data.recentOffers.map(offer => (
                                    <OfferItem key={offer.offer_id} title={offer.food_name} status={offer.status} portions={offer.number_of_person} time={new Date(offer.created_at).toLocaleDateString()} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="ddb-col-right">
                        {/* Donation Impact */}
                        <div className="ddb-card">
                            <div className="ddb-card-header"><h2 className="ddb-card-title"><AssessmentIcon sx={{ fontSize: 18 }} /> Donation Impact</h2></div>
                            <div className="ddb-impact-body">
                                <div className="ddb-need-item">
                                    <div className="ddb-need-icon ddb-need-icon--green"><LocalShippingIcon /></div>
                                    <div className="ddb-need-info">
                                        <span className="ddb-need-name">{data.stats.totalKg} kg</span>
                                        <span className="ddb-need-desc">Food Rescued</span>
                                    </div>
                                </div>
                                <div className="ddb-need-item">
                                    <div className="ddb-need-icon ddb-need-icon--blue"><RestaurantIcon /></div>
                                    <div className="ddb-need-info">
                                        <span className="ddb-need-name">{data.stats.peopleFed}</span>
                                        <span className="ddb-need-desc">Meals Provided</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notifications Card with "View All" */}
                        <div className="ddb-card">
                            <div className="ddb-card-header">
                                <h2 className="ddb-card-title">
                                    <NotificationsIcon sx={{ fontSize: 18 }} />
                                    Notifications
                                    {data.unreadCount > 0 && <span className="ddb-unread-indicator">({data.unreadCount})</span>}
                                </h2>
                                <button className="ddb-view-all" onClick={() => navigate('/donor-notifications')}>
                                    View All <ChevronRightIcon sx={{ fontSize: 16 }} />
                                </button>
                            </div>
                            <div className="ddb-notif-list">
                                {data.notifications.length > 0 ? (
                                    data.notifications.map(notif => (
                                        <div
                                            key={notif.notification_id}
                                            /* Check if read_at is null to apply the 'unread' class */
                                            className={`ddb-notif-item ${!notif.read_at ? 'unread' : ''}`}
                                        >
                                            <div className="ddb-notif-body">
                                                <p className="ddb-notif-title">{notif.message_title}</p>
                                                <p className="ddb-notif-text">{notif.message}</p>
                                                <span className="ddb-notif-time">
                                                    {new Date(notif.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="ddb-empty-text">No notifications yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const OfferItem = ({ title, status, portions, time }) => (
    <div className="ddb-offer-card">
        <div className="ddb-offer-body">
            <div className="ddb-offer-info">
                <h4 className="ddb-offer-title">{title}</h4>
                <div className="ddb-offer-meta">
                    <span>{time}</span> • <span className={`ddb-status-text ddb-status-${status.toLowerCase()}`}>{status}</span>
                </div>
            </div>
            <div className="ddb-offer-portions">{portions} Portions</div>
        </div>
    </div>
);

export default DonorDashboard;