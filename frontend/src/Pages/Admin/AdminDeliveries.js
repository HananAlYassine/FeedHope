// ============================================================
//  FeedHope — Omar & Hanan — Pages/Admin/AdminDeliveries.js
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import DashboardChatbot from '../../Components/Shared/DashboardChatbot';
import '../../Styles/Admin/AdminDeliveries.css';

// MUI icons used throughout the page
import SearchIcon        from '@mui/icons-material/Search';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

// ── Helpers ───────────────────────────────────────────────────

// Returns today's date formatted as "Wednesday, 30 April 2025"
const todayFormatted = () =>
    new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

// Maps a delivery status key to its badge CSS class and display label
const STATUS_MAP = {
    pending_pickup: { label: 'Pending Pickup', cls: 'adl-badge--pending'   },
    in_delivery:    { label: 'In Delivery',    cls: 'adl-badge--transit'   },
    delivered:      { label: 'Delivered',      cls: 'adl-badge--delivered' },
    completed:      { label: 'Completed',      cls: 'adl-badge--completed' },
    cancelled:      { label: 'Cancelled',      cls: 'adl-badge--cancelled' },
};

// ── Main Component ────────────────────────────────────────────
const AdminDeliveries = () => {
    const navigate = useNavigate();

    // ── State ────────────────────────────────────────────────
    const [deliveries,    setDeliveries]    = useState([]);   // all delivery records from the API
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [search,        setSearch]        = useState('');   // text in the search box
    const [filterStatus,  setFilterStatus]  = useState('');   // selected dropdown status
    const [detailItem,    setDetailItem]    = useState(null); // delivery shown in the View Details modal
    const [toast,         setToast]         = useState(null); // { msg, type } — bottom-right notification

    // ── Fetch deliveries from the backend ────────────────────
    const fetchDeliveries = async () => {
        try {
            setLoading(true);
            setError(null);
            const res  = await fetch('http://localhost:5000/api/admin/deliveries');
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to load deliveries.'); return; }
            setDeliveries(data.deliveries || []);
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    // Run once on mount
    useEffect(() => { fetchDeliveries(); }, []);

    // Real-time: silently re-fetch every 3s so volunteer-driven status
    // changes appear without a manual refresh.
    useEffect(() => {
        const silentRefresh = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/admin/deliveries');
                if (!res.ok) return;
                const data = await res.json();
                setDeliveries(data.deliveries || []);
            } catch {}
        };
        const interval = setInterval(silentRefresh, 3000);
        return () => clearInterval(interval);
    }, []);

    // ── Toast helper: show a notification for 3 seconds ─────
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };


    // ── LOGOUT — clears session/localStorage and redirects to login ─
    // This is a real logout, not just a navigation action.
    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // ── Derived counts for the three stat cards ──────────────
    const countPending   = deliveries.filter(d => d.status === 'pending_pickup').length;
    const countTransit   = deliveries.filter(d => d.status === 'in_delivery').length;
    const countDelivered = deliveries.filter(d => d.status === 'delivered' || d.status === 'completed').length;

    // ── Filter deliveries by search text and selected status ─
    const filtered = deliveries.filter(d => {
        const q = search.toLowerCase();
        const matchSearch =
            !q ||
            (d.food_name     || '').toLowerCase().includes(q) ||
            (d.donor_name    || '').toLowerCase().includes(q) ||
            (d.receiver_name || '').toLowerCase().includes(q) ||
            (d.volunteer_name|| '').toLowerCase().includes(q);

        const matchStatus = !filterStatus || d.status === filterStatus;

        return matchSearch && matchStatus;
    });

    // ── Render volunteer cell: photo → letter avatar → "Unassigned" ─
    const renderVolunteer = (delivery) => {
        if (!delivery.volunteer_name) {
            // No volunteer has taken this offer yet
            return <span className="adl-unassigned">Unassigned</span>;
        }

        return (
            <div className="adl-volunteer-cell">
                {delivery.volunteer_profile_photo ? (
                    // Show the volunteer's actual profile photo
                    <img
                      src={`http://localhost:5000${delivery.volunteer_profile_photo}`}
                      alt={delivery.volunteer_name}
                      className="adl-avatar"
                    />
                ) : (
                    // Fallback: first letter of the volunteer's name in a circle
                    <div className="adl-avatar-letter">
                        {delivery.volunteer_name.charAt(0).toUpperCase()}
                    </div>
                )}
                <span>{delivery.volunteer_name}</span>
            </div>
        );
    };

    // ── Render status badge ───────────────────────────────────
    const renderBadge = (status) => {
        const s = STATUS_MAP[status] || { label: status, cls: '' };
        return <span className={`adl-badge ${s.cls}`}>{s.label}</span>;
    };

    // ── JSX ──────────────────────────────────────────────────
    return (
        <div className="adl-layout">
            {/* Sidebar — pass the real logout handler so the button works */}
            <AdminSidebar onLogout={handleLogout} activePage="deliveries"/>

            <main className="adl-main">
                <div className="adl-content-wrapper">

                    {/* ── Banner ─────────────────────────────────────── */}
                    <div className="adl-banner">
                        <div className="adl-banner-text">
                            <div className="adl-banner-title">Deliveries</div>
                            <div className="adl-banner-subtitle">
                                Track and manage all food deliveries
                            </div>
                        </div>
                        {/* Today's date shown on the right side */}
                        <div className="adl-banner-date">
                            <CalendarTodayIcon sx={{ fontSize: 16 }} />
                            {todayFormatted()}
                        </div>
                    </div>

                    {/* ── Stats Row (Pending / In Transit / Delivered) ── */}
                    <div className="adl-stats-row">

                        {/* Pending card */}
                        <div className="adl-stat-card">
                            <div className="adl-stat-icon adl-stat-icon--pending">
                                <HourglassEmptyIcon sx={{ fontSize: 22 }} />
                            </div>
                            <div className="adl-stat-info">
                                <div className="adl-stat-label">Pending</div>
                                <div className="adl-stat-count">{countPending}</div>
                            </div>
                        </div>

                        {/* In Transit card */}
                        <div className="adl-stat-card">
                            <div className="adl-stat-icon adl-stat-icon--transit">
                                <LocalShippingIcon sx={{ fontSize: 22 }} />
                            </div>
                            <div className="adl-stat-info">
                                <div className="adl-stat-label">In Transit</div>
                                <div className="adl-stat-count">{countTransit}</div>
                            </div>
                        </div>

                        {/* Delivered card */}
                        <div className="adl-stat-card">
                            <div className="adl-stat-icon adl-stat-icon--delivered">
                                <CheckCircleIcon sx={{ fontSize: 22 }} />
                            </div>
                            <div className="adl-stat-info">
                                <div className="adl-stat-label">Delivered</div>
                                <div className="adl-stat-count">{countDelivered}</div>
                            </div>
                        </div>

                    </div>

                    {/* ── Table Card ─────────────────────────────────── */}
                    <div className="adl-card">

                        {/* Filter section label */}
                        <div className="adl-filters-header">
                            <span className="adl-filters-title">Filter by Deliveries</span>
                        </div>

                        {/* Search input + status dropdown */}
                        <div className="adl-filters">
                            <div className="adl-search-wrap">
                                <SearchIcon className="adl-search-icon" sx={{ fontSize: 18 }} />
                                <input
                                    type="text"
                                    className="adl-search"
                                    placeholder="Search by offer, donor, receiver or volunteer…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>

                            {/* Status filter dropdown */}
                            <select
                                className="adl-select"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Status</option>
                                <option value="pending_pickup">Pending Pickup</option>
                                <option value="in_delivery">In Delivery</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* ── Table content: loading / error / data ──── */}
                        {loading ? (
                            // Loading spinner placeholder
                            <div className="adl-loading-wrap">
                                <LocalShippingIcon sx={{ fontSize: 36, opacity: 0.3 }} />
                                <span>Loading deliveries…</span>
                            </div>
                        ) : error ? (
                            // Error state with retry button
                            <div className="adl-error-wrap">
                                <p className="adl-error-msg">{error}</p>
                                <button className="adl-retry-btn" onClick={fetchDeliveries}>
                                    Retry
                                </button>
                            </div>
                        ) : (
                            <div className="adl-table-wrap">
                                <table className="adl-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Offer</th>
                                            <th>From (Donor)</th>
                                            <th>To (Receiver)</th>
                                            <th>Volunteer</th>
                                            <th>Status</th>
                                            <th>Distance</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.length === 0 ? (
                                            // No results row
                                            <tr>
                                                <td colSpan={8} className="adl-empty">
                                                    No deliveries found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map((d, idx) => {
                                                return (
                                                    <tr key={d.delivery_id || idx}>
                                                        {/* Row number */}
                                                        <td>#{idx + 1}</td>

                                                        {/* Offer name */}
                                                        <td className="adl-td-title">
                                                            {d.food_name || '—'}
                                                        </td>

                                                        {/* Donor: name + address below */}
                                                        <td>
                                                            <div>{d.donor_name || '—'}</div>
                                                            <div className="adl-td-sub">
                                                                {d.donor_address || ''}
                                                            </div>
                                                        </td>

                                                        {/* Receiver: name + address below */}
                                                        <td>
                                                            <div>{d.receiver_name || '—'}</div>
                                                            <div className="adl-td-sub">
                                                                {d.receiver_address || ''}
                                                            </div>
                                                        </td>

                                                        {/* Volunteer: photo or letter or "Unassigned" */}
                                                        <td>{renderVolunteer(d)}</td>

                                                        {/* Status badge */}
                                                        <td>{renderBadge(d.status)}</td>

                                                        {/* Distance in km */}
                                                        <td>
                                                            {d.distance_km != null
                                                                ? `${d.distance_km} km`
                                                                : '—'}
                                                        </td>

                                                        {/* Action buttons */}
                                                        <td>
                                                            <div className="adl-action-btns">
                                                                {/* View Details button */}
                                                                <button
                                                                    className="adl-btn-view"
                                                                    onClick={() => setDetailItem(d)}
                                                                >
                                                                    <VisibilityIcon sx={{ fontSize: 14 }} />
                                                                    View Details
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {/* End table card */}

                </div>
            </main>
            {/* End main content */}

            {/* ════════════════════════════════════════════════
                VIEW DETAILS MODAL
                Shows all information about a single delivery
            ════════════════════════════════════════════════ */}
            {detailItem && (
                <div className="adl-modal-backdrop" onClick={() => setDetailItem(null)}>
                    <div className="adl-modal" onClick={e => e.stopPropagation()}>

                        {/* Modal header */}
                        <div className="adl-modal-header">
                            <div className="adl-modal-header-icon adl-modal-header-icon--info">
                                <VisibilityIcon sx={{ fontSize: 20 }} />
                            </div>
                            <h2>Delivery Details</h2>
                            <button
                                className="adl-modal-close"
                                onClick={() => setDetailItem(null)}
                            >✕</button>
                        </div>

                        {/* Modal body: key-value detail rows */}
                        <div className="adl-modal-body">
                            <div className="adl-detail-grid">
                                <div className="adl-detail-row">
                                    <span>Offer</span>
                                    <strong>{detailItem.food_name || '—'}</strong>
                                </div>
                                <div className="adl-detail-row">
                                    <span>Status</span>
                                    {renderBadge(detailItem.status)}
                                </div>
                                <div className="adl-detail-row">
                                    <span>Donor</span>
                                    <strong>{detailItem.donor_name || '—'}</strong>
                                </div>
                                <div className="adl-detail-row">
                                    <span>Donor Address</span>
                                    <strong>{detailItem.donor_address || '—'}</strong>
                                </div>
                                <div className="adl-detail-row">
                                    <span>Receiver</span>
                                    <strong>{detailItem.receiver_name || '—'}</strong>
                                </div>
                                <div className="adl-detail-row">
                                    <span>Receiver Address</span>
                                    <strong>{detailItem.receiver_address || '—'}</strong>
                                </div>
                                <div className="adl-detail-row">
                                    <span>Volunteer</span>
                                    <strong>{detailItem.volunteer_name || 'Unassigned'}</strong>
                                </div>
                                <div className="adl-detail-row">
                                    <span>Distance</span>
                                    <strong>
                                        {detailItem.distance_km != null
                                            ? `${detailItem.distance_km} km`
                                            : '—'}
                                    </strong>
                                </div>
                                <div className="adl-detail-row">
                                    <span>Picked Up At</span>
                                    <strong>
                                        {detailItem.pickup_time
                                            ? new Date(detailItem.pickup_time).toLocaleString()
                                            : '—'}
                                    </strong>
                                </div>
                                <div className="adl-detail-row">
                                    <span>Delivered At</span>
                                    <strong>
                                        {detailItem.delivered_time
                                            ? new Date(detailItem.delivered_time).toLocaleString()
                                            : '—'}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {/* Modal footer: close button */}
                        <div className="adl-modal-footer">
                            <button
                                className="adl-btn-confirm"
                                onClick={() => setDetailItem(null)}
                            >
                                Close
                            </button>
                        </div>

                    </div>
                </div>
            )}
            

            {/* ── Toast notification (bottom-right) ─────────────── */}
            {toast && (
                <div className={`adl-toast adl-toast--${toast.type}`}>
                    {toast.msg}
                </div>
            )}

        <DashboardChatbot role="Admin" />
            </div>
    );
};

export default AdminDeliveries;
