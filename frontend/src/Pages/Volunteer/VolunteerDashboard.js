// ============================================================
//  FeedHope — Volunteer Dashboard (real data)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import '../../Styles/Volunteer/VolunteerDashboard.css';

// MUI Icons
import FastfoodIcon from '@mui/icons-material/Fastfood';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InventoryIcon from '@mui/icons-material/Inventory2';
import PeopleIcon from '@mui/icons-material/People';
import HandshakeIcon from '@mui/icons-material/Handshake';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const API_BASE = 'http://localhost:5000';

const formatDateTime = (dt) => {
    if (!dt) return '—';
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return String(dt);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const timeAgo = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return '';
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60)        return 'just now';
    if (diff < 3600)      return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
};

const renderStars = (rating) => {
    const r = Math.round(Number(rating) || 0);
    return [1, 2, 3, 4, 5].map(n =>
        n <= r
            ? <StarIcon key={n} style={{ fontSize: 16, color: '#f59e0b' }} />
            : <StarBorderIcon key={n} style={{ fontSize: 16, color: '#cbd5e1' }} />
    );
};

const activityIcon = (kind) => {
    switch (kind) {
        case 'completed': return <CheckCircleIcon style={{ color: '#16a34a' }} />;
        case 'started':   return <LocalShippingIcon style={{ color: '#2563eb' }} />;
        case 'accepted':  return <InventoryIcon style={{ color: '#0891b2' }} />;
        case 'rating':    return <StarIcon style={{ color: '#f59e0b' }} />;
        default:          return <CheckCircleIcon />;
    }
};

const VolunteerDashboard = () => {
    const navigate = useNavigate();

    const [user] = useState(() => {
        const raw = localStorage.getItem('feedhope_user');
        return raw ? JSON.parse(raw) : null;
    });

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const [pendingRequests, setPendingRequests] = useState([]);
    const [actingRequestId, setActingRequestId] = useState(null);
    const [requestError, setRequestError] = useState('');

    const [activeTab, setActiveTab] = useState('available');

    const fetchDashboard = useCallback(async () => {
        if (!user?.user_id) return;
        try {
            const res = await axios.get(`${API_BASE}/api/volunteer/dashboard/${user.user_id}`);
            setData(res.data);
            setErrorMessage('');
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            setErrorMessage(err.response?.data?.error || 'Failed to load dashboard.');
        } finally {
            setLoading(false);
        }
    }, [user?.user_id]);

    const fetchPendingRequests = useCallback(async () => {
        if (!user?.user_id) return;
        try {
            const res = await axios.get(`${API_BASE}/api/volunteer/pending-requests/${user.user_id}`);
            setPendingRequests(res.data || []);
        } catch (err) {
            console.error('Failed to fetch pending requests:', err);
        }
    }, [user?.user_id]);

    useEffect(() => {
        if (!user) {
            navigate('/signin');
            return;
        }
        fetchDashboard();
        fetchPendingRequests();
        // Real-time: poll dashboard data + pending requests every 3s.
        const interval = setInterval(() => {
            fetchDashboard();
            fetchPendingRequests();
        }, 3000);
        return () => clearInterval(interval);
    }, [fetchDashboard, fetchPendingRequests, navigate, user]);

    const handleAcceptRequest = async (request) => {
        setActingRequestId(request.request_id);
        setRequestError('');
        try {
            await axios.put(
                `${API_BASE}/api/volunteer/assignment-request/${request.request_id}/accept`,
                { volunteerUserId: user.user_id }
            );
            window.dispatchEvent(new Event('notifUpdated'));
            navigate('/volunteer/my-deliveries');
        } catch (err) {
            console.error('Accept request failed:', err);
            setRequestError(err.response?.data?.error || 'Failed to accept request.');
            setActingRequestId(null);
        }
    };

    const handleRejectRequest = async (request) => {
        const reason = window.prompt('Reason for rejecting (optional):', '') || '';
        setActingRequestId(request.request_id);
        setRequestError('');
        try {
            await axios.put(
                `${API_BASE}/api/volunteer/assignment-request/${request.request_id}/reject`,
                { volunteerUserId: user.user_id, reason: reason || null }
            );
            setPendingRequests(prev => prev.filter(r => r.request_id !== request.request_id));
            window.dispatchEvent(new Event('notifUpdated'));
        } catch (err) {
            console.error('Reject request failed:', err);
            setRequestError(err.response?.data?.error || 'Failed to reject request.');
        } finally {
            setActingRequestId(null);
        }
    };

    const handleAcceptOffer = async (offerId) => {
        try {
            await axios.post(`${API_BASE}/api/volunteer/accept-delivery`, {
                userId: user.user_id,
                offerId
            });
            navigate('/volunteer/my-deliveries');
        } catch (err) {
            console.error('Accept offer failed:', err);
            alert(err.response?.data?.error || 'Failed to accept this delivery.');
            fetchDashboard();
        }
    };

    if (loading) {
        return (
            <div className="vdb-layout">
                <VolunteerSidebar />
                <main className="vdb-main">
                    <p style={{ padding: 24 }}>Loading dashboard…</p>
                </main>
            </div>
        );
    }

    const stats              = data?.stats || { completedDeliveries: 0, activeDeliveries: 0, avgRating: 0, ratingCount: 0, peopleHelped: 0 };
    const availableList      = data?.availableDeliveries || [];
    const activeList         = data?.activeDeliveries || [];
    const activities         = data?.recentActivities || [];
    const topPartners        = data?.topPartners || [];
    const topRating          = data?.topRating;
    const displayName        = data?.user?.name || user?.name || 'Volunteer';

    return (
        <div className="vdb-layout">
            <VolunteerSidebar />
            <main className="vdb-main">
                {/* 🚨 Compact Urgent Assignment Requests */}
                {pendingRequests.length > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            borderRadius: 10,
                            padding: '12px 14px',
                            marginBottom: 16
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', fontWeight: 600, fontSize: 14 }}>
                            <WarningAmberIcon style={{ fontSize: 18 }} />
                            <span>Urgent — {pendingRequests.length} delivery request{pendingRequests.length === 1 ? '' : 's'} from admin</span>
                        </div>

                        {requestError && (
                            <div style={{ fontSize: 12, color: '#b91c1c' }}>{requestError}</div>
                        )}

                        {pendingRequests.map(req => {
                            const busy = actingRequestId === req.request_id;
                            return (
                                <div
                                    key={req.request_id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        background: '#fff',
                                        border: '1px solid #fee2e2',
                                        borderRadius: 8,
                                        padding: '10px 12px',
                                        flexWrap: 'wrap'
                                    }}
                                >
                                    <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
                                            {req.food_name}
                                        </div>
                                        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                                            <ScheduleIcon style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 4 }} />
                                            Expires {formatDateTime(req.expiration_date_and_time)}
                                            {req.admin_message ? <> · <em>“{req.admin_message}”</em></> : null}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            onClick={() => handleAcceptRequest(req)}
                                            disabled={busy}
                                            style={{
                                                background: '#16a34a', color: '#fff',
                                                border: 'none', borderRadius: 6,
                                                padding: '6px 12px', fontSize: 13, fontWeight: 600,
                                                cursor: busy ? 'wait' : 'pointer'
                                            }}
                                        >
                                            {busy ? '…' : 'Accept'}
                                        </button>
                                        <button
                                            onClick={() => handleRejectRequest(req)}
                                            disabled={busy}
                                            style={{
                                                background: '#fff', color: '#b91c1c',
                                                border: '1px solid #fca5a5', borderRadius: 6,
                                                padding: '6px 12px', fontSize: 13, fontWeight: 500,
                                                cursor: busy ? 'wait' : 'pointer'
                                            }}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Welcome Banner */}
                <div className="vdb-banner">
                    <div className="vdb-banner-text">
                        <p className="vdb-greeting">Great work, volunteer!</p>
                        <h1>Hello, {displayName}!</h1>
                        <p className="vdb-message">You're making a real difference in the community. Every delivery counts!</p>
                    </div>
                    <div className="vdb-banner-stats">
                        <div className="vdb-stat-pill">
                            <FastfoodIcon fontSize="small" />
                            <span>{stats.completedDeliveries} DELIVERIES</span>
                        </div>
                        <div className="vdb-stat-pill">
                            <StarIcon fontSize="small" />
                            <span>{stats.avgRating || '—'} RATING</span>
                        </div>
                        <div className="vdb-stat-pill">
                            <PeopleIcon fontSize="small" />
                            <span>{stats.peopleHelped} HELPED</span>
                        </div>
                    </div>
                </div>

                {errorMessage && (
                    <div style={{ background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 8, marginBottom: 16 }}>
                        {errorMessage}
                    </div>
                )}

                <div className="vdb-two-columns">
                    {/* Left Column */}
                    <div className="vdb-left">
                        <div className="vdb-card">
                            <div className="vdb-tabs">
                                <button
                                    className={`vdb-tab ${activeTab === 'available' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('available')}
                                >
                                    Available Deliveries ({availableList.length})
                                </button>
                                <button
                                    className={`vdb-tab ${activeTab === 'active' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('active')}
                                >
                                    My Active ({stats.activeDeliveries})
                                </button>
                            </div>
                            <div className="vdb-delivery-list">
                                {activeTab === 'available' && (
                                    availableList.length === 0 ? (
                                        <div style={{ padding: 16, color: '#64748b' }}>
                                            No available offers right now.
                                        </div>
                                    ) : availableList.map(del => (
                                        <div key={del.offer_id} className="vdb-delivery-item">
                                            <div className="vdb-delivery-info">
                                                <div className="vdb-delivery-title">{del.food_name}</div>
                                                <div className="vdb-delivery-detail">From: {del.donor_name}</div>
                                                <div className="vdb-delivery-detail">To: {del.receiver_name || '—'}</div>
                                                <div className="vdb-delivery-meta">
                                                    <ScheduleIcon fontSize="small" /> Pickup: {formatDateTime(del.pickup_time)}
                                                    {del.distance_km != null ? ` · ${del.distance_km} km` : ''}
                                                </div>
                                            </div>
                                            <button
                                                className="vdb-accept-btn"
                                                onClick={() => handleAcceptOffer(del.offer_id)}
                                            >
                                                Accept
                                            </button>
                                        </div>
                                    ))
                                )}
                                {activeTab === 'active' && (
                                    activeList.length === 0 ? (
                                        <div style={{ padding: 16, color: '#64748b' }}>
                                            You don't have any active deliveries.
                                        </div>
                                    ) : activeList.map(del => (
                                        <div key={del.delivery_id} className="vdb-delivery-item">
                                            <div className="vdb-delivery-info">
                                                <div className="vdb-delivery-title">{del.food_name}</div>
                                                <div className="vdb-delivery-detail">From: {del.donor_name}</div>
                                                <div className="vdb-delivery-detail">To: {del.receiver_name || '—'}</div>
                                                <div className="vdb-delivery-meta">
                                                    <ScheduleIcon fontSize="small" /> Pickup: {formatDateTime(del.pickup_time)} · {del.delivery_status === 'in_delivery' ? 'In Delivery' : 'Ready for Pickup'}
                                                </div>
                                            </div>
                                            <button
                                                className="vdb-accept-btn"
                                                onClick={() => navigate('/volunteer/my-deliveries')}
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Activities */}
                        <div className="vdb-card">
                            <div className="vdb-card-header">
                                <h3><LocalShippingIcon fontSize="small" /> Activities</h3>
                                <button className="vdb-view-all" onClick={() => navigate('/volunteer-history')}>
                                    View All <ChevronRightIcon fontSize="small" />
                                </button>
                            </div>
                            <div className="vdb-activity-list">
                                {activities.length === 0 ? (
                                    <div style={{ padding: 16, color: '#64748b' }}>
                                        No recent activity yet.
                                    </div>
                                ) : activities.map((act, i) => (
                                    <div key={i} className="vdb-activity-item">
                                        <div className="vdb-activity-icon">{activityIcon(act.kind)}</div>
                                        <div className="vdb-activity-text">
                                            <div className="vdb-activity-title">{act.text}</div>
                                            <div className="vdb-activity-time">{timeAgo(act.time)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="vdb-right">
                        {/* Top Partners — receivers I've delivered to most often */}
                        <div className="vdb-card">
                            <div className="vdb-card-header">
                                <h3><HandshakeIcon fontSize="small" /> Top Partners</h3>
                            </div>
                            {topPartners.length === 0 ? (
                                <div style={{ padding: 16, color: '#64748b', fontSize: 14 }}>
                                    Complete a delivery to start building your partner list.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 4 }}>
                                    {topPartners.map((p, i) => (
                                        <div
                                            key={p.receiver_id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '10px 12px', borderRadius: 8,
                                                background: i === 0 ? '#fef3c7' : '#f8fafc',
                                                border: '1px solid ' + (i === 0 ? '#fcd34d' : '#e2e8f0')
                                            }}
                                        >
                                            <div style={{
                                                width: 36, height: 36, borderRadius: '50%',
                                                background: i === 0 ? '#f59e0b' : '#1976d2', color: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 700, fontSize: 15, flexShrink: 0
                                            }}>
                                                {i + 1}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: 600, fontSize: 14, color: '#0f172a',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                }}>
                                                    {p.receiver_name}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                                    {p.delivery_count} deliver{p.delivery_count === 1 ? 'y' : 'ies'}
                                                    {Number(p.total_kg) > 0 && <> · {Number(p.total_kg).toFixed(1)} kg</>}
                                                    {Number(p.people_helped) > 0 && <> · {p.people_helped} fed</>}
                                                </div>
                                            </div>
                                            {i === 0 && (
                                                <EmojiEventsIcon style={{ color: '#f59e0b', fontSize: 22 }} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Latest Rating */}
                        <div className="vdb-card">
                            <div className="vdb-card-header">
                                <h3><StarIcon fontSize="small" /> Latest Rating</h3>
                                <button className="vdb-view-all" onClick={() => navigate('/volunteer-feedback')}>
                                    All Ratings <ChevronRightIcon fontSize="small" />
                                </button>
                            </div>
                            {topRating ? (
                                <div className="vdb-rating-item-card">
                                    <div className="vdb-rating-title">{topRating.food_name || 'Delivery'}</div>
                                    <div className="vdb-rating-detail">From: {topRating.donor_name || '—'}</div>
                                    <div className="vdb-rating-detail">To: {topRating.receiver_name || '—'}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                        {renderStars(topRating.rating)}
                                        <span style={{ fontSize: 13, color: '#64748b' }}>
                                            {Number(topRating.rating).toFixed(1)}/5
                                        </span>
                                    </div>
                                    {topRating.comment && (
                                        <div style={{ marginTop: 6, fontStyle: 'italic', color: '#475569', fontSize: 13 }}>
                                            “{topRating.comment}”
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ padding: 16, color: '#64748b' }}>
                                    No ratings received yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VolunteerDashboard;
