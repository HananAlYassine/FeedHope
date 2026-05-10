import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import DashboardChatbot from '../../Components/Shared/DashboardChatbot';
import '../../Styles/Donor/DonorDashboard.css';

// Material UI Icons
import FastfoodIcon from '@mui/icons-material/Fastfood';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip
} from 'recharts';

const API_BASE = 'http://localhost:5000';

// Color + label mapping for offer statuses (donut slices)
const STATUS_META = {
    available: { label: 'Available', color: '#f57c00' },
    accepted:  { label: 'Accepted',  color: '#1976d2' },
    delivered: { label: 'Delivered', color: '#2e7d32' },
    cancelled: { label: 'Cancelled', color: '#c62828' },
    expired:   { label: 'Expired',   color: '#888888' },
    pending:   { label: 'Pending',   color: '#fbc02d' },
};

const prettyStatus = (s) => STATUS_META[s]?.label || (s || 'Unknown').replace(/^./, c => c.toUpperCase());
const statusColor = (s) => STATUS_META[s]?.color || '#6a1b9a';

// Renders the slice's count centered inside the slice. Tiny slices (< 4%) are
// skipped so the label doesn't overflow into a neighbour.
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }) => {
    if (percent < 0.04) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
              fontSize={14} fontWeight={700}
              style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.25)', strokeWidth: 2 }}>
            {value}
        </text>
    );
};

const DonorDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem("feedhope_user");
        if (!savedUser) { navigate("/signin"); return; }

        const user = JSON.parse(savedUser);
        const uid = user.user_id;

        Promise.all([
            fetch(`${API_BASE}/api/donor/dashboard/${uid}`).then(r => r.json()),
            fetch(`${API_BASE}/api/donor/feedback/${uid}`).then(r => r.json()).catch(() => []),
        ]).then(([dash, fb]) => {
            setData(dash);
            setFeedback(Array.isArray(fb) ? fb.slice(0, 3) : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [navigate]);

    // Real-time: silently re-fetch every 3s so stats and recent activity stay live.
    useEffect(() => {
        const savedUser = localStorage.getItem("feedhope_user");
        if (!savedUser) return;
        const user = JSON.parse(savedUser);
        const uid = user.user_id;
        const silentRefresh = async () => {
            try {
                const [dash, fb] = await Promise.all([
                    fetch(`${API_BASE}/api/donor/dashboard/${uid}`).then(r => r.ok ? r.json() : null),
                    fetch(`${API_BASE}/api/donor/feedback/${uid}`).then(r => r.ok ? r.json() : null),
                ]);
                if (dash) setData(dash);
                if (Array.isArray(fb)) setFeedback(fb.slice(0, 3));
            } catch {}
        };
        const interval = setInterval(silentRefresh, 3000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !data) return <div className="ddb-layout ddb-layout--fixed">Loading...</div>;

    const statusBreakdown = data.statusBreakdown || [];
    const totalOffers = statusBreakdown.reduce((s, x) => s + x.count, 0);

    return (
        <div className="ddb-layout ddb-layout--fixed">
            <DonorSidebar />

            <main className="ddb-main ddb-main--fixed">
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
                    {/* Left Column: Recent Offers + Status Breakdown donut */}
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

                        {/* ── Status Breakdown donut ── */}
                        <div className="ddb-card ddb-donut-card">
                            <div className="ddb-card-header">
                                <h2 className="ddb-card-title">
                                    <DonutLargeIcon sx={{ fontSize: 18 }} /> Offers by Status
                                </h2>
                                <span className="ddb-status-total">{totalOffers} total</span>
                            </div>
                            <div className="ddb-donut-body">
                                {totalOffers > 0 ? (
                                    <>
                                        <div className="ddb-donut-chart">
                                            <ResponsiveContainer width="100%" height={170}>
                                                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                                    <Pie
                                                        data={statusBreakdown}
                                                        dataKey="count"
                                                        nameKey="status"
                                                        cx="50%" cy="50%"
                                                        innerRadius={42}
                                                        outerRadius={75}
                                                        paddingAngle={2}
                                                        stroke="#fff"
                                                        strokeWidth={2}
                                                        label={renderDonutLabel}
                                                        labelLine={false}
                                                        isAnimationActive={false}
                                                    >
                                                        {statusBreakdown.map((entry, i) => (
                                                            <Cell key={i} fill={statusColor(entry.status)} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(v, _n, props) => [`${v} offer${v === 1 ? '' : 's'}`, prettyStatus(props.payload.status)]}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <ul className="ddb-donut-legend">
                                            {statusBreakdown.map(entry => {
                                                const pct = totalOffers ? Math.round((entry.count / totalOffers) * 100) : 0;
                                                return (
                                                    <li key={entry.status}>
                                                        <span className="ddb-donut-swatch" style={{ background: statusColor(entry.status) }} />
                                                        <span className="ddb-donut-label">{prettyStatus(entry.status)}</span>
                                                        <span className="ddb-donut-count">{entry.count}</span>
                                                        <span className="ddb-donut-pct">{pct}%</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </>
                                ) : (
                                    <p className="ddb-empty-text">No offers yet.</p>
                                )}
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

                        {/* Recent Feedback (now stacked under Notifications) */}
                        <div className="ddb-card">
                            <div className="ddb-card-header">
                                <h2 className="ddb-card-title">
                                    <StarIcon sx={{ fontSize: 18 }} /> Recent Feedback
                                </h2>
                                <button className="ddb-view-all" onClick={() => navigate('/donor-feedback')}>
                                    View All <ChevronRightIcon sx={{ fontSize: 16 }} />
                                </button>
                            </div>
                            <div className="ddb-feedback-list">
                                {feedback.length > 0 ? feedback.map(f => (
                                    <div key={f.feedback_id} className="ddb-feedback-item">
                                        <div className="ddb-feedback-head">
                                            <span className="ddb-feedback-name">{f.reviewer_name || 'Receiver'}</span>
                                            <span className="ddb-feedback-stars">
                                                {[1, 2, 3, 4, 5].map(n => n <= (f.rating || 0)
                                                    ? <StarIcon key={n} sx={{ fontSize: 14, color: '#f5a623' }} />
                                                    : <StarBorderIcon key={n} sx={{ fontSize: 14, color: '#ccc' }} />
                                                )}
                                            </span>
                                        </div>
                                        {f.food_name && <p className="ddb-feedback-meta">on "{f.food_name}"</p>}
                                        {f.comment && <p className="ddb-feedback-text">"{f.comment}"</p>}
                                        <span className="ddb-feedback-date">
                                            {f.feedback_date ? new Date(f.feedback_date).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                )) : (
                                    <p className="ddb-empty-text">No feedback yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Role-aware AI assistant */}
            <DashboardChatbot role="Donor" />
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
