// ============================================================
//  FeedHope — Omar & Hanan — Pages/Admin/AdminDashboard.js
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import DashboardChatbot from '../../Components/Shared/DashboardChatbot';
import '../../Styles/Admin/AdminDashboard.css';

// MUI icons
import CalendarTodayIcon     from '@mui/icons-material/CalendarToday';
import ScaleIcon             from '@mui/icons-material/Scale';
import PeopleAltIcon         from '@mui/icons-material/PeopleAlt';
import PendingActionsIcon    from '@mui/icons-material/PendingActions';
import LocalDiningIcon       from '@mui/icons-material/LocalDining';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import AutoAwesomeIcon       from '@mui/icons-material/AutoAwesome';
import RefreshIcon           from '@mui/icons-material/Refresh';

// ── Recharts ──────────────────────────────────────────────────
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';

// ── Helpers ────────────────────────────────────────────────────
const todayFormatted = () =>
    new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const ROLE_COLOR = {
    Donor:     { bg: '#fff3e0', text: '#e65100', dot: '#f59e0b' },
    Receiver:  { bg: '#e8f5e9', text: '#2e7d32', dot: '#43a047' },
    Volunteer: { bg: '#e3f2fd', text: '#1565c0', dot: '#1e88e5' },
};

const PIE_COLORS = {
    Donor:     '#f59e0b',
    Receiver:  '#43a047',
    Volunteer: '#1e88e5',
};

const STATUS_COLOR = {
    active:   { bg: '#e8f5e9', text: '#2e7d32' },
    pending:  { bg: '#fff8e1', text: '#f59e0b' },
    verified: { bg: '#e8f5e9', text: '#2e7d32' },
    inactive: { bg: '#fafafa', text: '#888' },
    banned:   { bg: '#ffebee', text: '#c62828' },
};

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return percent > 0.04 ? (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
              fontSize={12} fontWeight={700}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    ) : null;
};

const TREND_FILTERS = ['Today', 'This Month', 'This Year', 'Last Year'];

const AdminDashboard = () => {
    const navigate = useNavigate();

    const [stats,         setStats]         = useState(null);
    const [pieData,       setPieData]       = useState([]);
    const [trendData,     setTrendData]     = useState([]);
    const [activity,      setActivity]      = useState([]);
    const [trendFilter,   setTrendFilter]   = useState('This Month');
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [trendLoading,  setTrendLoading]  = useState(false);

    // AI summary (Gemini 2.0 Flash)
    const [aiSummary,        setAiSummary]        = useState('');
    const [aiSummaryRange,   setAiSummaryRange]   = useState('today');
    const [aiSummaryAt,      setAiSummaryAt]      = useState(null);
    const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
    const [aiSummaryError,   setAiSummaryError]   = useState('');

    const handleSummarize = async (range = aiSummaryRange) => {
        setAiSummaryLoading(true);
        setAiSummaryError('');
        try {
            const res = await fetch('http://localhost:5000/api/admin/ai/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ range }),
            });
            const data = await res.json();
            if (!res.ok) {
                setAiSummaryError(data.error || 'Failed to generate summary.');
                return;
            }
            setAiSummary(data.summary || '');
            setAiSummaryAt(data.generated_at || new Date().toISOString());
            setAiSummaryRange(range);
        } catch {
            setAiSummaryError('Could not reach the server. Is the backend running?');
        } finally {
            setAiSummaryLoading(false);
        }
    };

    // Expiration alerts
    const [expirationAlerts, setExpirationAlerts] = useState([]);
    const [showAlertModal, setShowAlertModal] = useState(false);

    // Volunteers list
    const [volunteers, setVolunteers] = useState([]);

    // Assign request modal
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState(null);
    const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
    const [requestMessage, setRequestMessage] = useState('');
    const [sendingRequest, setSendingRequest] = useState(false);

    // Fetch dashboard stats
    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const res  = await fetch('http://localhost:5000/api/admin/dashboard/stats');
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to load stats.'); return; }
            setStats(data.stats);
            setPieData(data.userDistribution || []);
            setActivity(data.recentActivity  || []);
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTrend = async (filter) => {
        try {
            setTrendLoading(true);
            const param = encodeURIComponent(filter);
            const res  = await fetch(`http://localhost:5000/api/admin/dashboard/trends?filter=${param}`);
            const data = await res.json();
            if (res.ok) setTrendData(data.trends || []);
        } catch {
            // ignore
        } finally {
            setTrendLoading(false);
        }
    };

    // Fetch volunteers for dropdown
    const fetchVolunteers = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/admin/volunteers');
            const data = await res.json();
            setVolunteers(data.volunteers || []);
        } catch (err) {
            console.error('Failed to fetch volunteers:', err);
        }
    };

    // Fetch expiration alerts
    const fetchExpirationAlerts = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/admin/expiration-alerts');
            const data = await res.json();
            if (res.ok) {
                setExpirationAlerts(data.alerts || []);
                if (data.alerts && data.alerts.length > 0 && !showAlertModal) {
                    setShowAlertModal(true);
                }
            }
        } catch (err) {
            console.error('Failed to fetch expiration alerts:', err);
        }
    };

    // Dismiss single alert
    const dismissAlert = async (alertId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/admin/expiration-alerts/${alertId}`, { method: 'DELETE' });
            if (res.ok) {
                setExpirationAlerts(prev => prev.filter(a => a.alert_id !== alertId));
                if (expirationAlerts.length === 1) setShowAlertModal(false);
            }
        } catch (err) {
            console.error('Error dismissing alert:', err);
        }
    };

    // Dismiss all alerts
    const dismissAllAlerts = async () => {
        for (const alert of expirationAlerts) {
            await fetch(`http://localhost:5000/api/admin/expiration-alerts/${alert.alert_id}`, { method: 'DELETE' });
        }
        setExpirationAlerts([]);
        setShowAlertModal(false);
    };

    // Open assign modal
    const handleAssignClick = (offerId, alertId, foodName, expiryDate) => {
        const expiryDateObj = new Date(expiryDate);
        const formattedExpiry = expiryDateObj.toLocaleString();
        setSelectedOffer({ offerId, alertId, foodName, expiryDate: formattedExpiry });
        setSelectedVolunteerId('');
        setRequestMessage(`Are you available to take this offer? It expires on ${formattedExpiry}`);
        setShowRequestModal(true);
    };

    // Send request to volunteer
    const sendAssignmentRequest = async () => {
        if (!selectedVolunteerId) {
            alert('Please select a volunteer.');
            return;
        }
        setSendingRequest(true);
        try {
            // Get admin ID from localStorage
            const userStr = localStorage.getItem('feedhope_user');
            const adminUser = userStr ? JSON.parse(userStr) : null;
            const adminId = adminUser?.admin_id || null;

            const res = await fetch('http://localhost:5000/api/admin/request-volunteer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    offerId: selectedOffer.offerId,
                    volunteerUserId: selectedVolunteerId,
                    message: requestMessage,
                    adminId: adminId
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert('Request sent to volunteer!');
            window.dispatchEvent(new Event('notification-read'));
            setShowRequestModal(false);
            // Do NOT dismiss the alert – it stays until volunteer accepts
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSendingRequest(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchExpirationAlerts();
        fetchVolunteers();
    }, []);

    useEffect(() => {
        fetchTrend(trendFilter);
    }, [trendFilter]);

    // Real-time: silently re-fetch stats / volunteers / alerts / trend every 3s
    // (no loading flicker — bypasses the loading-toggling fetch helpers above).
    useEffect(() => {
        const silentRefresh = async () => {
            try {
                const [statsRes, volRes, alertsRes, trendRes] = await Promise.all([
                    fetch('http://localhost:5000/api/admin/dashboard/stats'),
                    fetch('http://localhost:5000/api/admin/volunteers'),
                    fetch('http://localhost:5000/api/admin/expiration-alerts'),
                    fetch(`http://localhost:5000/api/admin/dashboard/trends?filter=${encodeURIComponent(trendFilter)}`)
                ]);
                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data.stats);
                    setPieData(data.userDistribution || []);
                    setActivity(data.recentActivity || []);
                }
                if (volRes.ok) {
                    const data = await volRes.json();
                    setVolunteers(data.volunteers || []);
                }
                if (alertsRes.ok) {
                    const data = await alertsRes.json();
                    setExpirationAlerts(data.alerts || []);
                }
                if (trendRes.ok) {
                    const data = await trendRes.json();
                    setTrendData(data.trends || []);
                }
            } catch {}
        };
        const interval = setInterval(silentRefresh, 30000);
        return () => clearInterval(interval);
    }, [trendFilter]);

    const totalDonationsKg = stats?.total_donations_kg   ?? 0;
    const activeVolunteers = stats?.active_volunteers     ?? 0;
    const pendingRequests  = stats?.pending_requests      ?? 0;
    const mealsDelivered   = stats?.meals_delivered        ?? 0;

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    return (
        <div className="adsh-layout">
            <AdminSidebar onLogout={handleLogout} activePage="dashboard" />

            <main className="adsh-main">
                <div className="adsh-content-wrapper">

                    {/* Banner */}
                    <div className="adsh-banner">
                        <div className="adsh-banner-text">
                            <h1 className="adsh-banner-title">Dashboard Overview</h1>
                            <p className="adsh-banner-subtitle">
                                Welcome back, here's what's happening with food donations today
                            </p>
                        </div>
                        <div className="adsh-banner-date">
                            <CalendarTodayIcon sx={{ fontSize: 16 }} />
                            {todayFormatted()}
                        </div>
                    </div>

                    {/* ── AI Summary card (Gemini 2.0 Flash) ──────────────── */}
                    <div style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '18px 22px',
                        marginBottom: 22,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            marginBottom: aiSummary || aiSummaryError || aiSummaryLoading ? 14 : 0,
                            flexWrap: 'wrap',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8,
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <AutoAwesomeIcon sx={{ fontSize: 18 }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                                        AI Summary
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748b' }}>
                                        Powered by Gemini 2.0 Flash — reads from live offer + delivery data
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {['today', 'this_week', 'this_month'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => handleSummarize(r)}
                                        disabled={aiSummaryLoading}
                                        style={{
                                            padding: '8px 14px',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            borderRadius: 8,
                                            cursor: aiSummaryLoading ? 'not-allowed' : 'pointer',
                                            border: '1px solid',
                                            borderColor: aiSummaryRange === r && aiSummary ? '#6366f1' : '#e2e8f0',
                                            background: aiSummaryRange === r && aiSummary ? '#eef2ff' : '#fff',
                                            color: aiSummaryRange === r && aiSummary ? '#4338ca' : '#475569',
                                            opacity: aiSummaryLoading ? 0.6 : 1,
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        {aiSummary && aiSummaryRange === r && (
                                            <RefreshIcon sx={{ fontSize: 14 }} />
                                        )}
                                        {r === 'today' ? 'Summarize Today'
                                         : r === 'this_week' ? 'This Week'
                                         : 'This Month'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {aiSummaryLoading && (
                            <div style={{
                                padding: '14px 0', display: 'flex', alignItems: 'center', gap: 10,
                                color: '#6366f1', fontSize: 14,
                            }}>
                                <span className="adsh-spinner" style={{
                                    width: 14, height: 14, borderRadius: '50%',
                                    border: '2px solid #c7d2fe', borderTopColor: '#6366f1',
                                    animation: 'spin 0.8s linear infinite',
                                }} />
                                Analyzing your data with Gemini…
                            </div>
                        )}

                        {!aiSummaryLoading && aiSummaryError && (
                            <div style={{
                                padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                                borderRadius: 8, color: '#991b1b', fontSize: 14,
                            }}>
                                {aiSummaryError}
                            </div>
                        )}

                        {!aiSummaryLoading && !aiSummaryError && aiSummary && (
                            <div>
                                <p style={{
                                    margin: 0, color: '#1e293b', fontSize: 14.5, lineHeight: 1.65,
                                    whiteSpace: 'pre-wrap',
                                }}>
                                    {aiSummary}
                                </p>
                                {aiSummaryAt && (
                                    <div style={{ marginTop: 10, fontSize: 11.5, color: '#94a3b8' }}>
                                        Generated {new Date(aiSummaryAt).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <style>{`
                        @keyframes spin { to { transform: rotate(360deg); } }
                    `}</style>

                    {/* Expiration Alerts Modal */}
                    {showAlertModal && expirationAlerts.length > 0 && (
                        <div className="adsh-modal-overlay" onClick={() => setShowAlertModal(false)}>
                            <div
                                className="adsh-modal adsh-modal--danger"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="adsh-modal-header">
                                    <h3>⚠️ Expiration Alerts</h3>
                                    <button className="adsh-modal-close" onClick={() => setShowAlertModal(false)}>×</button>
                                </div>
                                <div className="adsh-modal-body">
                                    <p>The following food offers are about to expire and still have no volunteer assigned:</p>
                                    <ul>
                                        {expirationAlerts.map(alert => {
                                            const acceptedByReceiver =
                                                alert.offer_status === 'accepted' && !!alert.receiver_id;
                                            return (
                                                <li key={alert.alert_id}>
                                                    {alert.message}
                                                    {!acceptedByReceiver && (
                                                        <div style={{ marginTop: 6, fontSize: 12, color: '#b91c1c', fontStyle: 'italic' }}>
                                                            Waiting for a receiver to accept — a volunteer can be assigned only after that.
                                                        </div>
                                                    )}
                                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                                        <button
                                                            className="adsh-dismiss-btn"
                                                            onClick={() => dismissAlert(alert.alert_id)}
                                                        >
                                                            Dismiss
                                                        </button>
                                                        <button
                                                            className="adsh-assign-btn"
                                                            disabled={!acceptedByReceiver}
                                                            title={acceptedByReceiver
                                                                ? 'Send a request to a volunteer'
                                                                : 'A receiver must accept this offer first'}
                                                            style={!acceptedByReceiver ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                                                            onClick={() => acceptedByReceiver && handleAssignClick(
                                                                alert.offer_id,
                                                                alert.alert_id,
                                                                alert.food_name,
                                                                alert.expiration_date
                                                            )}
                                                        >
                                                            Assign to Volunteer
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                                <div className="adsh-modal-footer">
                                    <button className="adsh-dismiss-all-btn" onClick={dismissAllAlerts}>
                                        Dismiss All
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Persistent Red Alert Box */}
                    {expirationAlerts.length > 0 && (
                        <div className="adsh-alert-banner">
                            <div className="adsh-alert-icon">⚠️</div>
                            <div className="adsh-alert-content">
                                <strong>🚨 Expiration Alerts ({expirationAlerts.length})</strong>
                                <div className="adsh-alert-messages">
                                    {expirationAlerts.map(alert => {
                                        const acceptedByReceiver =
                                            alert.offer_status === 'accepted' && !!alert.receiver_id;
                                        return (
                                            <div key={alert.alert_id} className="adsh-alert-item">
                                                {alert.message}
                                                {!acceptedByReceiver && (
                                                    <span style={{ marginLeft: 8, fontStyle: 'italic', fontSize: 12 }}>
                                                        (waiting for receiver acceptance)
                                                    </span>
                                                )}
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => dismissAlert(alert.alert_id)}>✖</button>
                                                    <button
                                                        disabled={!acceptedByReceiver}
                                                        title={acceptedByReceiver
                                                            ? 'Send a request to a volunteer'
                                                            : 'A receiver must accept this offer first'}
                                                        style={!acceptedByReceiver ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                                                        onClick={() => acceptedByReceiver && handleAssignClick(
                                                            alert.offer_id,
                                                            alert.alert_id,
                                                            alert.food_name,
                                                            alert.expiration_date
                                                        )}
                                                    >
                                                        Assign
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button className="adsh-alert-dismiss-all" onClick={dismissAllAlerts}>
                                    Dismiss All
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Assign Request Modal (Volunteer selection + message) */}
                    {showRequestModal && selectedOffer && (
                        <div className="adsh-modal-overlay" onClick={() => setShowRequestModal(false)}>
                            <div className="adsh-modal" onClick={e => e.stopPropagation()}>
                                <div className="adsh-modal-header">
                                    <h3>Request Volunteer for "{selectedOffer.foodName}"</h3>
                                    <button className="adsh-modal-close" onClick={() => setShowRequestModal(false)}>×</button>
                                </div>
                                <div className="adsh-modal-body">
                                    <p>Select a volunteer:</p>
                                    <select
                                        className="adsh-select"
                                        value={selectedVolunteerId}
                                        onChange={e => setSelectedVolunteerId(e.target.value)}
                                        style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
                                    >
                                        <option value="">— Choose a volunteer —</option>
                                        {volunteers.map(v => (
                                            <option key={v.user_id} value={v.user_id}>
                                                {v.name} {v.phone ? `· ${v.phone}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <p>Message to volunteer:</p>
                                    <textarea
                                        className="adsh-textarea"
                                        rows="3"
                                        value={requestMessage}
                                        onChange={e => setRequestMessage(e.target.value)}
                                        style={{ width: '100%', padding: '8px' }}
                                    />
                                </div>
                                <div className="adsh-modal-footer">
                                    <button className="adsh-btn-cancel" onClick={() => setShowRequestModal(false)}>Cancel</button>
                                    <button className="adsh-btn-confirm" onClick={sendAssignmentRequest} disabled={sendingRequest}>
                                        {sendingRequest ? 'Sending...' : 'Send Request'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading / Error */}
                    {loading && (
                        <div className="adsh-loading-wrap">
                            <div className="adsh-spinner" />
                            <span>Loading dashboard…</span>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="adsh-error-wrap">
                            <p className="adsh-error-msg">{error}</p>
                            <button className="adsh-retry-btn" onClick={fetchStats}>Retry</button>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {/* Stats Cards */}
                            <div className="adsh-stats-row">
                                <div className="adsh-stat-card">
                                    <div className="adsh-stat-icon adsh-stat-icon--donations">
                                        <ScaleIcon sx={{ fontSize: 24 }} />
                                    </div>
                                    <div className="adsh-stat-info">
                                        <div className="adsh-stat-label">Total Donations</div>
                                        <div className="adsh-stat-count">
                                            {Number(totalDonationsKg).toLocaleString()}
                                            <span className="adsh-stat-unit">kg</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="adsh-stat-card">
                                    <div className="adsh-stat-icon adsh-stat-icon--volunteers">
                                        <PeopleAltIcon sx={{ fontSize: 24 }} />
                                    </div>
                                    <div className="adsh-stat-info">
                                        <div className="adsh-stat-label">Active Volunteers</div>
                                        <div className="adsh-stat-count">
                                            {Number(activeVolunteers).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="adsh-stat-card">
                                    <div className="adsh-stat-icon adsh-stat-icon--pending">
                                        <PendingActionsIcon sx={{ fontSize: 24 }} />
                                    </div>
                                    <div className="adsh-stat-info">
                                        <div className="adsh-stat-label">Pending Requests</div>
                                        <div className="adsh-stat-count">
                                            {Number(pendingRequests).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="adsh-stat-card">
                                    <div className="adsh-stat-icon adsh-stat-icon--meals">
                                        <LocalDiningIcon sx={{ fontSize: 24 }} />
                                    </div>
                                    <div className="adsh-stat-info">
                                        <div className="adsh-stat-label">Meals Delivered</div>
                                        <div className="adsh-stat-count">
                                            {Number(mealsDelivered).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="adsh-charts-row">
                                {/* Pie Chart */}
                                <div className="adsh-card adsh-card--pie">
                                    <div className="adsh-card-header">
                                        <h2 className="adsh-card-title">User Distribution</h2>
                                    </div>
                                    <div className="adsh-pie-wrap">
                                        {pieData.length > 0 ? (
                                            <>
                                                <ResponsiveContainer width="100%" height={220}>
                                                    <PieChart>
                                                        <Pie
                                                            data={pieData}
                                                            cx="50%"
                                                            cy="50%"
                                                            outerRadius={90}
                                                            innerRadius={40}
                                                            dataKey="value"
                                                            labelLine={false}
                                                            label={renderPieLabel}
                                                        >
                                                            {pieData.map((entry) => (
                                                                <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#999'} />
                                                            ))}
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="adsh-pie-legend">
                                                    {pieData.map((entry) => {
                                                        const total = pieData.reduce((s, d) => s + d.value, 0);
                                                        const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
                                                        return (
                                                            <div key={entry.name} className="adsh-legend-item">
                                                                <FiberManualRecordIcon sx={{ fontSize: 12, color: PIE_COLORS[entry.name] || '#999' }} />
                                                                <span className="adsh-legend-label">{entry.name}</span>
                                                                <span className="adsh-legend-val">
                                                                    {entry.value.toLocaleString()} <em>({pct}%)</em>
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="adsh-chart-empty">No user data available.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Trend Chart */}
                                <div className="adsh-card adsh-card--trend">
                                    <div className="adsh-card-header adsh-card-header--row">
                                        <div>
                                            <h2 className="adsh-card-title">Donation Trends</h2>
                                            <p className="adsh-card-subtitle">Monthly overview of received food</p>
                                        </div>
                                        <div className="adsh-trend-filters">
                                            {TREND_FILTERS.map(f => (
                                                <button
                                                    key={f}
                                                    className={`adsh-filter-btn ${trendFilter === f ? 'adsh-filter-btn--active' : ''}`}
                                                    onClick={() => setTrendFilter(f)}
                                                >
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="adsh-trend-wrap">
                                        {trendLoading ? (
                                            <div className="adsh-chart-empty">Loading…</div>
                                        ) : trendData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={220}>
                                                <AreaChart data={trendData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="adshGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#546e7a" stopOpacity={0.25} />
                                                            <stop offset="95%" stopColor="#546e7a" stopOpacity={0.02} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} unit=" kg" />
                                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13 }} formatter={(v) => [`${v} kg`, 'Donations']} />
                                                    <Area type="monotone" dataKey="value" stroke="#546e7a" strokeWidth={2.5} fill="url(#adshGrad)" dot={{ r: 3, fill: '#546e7a' }} activeDot={{ r: 5 }} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="adsh-chart-empty">No trend data for this period.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity Table */}
                            <div className="adsh-card adsh-card--activity">
                                <div className="adsh-card-header">
                                    <h2 className="adsh-card-title">Recent Activity</h2>
                                    <p className="adsh-card-subtitle">Latest user registrations & actions</p>
                                </div>
                                <div className="adsh-table-wrap">
                                    {activity.length === 0 ? (
                                        <div className="adsh-chart-empty adsh-chart-empty--table">No recent activity yet.</div>
                                    ) : (
                                        <table className="adsh-table">
                                            <thead>
                                                <tr><th>User</th><th>Role</th><th>Action</th><th>Status</th><th>Time</th></tr>
                                            </thead>
                                            <tbody>
                                                {activity.map((row, i) => {
                                                    const rc = ROLE_COLOR[row.role] || { bg: '#f5f5f5', text: '#555', dot: '#aaa' };
                                                    const sc = STATUS_COLOR[row.status?.toLowerCase()] || { bg: '#f5f5f5', text: '#888' };
                                                    const initials = (row.name || '?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
                                                    return (
                                                        <tr key={i}>
                                                            <td>
                                                                <div className="adsh-user-cell">
                                                                    {row.profile_picture ? (
                                                                        <img src={`http://localhost:5000${row.profile_picture}`} alt={row.name} className="adsh-avatar" />
                                                                    ) : (
                                                                        <div className="adsh-avatar-letter" style={{ background: rc.dot }}>{initials}</div>
                                                                    )}
                                                                    <span className="adsh-user-name">{row.name}</span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className="adsh-role-badge" style={{ background: rc.bg, color: rc.text }}>
                                                                    <FiberManualRecordIcon sx={{ fontSize: 8, mr: '4px', color: rc.dot }} />
                                                                    {row.role}
                                                                </span>
                                                            </td>
                                                            <td className="adsh-action-cell">{row.action || 'Account Created'}</td>
                                                            <td>
                                                                <span className="adsh-status-badge" style={{ background: sc.bg, color: sc.text }}>
                                                                    {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : '—'}
                                                                </span>
                                                            </td>
                                                            <td className="adsh-time-cell">{timeAgo(row.created_at)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Role-aware AI assistant */}
            <DashboardChatbot role="Admin" />
        </div>
    );
};

export default AdminDashboard;
