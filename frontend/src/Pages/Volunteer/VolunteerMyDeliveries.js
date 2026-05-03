// ============================================================
//  FeedHope — Volunteer My Deliveries Page
//  Lists every Delivery row owned by the logged-in volunteer.
//  Status flow handled here:
//    delivery_accepted  ──▶  in_delivery  ──▶  delivered
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import MapModal from '../../Components/Shared/MapModal';
import '../../Styles/Volunteer/VolunteerDashboard.css';
import '../../Styles/Volunteer/VolunteerMyDeliveries.css';

// MUI Icons
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HistoryIcon from '@mui/icons-material/History';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MapIcon from '@mui/icons-material/Map';

const API_BASE = 'http://localhost:5000';

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

// Map a delivery_status to display info
const getStatusInfo = (status) => {
    switch (status) {
        case 'delivery_accepted':
            return { class: 'status-pending', text: 'Ready for Pickup', icon: '⏳' };
        case 'in_delivery':
            return { class: 'status-transit', text: 'In Delivery', icon: '🚚' };
        case 'delivered':
            return { class: 'status-delivered', text: 'Delivered', icon: '✅' };
        default:
            return { class: 'status-pending', text: status || 'Pending', icon: '⏳' };
    }
};

const VolunteerMyDeliveries = () => {
    const navigate = useNavigate();

    const [user] = useState(() => {
        const raw = localStorage.getItem('feedhope_user');
        return raw ? JSON.parse(raw) : null;
    });

    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
    const [actingId, setActingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Completion modal (shown when volunteer clicks "Mark Delivered")
    const [completeTarget, setCompleteTarget] = useState(null); // delivery being completed
    const [completeNotes, setCompleteNotes] = useState('');
    const [completing, setCompleting] = useState(false);

    // Map modal target
    const [mapTarget, setMapTarget] = useState(null);

    const fetchDeliveries = useCallback(async () => {
        if (!user?.user_id) return;
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/api/volunteer/my-deliveries/${user.user_id}`);
            setDeliveries(res.data.deliveries || []);
        } catch (err) {
            console.error('Failed to load deliveries:', err);
            setErrorMessage('Failed to load your deliveries. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user?.user_id]);

    useEffect(() => {
        if (!user) {
            navigate('/signin');
            return;
        }
        fetchDeliveries();
    }, [fetchDeliveries, navigate, user]);

    // Real-time: silently re-fetch every 3s so admin assignments and status
    // changes reflect without a manual refresh.
    useEffect(() => {
        if (!user?.user_id) return;
        const silentRefresh = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/volunteer/my-deliveries/${user.user_id}`);
                setDeliveries(res.data.deliveries || []);
            } catch {}
        };
        const interval = setInterval(silentRefresh, 3000);
        return () => clearInterval(interval);
    }, [user?.user_id]);

    const flashSuccess = (msg) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 3500);
    };

    const handleStartDelivery = async (deliveryId) => {
        setActingId(deliveryId);
        setErrorMessage('');
        try {
            await axios.put(`${API_BASE}/api/volunteer/deliveries/${deliveryId}/start`, {
                userId: user.user_id
            });
            flashSuccess('Delivery started — you\'re on the way!');
            await fetchDeliveries();
        } catch (err) {
            console.error('Start delivery failed:', err);
            setErrorMessage(err.response?.data?.error || 'Failed to start delivery.');
        } finally {
            setActingId(null);
        }
    };

    const openCompleteModal = (delivery) => {
        setCompleteTarget(delivery);
        setCompleteNotes('');
        setErrorMessage('');
    };

    const closeCompleteModal = () => {
        if (completing) return;
        setCompleteTarget(null);
        setCompleteNotes('');
    };

    const handleConfirmComplete = async () => {
        if (!completeTarget) return;
        setCompleting(true);
        setActingId(completeTarget.delivery_id);
        setErrorMessage('');
        try {
            await axios.put(`${API_BASE}/api/volunteer/deliveries/${completeTarget.delivery_id}/complete`, {
                userId: user.user_id,
                notes: completeNotes.trim() || null
            });
            flashSuccess('Delivery marked as delivered. Great job!');
            setCompleteTarget(null);
            setCompleteNotes('');
            await fetchDeliveries();
        } catch (err) {
            console.error('Mark delivered failed:', err);
            setErrorMessage(err.response?.data?.error || 'Failed to mark as delivered.');
        } finally {
            setCompleting(false);
            setActingId(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        localStorage.removeItem('volunteer_user');
        navigate('/signin');
    };

    // Active = anything not yet 'delivered'. History = 'delivered'.
    const isActive = (d) => d.delivery_status !== 'delivered';
    const isHistory = (d) => d.delivery_status === 'delivered';

    const filteredDeliveries = deliveries.filter(d => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
            (d.food_name || '').toLowerCase().includes(search) ||
            (d.donor_name || '').toLowerCase().includes(search) ||
            (d.receiver_name || '').toLowerCase().includes(search);
        const matchesTab = activeTab === 'active' ? isActive(d) : isHistory(d);
        return matchesSearch && matchesTab;
    });

    const activeCount = deliveries.filter(isActive).length;
    const historyCount = deliveries.filter(isHistory).length;

    return (
        <div className="vao-accepted-layout">
            <VolunteerSidebar user={user} onLogout={handleLogout} activePage="my-deliveries" />

            <main className="vao-accepted-main">
                {/* Header Banner */}
                <div className="vao-accepted-header">
                    <div className="vao-accepted-header-text">
                        <h1 className="vao-accepted-title">My Deliveries</h1>
                        <p className="vao-accepted-subtitle">Track and update your active deliveries</p>
                    </div>
                </div>

                {/* Stats Overview Cards */}
                <div className="vao-accepted-stats">
                    <div className="vao-stat-card-mini">
                        <div className="vao-stat-mini-icon blue">
                            <LocalShippingIcon />
                        </div>
                        <div className="vao-stat-mini-info">
                            <span className="vao-stat-mini-number">{activeCount}</span>
                            <span className="vao-stat-mini-label">Active Deliveries</span>
                        </div>
                    </div>
                    <div className="vao-stat-card-mini">
                        <div className="vao-stat-mini-icon green">
                            <CheckCircleIcon />
                        </div>
                        <div className="vao-stat-mini-info">
                            <span className="vao-stat-mini-number">{historyCount}</span>
                            <span className="vao-stat-mini-label">Completed</span>
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="vao-accepted-success">
                        <CheckCircleIcon /> {successMessage}
                    </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                    <div className="vao-accepted-success" style={{ background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }}>
                        <ErrorOutlineIcon /> {errorMessage}
                    </div>
                )}

                {/* Tabs */}
                <div className="vao-accepted-tabs">
                    <button
                        className={`vao-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveTab('active')}
                    >
                        <AssignmentIcon style={{ fontSize: 18 }} />
                        Active Deliveries ({activeCount})
                    </button>
                    <button
                        className={`vao-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <HistoryIcon style={{ fontSize: 18 }} />
                        History ({historyCount})
                    </button>
                </div>

                {/* Search Bar */}
                <div className="vao-accepted-search">
                    <div className="vao-accepted-search-wrapper">
                        <SearchIcon className="vao-accepted-search-icon" />
                        <input
                            type="text"
                            placeholder="Search users, donations, or deliveries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="vao-accepted-search-input"
                        />
                    </div>
                </div>

                {/* Deliveries Table */}
                {loading ? (
                    <div className="vao-accepted-empty">
                        <p>Loading your deliveries…</p>
                    </div>
                ) : filteredDeliveries.length === 0 ? (
                    <div className="vao-accepted-empty">
                        <p>No {activeTab === 'active' ? 'active' : 'completed'} deliveries found.</p>
                        {activeTab === 'active' && (
                            <button onClick={() => navigate('/volunteer-available-offers')}>
                                Browse Available Offers
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="vao-accepted-table-container">
                        <table className="vao-accepted-table">
                            <thead>
                                <tr>
                                    <th>Offer</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Distance</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDeliveries.map(delivery => {
                                    const statusInfo = getStatusInfo(delivery.delivery_status);
                                    const busy = actingId === delivery.delivery_id;
                                    return (
                                        <tr key={delivery.delivery_id}>
                                            <td className="offer-cell">
                                                <div className="offer-title">{delivery.food_name}</div>
                                                <div className="offer-meta">
                                                    {delivery.quantity_by_kg && (
                                                        <span><Inventory2Icon style={{ fontSize: 12 }} /> {delivery.quantity_by_kg} KG</span>
                                                    )}
                                                    {delivery.pickup_time && (
                                                        <span><AccessTimeIcon style={{ fontSize: 12 }} /> {formatDate(delivery.pickup_time)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="party-info">
                                                    <strong>{delivery.donor_name}</strong>
                                                    <small><LocationOnIcon style={{ fontSize: 12 }} /> {delivery.donor_address || '—'}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="party-info">
                                                    <strong>{delivery.receiver_name || '—'}</strong>
                                                    <small><LocationOnIcon style={{ fontSize: 12 }} /> {delivery.receiver_address || '—'}</small>
                                                </div>
                                            </td>
                                            <td className="distance-cell">
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                                                    <span>{delivery.distance_km != null ? `${delivery.distance_km} km` : '—'}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMapTarget(delivery)}
                                                        style={{
                                                            background: 'transparent', border: 'none',
                                                            color: '#1976d2', padding: 0, cursor: 'pointer',
                                                            fontSize: 12, display: 'inline-flex',
                                                            alignItems: 'center', gap: 4
                                                        }}
                                                        title="See pickup & drop-off on a map"
                                                    >
                                                        <MapIcon style={{ fontSize: 14 }} /> View map
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="status-cell">
                                                <span className={`status-badge ${statusInfo.class}`}>
                                                    {statusInfo.icon} {statusInfo.text}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                {delivery.delivery_status === 'delivery_accepted' && (
                                                    <button
                                                        className="mark-delivered-btn"
                                                        style={{ background: '#2563eb' }}
                                                        onClick={() => handleStartDelivery(delivery.delivery_id)}
                                                        disabled={busy}
                                                    >
                                                        <PlayArrowIcon style={{ fontSize: 14, marginRight: 4 }} />
                                                        {busy ? 'Starting…' : 'Start Delivery'}
                                                    </button>
                                                )}
                                                {delivery.delivery_status === 'in_delivery' && (
                                                    <button
                                                        className="mark-delivered-btn"
                                                        onClick={() => openCompleteModal(delivery)}
                                                        disabled={busy}
                                                    >
                                                        {busy ? 'Processing…' : 'Mark Delivered'}
                                                    </button>
                                                )}
                                                {delivery.delivery_status === 'delivered' && (
                                                    <div className="completed-badge">
                                                        <CheckCircleIcon style={{ fontSize: 16 }} />
                                                        <span>Complete</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Mark-as-Delivered Modal (notes are optional) */}
                {completeTarget && (
                    <div className="vao-modal-overlay" onClick={closeCompleteModal}>
                        <div className="vao-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="vao-modal-header">
                                <h3>Mark Delivery as Delivered</h3>
                                <button
                                    className="vao-modal-close"
                                    onClick={closeCompleteModal}
                                    disabled={completing}
                                >×</button>
                            </div>
                            <div className="vao-modal-body">
                                <p style={{ margin: '0 0 14px 0', color: '#475569', fontSize: 14 }}>
                                    You're about to mark <strong>{completeTarget.food_name}</strong> as delivered to{' '}
                                    <strong>{completeTarget.receiver_name || 'the receiver'}</strong>.
                                </p>
                                <label className="vao-form-label">
                                    Delivery Notes <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                                    <textarea
                                        className="vao-form-textarea"
                                        rows="4"
                                        placeholder="e.g. Mission completed, handed to staff at reception, all items in good condition…"
                                        value={completeNotes}
                                        onChange={(e) => setCompleteNotes(e.target.value)}
                                        disabled={completing}
                                        maxLength={500}
                                    />
                                </label>
                                <small style={{ color: '#94a3b8', fontSize: 12 }}>
                                    {completeNotes.length}/500 characters
                                </small>
                            </div>
                            <div className="vao-modal-footer">
                                <button
                                    className="vao-modal-cancel"
                                    onClick={closeCompleteModal}
                                    disabled={completing}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="vao-modal-submit"
                                    onClick={handleConfirmComplete}
                                    disabled={completing}
                                >
                                    {completing ? 'Submitting…' : 'Confirm Delivery'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            <MapModal
                open={!!mapTarget}
                onClose={() => setMapTarget(null)}
                foodName={mapTarget?.food_name}
                donor={{
                    name: mapTarget?.donor_name,
                    address: mapTarget?.donor_address,
                    lat: mapTarget?.donor_lat,
                    lon: mapTarget?.donor_lon
                }}
                receiver={{
                    name: mapTarget?.receiver_name,
                    address: mapTarget?.receiver_address,
                    lat: mapTarget?.receiver_lat,
                    lon: mapTarget?.receiver_lon
                }}
                distanceKm={mapTarget?.distance_km}
            />
        </div>
    );
};

export default VolunteerMyDeliveries;
