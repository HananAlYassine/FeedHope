// ============================================================
//  FeedHope — Omar & Hanan — Pages/Admin/AdminDashboard.js
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import '../../Styles/Admin/AdminDashboard.css';

// MUI icons
import CalendarTodayIcon     from '@mui/icons-material/CalendarToday';
import ScaleIcon             from '@mui/icons-material/Scale';
import PeopleAltIcon         from '@mui/icons-material/PeopleAlt';
import PendingActionsIcon    from '@mui/icons-material/PendingActions';
import LocalDiningIcon       from '@mui/icons-material/LocalDining';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

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

// Relative time string (e.g. "3 minutes ago")
const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

// Role badge colors matching the rest of the app
const ROLE_COLOR = {
    Donor:     { bg: '#fff3e0', text: '#e65100', dot: '#f59e0b' },
    Receiver:  { bg: '#e8f5e9', text: '#2e7d32', dot: '#43a047' },
    Volunteer: { bg: '#e3f2fd', text: '#1565c0', dot: '#1e88e5' },
};

// Pie chart palette
const PIE_COLORS = {
    Donor:     '#f59e0b',
    Receiver:  '#43a047',
    Volunteer: '#1e88e5',
};

// User status badge
const STATUS_COLOR = {
    active:   { bg: '#e8f5e9', text: '#2e7d32' },
    pending:  { bg: '#fff8e1', text: '#f59e0b' },
    verified: { bg: '#e8f5e9', text: '#2e7d32' },
    inactive: { bg: '#fafafa', text: '#888' },
    banned:   { bg: '#ffebee', text: '#c62828' },
};

// ── Custom Pie Label ──────────────────────────────────────────
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

// ── Trend filter options ──────────────────────────────────────
const TREND_FILTERS = ['Today', 'This Month', 'This Year', 'Last Year'];

// ── Main Component ────────────────────────────────────────────
const AdminDashboard = () => {
    const navigate = useNavigate();

    // ── State ────────────────────────────────────────────────
    const [stats,         setStats]         = useState(null);
    const [pieData,       setPieData]       = useState([]);
    const [trendData,     setTrendData]     = useState([]);
    const [activity,      setActivity]      = useState([]);
    const [trendFilter,   setTrendFilter]   = useState('This Month');
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [trendLoading,  setTrendLoading]  = useState(false);

    // ── Fetch dashboard stats ────────────────────────────────
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

    // ── Fetch trend data (changes with filter) ────────────────
    const fetchTrend = async (filter) => {
        try {
            setTrendLoading(true);
            const param = encodeURIComponent(filter);
            const res  = await fetch(`http://localhost:5000/api/admin/dashboard/trends?filter=${param}`);
            const data = await res.json();
            if (res.ok) setTrendData(data.trends || []);
        } catch {
            // silently ignore — chart stays empty
        } finally {
            setTrendLoading(false);
        }
    };

    // Run on mount
    useEffect(() => { fetchStats(); }, []);

    // Re-fetch trends whenever filter changes
    useEffect(() => { fetchTrend(trendFilter); }, [trendFilter]);

    // ── Derived values ───────────────────────────────────────
    const totalDonationsKg = stats?.total_donations_kg   ?? 0;
    const activeVolunteers = stats?.active_volunteers     ?? 0;
    const pendingRequests  = stats?.pending_requests      ?? 0;
    const mealsDelivered   = stats?.meals_delivered        ?? 0;

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // ── Render ───────────────────────────────────────────────
    return (
        <div className="adsh-layout">
            <AdminSidebar onLogout={handleLogout} activePage="dashboard" />

            <main className="adsh-main">
                <div className="adsh-content-wrapper">

                    {/* ══════════════════════════════════════
                        BANNER
                    ══════════════════════════════════════ */}
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

                    {/* ══════════════════════════════════════
                        LOADING / ERROR
                    ══════════════════════════════════════ */}
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
                            {/* ══════════════════════════════════════
                                STAT CARDS
                            ══════════════════════════════════════ */}
                            <div className="adsh-stats-row">

                                {/* 1 — Total Donations */}
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

                                {/* 2 — Active Volunteers */}
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

                                {/* 3 — Pending Requests */}
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

                                {/* 4 — Meals Delivered */}
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
                            {/* END STAT CARDS */}


                            {/* ══════════════════════════════════════
                                PIE CHART + TREND CHART (side by side)
                            ══════════════════════════════════════ */}
                            <div className="adsh-charts-row">

                                {/* ── Pie: User Distribution ─── */}
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
                                                                <Cell
                                                                    key={entry.name}
                                                                    fill={PIE_COLORS[entry.name] || '#999'}
                                                                />
                                                            ))}
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>

                                                {/* Legend */}
                                                <div className="adsh-pie-legend">
                                                    {pieData.map((entry) => {
                                                        const total = pieData.reduce((s, d) => s + d.value, 0);
                                                        const pct = total > 0
                                                            ? ((entry.value / total) * 100).toFixed(1)
                                                            : '0.0';
                                                        return (
                                                            <div key={entry.name} className="adsh-legend-item">
                                                                <FiberManualRecordIcon
                                                                    sx={{ fontSize: 12, color: PIE_COLORS[entry.name] || '#999' }}
                                                                />
                                                                <span className="adsh-legend-label">{entry.name}</span>
                                                                <span className="adsh-legend-val">
                                                                    {entry.value.toLocaleString()}
                                                                    <em> ({pct}%)</em>
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

                                {/* ── Area: Donation Trends ─── */}
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
                                                <AreaChart data={trendData}
                                                           margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="adshGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%"  stopColor="#546e7a" stopOpacity={0.25} />
                                                            <stop offset="95%" stopColor="#546e7a" stopOpacity={0.02} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                    <XAxis
                                                        dataKey="label"
                                                        tick={{ fontSize: 12, fill: '#888' }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                    />
                                                    <YAxis
                                                        tick={{ fontSize: 12, fill: '#888' }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        unit=" kg"
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            borderRadius: 8,
                                                            border: '1px solid #e0e0e0',
                                                            fontSize: 13,
                                                        }}
                                                        formatter={(v) => [`${v} kg`, 'Donations']}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke="#546e7a"
                                                        strokeWidth={2.5}
                                                        fill="url(#adshGrad)"
                                                        dot={{ r: 3, fill: '#546e7a' }}
                                                        activeDot={{ r: 5 }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="adsh-chart-empty">No trend data for this period.</div>
                                        )}
                                    </div>
                                </div>

                            </div>
                            {/* END CHARTS ROW */}


                            {/* ══════════════════════════════════════
                                RECENT ACTIVITY TABLE
                            ══════════════════════════════════════ */}
                            <div className="adsh-card adsh-card--activity">
                                <div className="adsh-card-header">
                                    <h2 className="adsh-card-title">Recent Activity</h2>
                                    <p className="adsh-card-subtitle">Latest user registrations & actions</p>
                                </div>

                                <div className="adsh-table-wrap">
                                    {activity.length === 0 ? (
                                        <div className="adsh-chart-empty adsh-chart-empty--table">
                                            No recent activity yet.
                                        </div>
                                    ) : (
                                        <table className="adsh-table">
                                            <thead>
                                                <tr>
                                                    <th>User</th>
                                                    <th>Role</th>
                                                    <th>Action</th>
                                                    <th>Status</th>
                                                    <th>Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activity.map((row, i) => {
                                                    const rc  = ROLE_COLOR[row.role]   || { bg: '#f5f5f5', text: '#555', dot: '#aaa' };
                                                    const sc  = STATUS_COLOR[row.status?.toLowerCase()] || { bg: '#f5f5f5', text: '#888' };
                                                    const initials = (row.name || '?')
                                                        .split(' ')
                                                        .slice(0, 2)
                                                        .map(w => w[0])
                                                        .join('')
                                                        .toUpperCase();

                                                    return (
                                                        <tr key={i}>
                                                            {/* User cell */}
                                                            <td>
                                                                <div className="adsh-user-cell">
                                                                    {row.profile_picture ? (
                                                                        <img
                                                                            src={`http://localhost:5000${row.profile_picture}`}
                                                                            alt={row.name}
                                                                            className="adsh-avatar"
                                                                        />
                                                                    ) : (
                                                                        <div className="adsh-avatar-letter"
                                                                             style={{ background: rc.dot }}>
                                                                            {initials}
                                                                        </div>
                                                                    )}
                                                                    <span className="adsh-user-name">{row.name}</span>
                                                                </div>
                                                            </td>

                                                            {/* Role badge */}
                                                            <td>
                                                                <span className="adsh-role-badge"
                                                                      style={{ background: rc.bg, color: rc.text }}>
                                                                    <FiberManualRecordIcon
                                                                        sx={{ fontSize: 8, mr: '4px', color: rc.dot }} />
                                                                    {row.role}
                                                                </span>
                                                            </td>

                                                            {/* Action */}
                                                            <td className="adsh-action-cell">
                                                                {row.action || 'Account Created'}
                                                            </td>

                                                            {/* Status badge */}
                                                            <td>
                                                                <span className="adsh-status-badge"
                                                                      style={{ background: sc.bg, color: sc.text }}>
                                                                    {row.status
                                                                        ? row.status.charAt(0).toUpperCase() + row.status.slice(1)
                                                                        : '—'}
                                                                </span>
                                                            </td>

                                                            {/* Time */}
                                                            <td className="adsh-time-cell">
                                                                {timeAgo(row.created_at)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                            {/* END RECENT ACTIVITY */}

                        </>
                    )}

                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
