// ============================================================
//  FeedHope — Volunteer Dashboard (real data)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import DashboardChatbot from '../../Components/Shared/DashboardChatbot';
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
import NotificationsIcon from '@mui/icons-material/Notifications';

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

    // Notifications shown in the bottom-right card. Limited to the
    // newest 4 to keep the dashboard fixed in 100vh on desktop.
    const [notifications, setNotifications] = useState([]);

    // Reject modal state — replaces window.prompt with a styled red/white form
    const [rejectModal, setRejectModal] = useState({ open: false, request: null, reason: '' });

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

    const fetchNotifications = useCallback(async () => {
        if (!user?.user_id) return;
        try {
            const res = await axios.get(`${API_BASE}/api/volunteer/notifications/all/${user.user_id}`);
            setNotifications(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }, [user?.user_id]);

    useEffect(() => {
        if (!user) {
            navigate('/signin');
            return;
        }
        fetchDashboard();
        fetchPendingRequests();
        fetchNotifications();
        // Real-time: poll dashboard data + pending requests + notifications every 3s.
        const interval = setInterval(() => {
            fetchDashboard();
            fetchPendingRequests();
            fetchNotifications();
        }, 3000);
        return () => clearInterval(interval);
    }, [fetchDashboard, fetchPendingRequests, fetchNotifications, navigate, user]);

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

    // Step 1: open the styled reject modal (no more window.prompt)
    const handleRejectRequest = (request) => {
        setRejectModal({ open: true, request, reason: '' });
        setRequestError('');
    };

    // Step 2: actual API call after the user confirms in the modal
    const confirmRejectRequest = async () => {
        const { request, reason } = rejectModal;
        if (!request) return;
        setActingRequestId(request.request_id);
        setRequestError('');
        try {
            await axios.put(
                `${API_BASE}/api/volunteer/assignment-request/${request.request_id}/reject`,
                { volunteerUserId: user.user_id, reason: reason.trim() || null }
            );
            setPendingRequests(prev => prev.filter(r => r.request_id !== request.request_id));
            window.dispatchEvent(new Event('notifUpdated'));
            setRejectModal({ open: false, request: null, reason: '' });
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
        <div className="vdb-layout vdb-layout--fixed">
            <VolunteerSidebar />
            <main className="vdb-main vdb-main--fixed">
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
                                    ) : availableList.slice(0, 3).map(del => (
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
                                    ) : activeList.slice(0, 3).map(del => (
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
                                ) : activities.slice(0, 3).map((act, i) => (
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

                        {/* Notifications — bottom-right card, mirrors the
                            other roles' dashboards. Limited to the latest 4
                            so the page stays fixed in the viewport. */}
                        <div className="vdb-card vdb-notif-card">
                            <div className="vdb-card-header">
                                <h3>
                                    <NotificationsIcon fontSize="small" /> Notifications
                                    {notifications.filter(n => !n.read_at).length > 0 && (
                                        <span className="vdb-notif-unread">
                                            ({notifications.filter(n => !n.read_at).length})
                                        </span>
                                    )}
                                </h3>
                                <button className="vdb-view-all" onClick={() => navigate('/volunteer-notifications')}>
                                    View All <ChevronRightIcon fontSize="small" />
                                </button>
                            </div>
                            <div className="vdb-notif-list">
                                {notifications.length === 0 ? (
                                    <div style={{ padding: 16, color: '#64748b' }}>
                                        No notifications yet.
                                    </div>
                                ) : notifications.slice(0, 2).map(n => (
                                    <div
                                        key={n.notification_id}
                                        className={`vdb-notif-item ${!n.read_at ? 'unread' : ''}`}
                                    >
                                        <div className="vdb-notif-body">
                                            <p className="vdb-notif-title">{n.message_title}</p>
                                            <p className="vdb-notif-text">{n.message}</p>
                                            <span className="vdb-notif-time">
                                                {timeAgo(n.date)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Reject-request modal — red & white form ───────────────── */}
            {rejectModal.open && (
                <div
                    onClick={() => !actingRequestId && setRejectModal({ open: false, request: null, reason: '' })}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, padding: 16
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            border: '2px solid #dc2626',
                            borderRadius: 12,
                            width: 'min(440px, 100%)',
                            boxShadow: '0 20px 50px rgba(220, 38, 38, 0.25)',
                            overflow: 'hidden',
                            fontFamily: 'inherit'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            background: '#dc2626',
                            color: '#fff',
                            padding: '14px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: '#fff', color: '#dc2626',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 18
                                }}>!</span>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Reject Delivery Request</h3>
                            </div>
                            <button
                                onClick={() => !actingRequestId && setRejectModal({ open: false, request: null, reason: '' })}
                                disabled={!!actingRequestId}
                                aria-label="Close"
                                style={{
                                    background: 'transparent', border: 'none', color: '#fff',
                                    fontSize: 22, cursor: actingRequestId ? 'not-allowed' : 'pointer',
                                    lineHeight: 1, padding: 0
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '18px 20px', background: '#fff' }}>
                            <p style={{ margin: '0 0 14px 0', color: '#7f1d1d', fontSize: 14, lineHeight: 1.4 }}>
                                You are about to reject the admin's delivery request
                                {rejectModal.request?.food_name ? <> for <strong>"{rejectModal.request.food_name}"</strong></> : null}.
                                Please share a brief reason so the admin can find another volunteer.
                            </p>

                            <label style={{
                                display: 'block', fontSize: 12, fontWeight: 700,
                                color: '#dc2626', textTransform: 'uppercase',
                                letterSpacing: 0.5, marginBottom: 6
                            }}>
                                Reason <span style={{ color: '#9ca3af', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                            </label>
                            <textarea
                                value={rejectModal.reason}
                                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="e.g. I'm not available at the pickup time, the location is too far, vehicle issue, etc."
                                maxLength={300}
                                rows={4}
                                style={{
                                    width: '100%',
                                    border: '1.5px solid #fecaca',
                                    borderRadius: 8,
                                    padding: '10px 12px',
                                    fontSize: 14,
                                    color: '#1f2937',
                                    background: '#fff',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#dc2626'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#fecaca'; }}
                            />
                            <div style={{
                                marginTop: 4, fontSize: 11, color: '#9ca3af', textAlign: 'right'
                            }}>
                                {rejectModal.reason.length} / 300
                            </div>

                            {requestError && (
                                <div style={{
                                    marginTop: 10, padding: '8px 12px',
                                    background: '#fef2f2', border: '1px solid #fecaca',
                                    borderRadius: 8, color: '#991b1b', fontSize: 13
                                }}>
                                    {requestError}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '12px 20px',
                            background: '#fff5f5',
                            borderTop: '1px solid #fecaca',
                            display: 'flex', gap: 10, justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setRejectModal({ open: false, request: null, reason: '' })}
                                disabled={!!actingRequestId}
                                style={{
                                    background: '#fff',
                                    color: '#dc2626',
                                    border: '1.5px solid #dc2626',
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    cursor: actingRequestId ? 'not-allowed' : 'pointer',
                                    fontFamily: 'inherit',
                                    fontSize: 14
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRejectRequest}
                                disabled={!!actingRequestId}
                                style={{
                                    background: '#dc2626',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 18px',
                                    borderRadius: 8,
                                    fontWeight: 700,
                                    cursor: actingRequestId ? 'not-allowed' : 'pointer',
                                    opacity: actingRequestId ? 0.7 : 1,
                                    fontFamily: 'inherit',
                                    fontSize: 14
                                }}
                            >
                                {actingRequestId ? 'Rejecting…' : 'Reject Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role-aware AI assistant */}
            <DashboardChatbot role="Volunteer" />
        </div>
    );
};

export default VolunteerDashboard;
