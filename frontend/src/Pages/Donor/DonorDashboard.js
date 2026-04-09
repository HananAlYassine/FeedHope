import React from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';

// Material UI Icons
import FastfoodIcon from '@mui/icons-material/Fastfood';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FavoriteIcon from '@mui/icons-material/Favorite';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Co2Icon from '@mui/icons-material/Co2';
import PeopleIcon from '@mui/icons-material/People';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RestaurantIcon from '@mui/icons-material/Restaurant';

const DonorDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="ddb-layout">
            <DonorSidebar />

            <main className="ddb-main">
                {/* ── Welcome Banner (Matching Receiver Design) ── */}
                <section className="ddb-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Welcome back,</p>
                        <h1 className="ddb-banner-title">Fresh Bites Restaurant!</h1>
                        <p className="ddb-banner-subtitle">
                            Your contributions have helped over 12 families this week.
                            Ready to share more surplus food?
                        </p>
                    </div>
                    <div className="ddb-banner-icon">
                        <FavoriteIcon sx={{ fontSize: 45, color: 'rgba(255,255,255,0.9)' }} />
                    </div>
                    <button className="ddb-banner-btn" onClick={() => navigate('/donor-new-offer')}>
                        + New Donation
                    </button>
                </section>

                {/* ── Stats Row (Matching Receiver Grid) ── */}
                <div className="ddb-stats-row">
                    <div className="ddb-stat-card">
                        <div className="ddb-stat-icon ddb-stat-icon--orange">
                            <FastfoodIcon />
                        </div>
                        <div className="ddb-stat-info">
                            <span className="ddb-stat-number">4</span>
                            <span className="ddb-stat-label">Active Offers</span>
                        </div>
                    </div>
                    <div className="ddb-stat-card">
                        <div className="ddb-stat-icon ddb-stat-icon--blue">
                            <AccessTimeIcon />
                        </div>
                        <div className="ddb-stat-info">
                            <span className="ddb-stat-number">2</span>
                            <span className="ddb-stat-label">Pending Pickups</span>
                        </div>
                    </div>
                    <div className="ddb-stat-card">
                        <div className="ddb-stat-icon ddb-stat-icon--green">
                            <CheckCircleIcon />
                        </div>
                        <div className="ddb-stat-info">
                            <span className="ddb-stat-number">28</span>
                            <span className="ddb-stat-label">Completed</span>
                        </div>
                    </div>
                    <div className="ddb-stat-card">
                        <div className="ddb-stat-icon ddb-stat-icon--purple">
                            <PeopleIcon />
                        </div>
                        <div className="ddb-stat-info">
                            <span className="ddb-stat-number">114</span>
                            <span className="ddb-stat-label">People Fed</span>
                        </div>
                    </div>
                </div>

                {/* ── Main Grid (Matching Receiver Two-Column Layout) ── */}
                <div className="ddb-grid">
                    {/* Left Column: Recent Offers */}
                    <div className="ddb-col-left">
                        <div className="ddb-card">
                            <div className="ddb-card-header">
                                <h2 className="ddb-card-title">
                                    <FastfoodIcon sx={{ fontSize: 18 }} />
                                    Recent Offers
                                </h2>
                                <button className="ddb-view-all" onClick={() => navigate('/donor-my-offers')}>
                                    View All <ChevronRightIcon sx={{ fontSize: 16 }} />
                                </button>
                            </div>
                            <div className="ddb-offer-list">
                                <OfferItem
                                    title="Fresh Vegetable Mix"
                                    status="Pending"
                                    portions="15"
                                    time="1 hour ago"
                                />
                                <OfferItem
                                    title="Bakery Assortment"
                                    status="Accepted"
                                    portions="8"
                                    time="3 hours ago"
                                />
                                <OfferItem
                                    title="Cooked Rice & Stew"
                                    status="Completed"
                                    portions="20"
                                    time="Yesterday"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Impact & Notifications */}
                    <div className="ddb-col-right">
                        {/* Environmental Impact Card */}
                        <div className="ddb-card">
                            <div className="ddb-card-header">
                                <h2 className="ddb-card-title">🌍 Eco Impact</h2>
                            </div>
                            <div className="ddb-impact-body">
                                <div className="ddb-need-item">
                                    <div className="ddb-need-icon ddb-need-icon--green">
                                        <Co2Icon />
                                    </div>
                                    <div className="ddb-need-info">
                                        <span className="ddb-need-name">82.5 kg</span>
                                        <span className="ddb-need-desc">CO₂ emissions prevented</span>
                                    </div>
                                </div>
                                <div className="ddb-need-item">
                                    <div className="ddb-need-icon ddb-need-icon--blue">
                                        <LocalShippingIcon />
                                    </div>
                                    <div className="ddb-need-info">
                                        <span className="ddb-need-name">156 kg</span>
                                        <span className="ddb-need-desc">Food waste prevented</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notifications Card */}
                        <div className="ddb-card">
                            <div className="ddb-card-header">
                                <h2 className="ddb-card-title">
                                    <NotificationsIcon sx={{ fontSize: 18 }} />
                                    Notifications
                                </h2>
                                <span className="ddb-badge-count">2 New</span>
                            </div>
                            <div className="ddb-notif-list">
                                <div className="ddb-notif-item ddb-notif-item--new">
                                    <div className="ddb-notif-icon">
                                        <CheckCircleIcon sx={{ fontSize: 18 }} />
                                    </div>
                                    <div className="ddb-notif-body">
                                        <p className="ddb-notif-title">Offer Accepted!</p>
                                        <p className="ddb-notif-text">Community Center accepted your 'Fresh Veggie' offer.</p>
                                        <span className="ddb-notif-time">12 mins ago</span>
                                    </div>
                                </div>
                                <div className="ddb-notif-item">
                                    <div className="ddb-notif-icon">
                                        <NotificationsIcon sx={{ fontSize: 18 }} />
                                    </div>
                                    <div className="ddb-notif-body">
                                        <p className="ddb-notif-title">Reminder</p>
                                        <p className="ddb-notif-text">Don't forget to pack your evening donation.</p>
                                        <span className="ddb-notif-time">2 hours ago</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// Helper component for offer list items
const OfferItem = ({ title, status, portions, time }) => (
    <div className="ddb-offer-card">
        <div className="ddb-offer-body">
            <div className="ddb-offer-info">
                <h4 className="ddb-offer-title">{title}</h4>
                <div className="ddb-offer-meta">
                    <span>{time}</span>
                    <span>•</span>
                    <span className={`ddb-status-text ddb-status-${status.toLowerCase()}`}>{status}</span>
                </div>
            </div>
            <div className="ddb-offer-portions">{portions}</div>
        </div>
    </div>
);

export default DonorDashboard;