import React, { useState } from 'react';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import '../../Styles/Volunteer/VolunteerDashboard.css';

// MUI Icons
import FastfoodIcon from '@mui/icons-material/Fastfood';
import StarIcon from '@mui/icons-material/Star';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const VolunteerDashboard = () => {
    const [activeTab, setActiveTab] = useState('available');

    // Mock data
    const deliveriesCount = 1;
    const rating = 4.8;

    const availableDeliveries = [
        {
            id: 1,
            title: 'Soup & Sandwiches',
            from: 'Fresh Bites Restaurant',
            to: 'Hope Community Shelter',
            pickupTime: '15:00',
            distance: '3.8 km',
        },
    ];

    const activeDeliveries = [
        {
            id: 2,
            title: 'Bread & Pastries',
            from: 'Sunrise Bakery',
            to: 'Downtown Mission',
            pickupTime: '16:30',
            status: 'In Progress',
        },
    ];

    const activities = [
        { id: 1, text: 'Completed delivery to Hope Community Shelter', time: 'Today, 15:30', icon: <CheckCircleIcon /> },
        { id: 2, text: 'Picked up from Fresh Bites Restaurant', time: 'Today, 14:45', icon: <LocalShippingIcon /> },
        { id: 3, text: 'Received 5-star rating!', time: 'Yesterday', icon: <StarIcon /> },
    ];

    const achievements = [
        { title: 'First Delivery', desc: 'Complete your first delivery', icon: <EmojiEventsIcon />, completed: false },
        { title: 'Rising Star', desc: 'Get 5-star rating', icon: <StarIcon />, completed: false },
        { title: 'Weekend Hero', desc: 'Deliver on 3 weekends', icon: <ScheduleIcon />, completed: false },
    ];

    const ratingItem = {
        title: 'Soup & Sandwiches',
        from: 'Fresh Bites Restaurant',
        to: 'Hope Community Shelter',
        pickup: '15:00',
    };

    return (
        <div className="vdb-layout">
            <VolunteerSidebar />
            <main className="vdb-main">
                {/* Welcome Banner */}
                <div className="vdb-banner">
                    <div className="vdb-banner-text">
                        <p className="vdb-greeting">Great work, volunteer!</p>
                        <h1>Hello, John Smith!</h1>
                        <p className="vdb-message">You're making a real difference in the community. Every delivery counts!</p>
                    </div>
                    <div className="vdb-banner-stats">
                        <div className="vdb-stat-pill">
                            <FastfoodIcon fontSize="small" />
                            <span>{deliveriesCount} DELIVERIES</span>
                        </div>
                        <div className="vdb-stat-pill">
                            <StarIcon fontSize="small" />
                            <span>{rating} RATING</span>
                        </div>
                    </div>
                </div>

                <div className="vdb-two-columns">
                    {/* Left Column */}
                    <div className="vdb-left">
                        {/* Tabs: Available Deliveries / My Active */}
                        <div className="vdb-card">
                            <div className="vdb-tabs">
                                <button
                                    className={`vdb-tab ${activeTab === 'available' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('available')}
                                >
                                    Available Deliveries
                                </button>
                                <button
                                    className={`vdb-tab ${activeTab === 'active' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('active')}
                                >
                                    My Active
                                </button>
                            </div>
                            <div className="vdb-delivery-list">
                                {activeTab === 'available' &&
                                    availableDeliveries.map((del) => (
                                        <div key={del.id} className="vdb-delivery-item">
                                            <div className="vdb-delivery-info">
                                                <div className="vdb-delivery-title">{del.title}</div>
                                                <div className="vdb-delivery-detail">From: {del.from}</div>
                                                <div className="vdb-delivery-detail">To: {del.to}</div>
                                                <div className="vdb-delivery-meta">
                                                    <ScheduleIcon fontSize="small" /> Pickup: {del.pickupTime} • {del.distance}
                                                </div>
                                            </div>
                                            <button className="vdb-accept-btn">Accept</button>
                                        </div>
                                    ))}
                                {activeTab === 'active' &&
                                    activeDeliveries.map((del) => (
                                        <div key={del.id} className="vdb-delivery-item">
                                            <div className="vdb-delivery-info">
                                                <div className="vdb-delivery-title">{del.title}</div>
                                                <div className="vdb-delivery-detail">From: {del.from}</div>
                                                <div className="vdb-delivery-detail">To: {del.to}</div>
                                                <div className="vdb-delivery-meta">
                                                    <ScheduleIcon fontSize="small" /> Pickup: {del.pickupTime} • {del.status}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Activities */}
                        <div className="vdb-card">
                            <div className="vdb-card-header">
                                <h3><LocalShippingIcon fontSize="small" /> Activities</h3>
                                <button className="vdb-view-all" onClick={() => alert('View all activities')}>
                                    View All <ChevronRightIcon fontSize="small" />
                                </button>
                            </div>
                            <div className="vdb-activity-list">
                                {activities.map((act) => (
                                    <div key={act.id} className="vdb-activity-item">
                                        <div className="vdb-activity-icon">{act.icon}</div>
                                        <div className="vdb-activity-text">
                                            <div className="vdb-activity-title">{act.text}</div>
                                            <div className="vdb-activity-time">{act.time}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="vdb-right">
                        {/* Achievements */}
                        <div className="vdb-card">
                            <div className="vdb-card-header">
                                <h3><EmojiEventsIcon fontSize="small" /> Achievements</h3>
                            </div>
                            <div className="vdb-achievements">
                                {achievements.map((ach, idx) => (
                                    <div key={idx} className="vdb-achievement">
                                        <div className="vdb-achievement-icon">{ach.icon}</div>
                                        <div className="vdb-achievement-info">
                                            <div className="vdb-achievement-title">{ach.title}</div>
                                            <div className="vdb-achievement-desc">{ach.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* My Ratings */}
                        <div className="vdb-card">
                            <div className="vdb-card-header">
                                <h3><StarIcon fontSize="small" /> My Ratings</h3>
                            </div>
                            <div className="vdb-rating-item-card">
                                <div className="vdb-rating-title">{ratingItem.title}</div>
                                <div className="vdb-rating-detail">From: {ratingItem.from}</div>
                                <div className="vdb-rating-detail">To: {ratingItem.to}</div>
                                <div className="vdb-rating-meta">
                                    <ScheduleIcon fontSize="small" /> Pickup: {ratingItem.pickup}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VolunteerDashboard;