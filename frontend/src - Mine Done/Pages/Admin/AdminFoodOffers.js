// ============================================================
//  FeedHope — Omar&Hanan — Pages/Admin/AdminFoodOffers.js
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import '../../Styles/Admin/AdminFoodOffers.css';

import SearchIcon           from '@mui/icons-material/Search';
import MoreVertIcon         from '@mui/icons-material/MoreVert';
import VisibilityIcon       from '@mui/icons-material/Visibility';
import DeliveryDiningIcon   from '@mui/icons-material/DeliveryDining';
import EventBusyIcon        from '@mui/icons-material/EventBusy';
import CancelIcon           from '@mui/icons-material/Cancel';
import RestaurantMenuIcon   from '@mui/icons-material/RestaurantMenu';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

// ── Helpers ──────────────────────────────────────────────────
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};

const todayFormatted = () => {
    return new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
};

const STATUS_BADGE = {
    available:  { label: 'Available',   cls: 'afo-badge--available'  },
    accepted:   { label: 'Accepted',    cls: 'afo-badge--accepted'   },
    in_delivery:{ label: 'In Delivery', cls: 'afo-badge--delivery'   },
    completed:  { label: 'Completed',   cls: 'afo-badge--completed'  },
    expired:    { label: 'Expired',     cls: 'afo-badge--expired'    },
    cancelled:  { label: 'Cancelled',   cls: 'afo-badge--cancelled'  },
};

// ── Main Component ────────────────────────────────────────────
const AdminFoodOffers = () => {
    const navigate = useNavigate();

    const [offers,          setOffers]          = useState([]);
    const [volunteers,      setVolunteers]       = useState([]);
    const [statuses,        setStatuses]         = useState([]);
    const [categories,      setCategories]       = useState([]);
    const [loading,         setLoading]          = useState(true);
    const [error,           setError]            = useState(null);
    const [search,          setSearch]           = useState('');
    const [filterStatus,    setFilterStatus]     = useState('');
    const [filterCategory,  setFilterCategory]   = useState('');
    const [openMenu,        setOpenMenu]         = useState(null);   // offer_id of open 3-dot menu
    const [menuPos,         setMenuPos]          = useState({});
    const [detailOffer,     setDetailOffer]      = useState(null);   // for View Details modal
    const [assignModal,     setAssignModal]      = useState(null);   // offer_id for assign modal
    const [selectedVol,     setSelectedVol]      = useState('');
    const [actionLoading,   setActionLoading]    = useState(false);
    const [toast,           setToast]            = useState(null);

    // ── Confirmation modal state (replaces window.confirm) ──────
    // confirmModal: { title, message, onConfirm, danger }
    const [confirmModal,    setConfirmModal]     = useState(null);

    const menuRef = useRef(null);

    // ── Load offers ─────────────────────────────────────────
    const fetchOffers = async () => {
        try {
            setLoading(true);
            const res  = await fetch('http://localhost:5000/api/admin/food-offers');
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to load offers.'); return; }
            setOffers(data.offers || []);
            setStatuses(data.statuses || []);
            setCategories(data.categories || []);
        } catch {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    // ── Load volunteers (for assign dropdown) ────────────────
    const fetchVolunteers = async () => {
        try {
            const res  = await fetch('http://localhost:5000/api/admin/volunteers');
            const data = await res.json();
            setVolunteers(data.volunteers || []);
        } catch { /* silently fail */ }
    };

    useEffect(() => {
        fetchOffers();
        fetchVolunteers();
    }, []);

    // Close 3-dot menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Helper: open a styled confirmation modal ─────────────
    // Returns a Promise that resolves to true (confirmed) or false (cancelled).
    const openConfirm = ({ title, message, danger = false }) =>
        new Promise((resolve) => {
            setConfirmModal({
                title,
                message,
                danger,
                onConfirm: () => { setConfirmModal(null); resolve(true);  },
                onCancel:  () => { setConfirmModal(null); resolve(false); },
            });
        });

    // ── 3-dot menu ──────────────────────────────────────────
    const handleMenuClick = (e, offerId) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX - 140 });
        setOpenMenu(prev => prev === offerId ? null : offerId);
    };

    // ── Action: View Details ─────────────────────────────────
    const handleViewDetails = (offer) => {
        setDetailOffer(offer);
        setOpenMenu(null);
    };

    // ── Action: Assign Volunteer ─────────────────────────────
    // Disabled when: the offer is already assigned (in_delivery), expired, or cancelled.
    const handleOpenAssign = (offerId) => {
        setAssignModal(offerId);
        setSelectedVol('');
        setOpenMenu(null);
    };

    const handleAssignSubmit = async () => {
        if (!selectedVol) return;
        setActionLoading(true);
        try {
            const res  = await fetch('http://localhost:5000/api/admin/food-offers/assign-volunteer', {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ offerId: assignModal, volunteerId: selectedVol }),
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Failed to assign.', 'error'); return; }
            showToast('Volunteer assigned successfully!');
            setAssignModal(null);
            fetchOffers();
        } catch {
            showToast('Network error.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Action: Mark Expired ─────────────────────────────────
    // Disabled when: the offer is already expired, cancelled, or has a volunteer assigned.
    const handleMarkExpired = async (offerId) => {
        setOpenMenu(null);

        // Use styled confirmation modal instead of window.confirm
        const confirmed = await openConfirm({
            title:   'Mark as Expired',
            message: 'Are you sure you want to mark this offer as expired?',
            danger:  false,
        });
        if (!confirmed) return;

        setActionLoading(true);
        try {
            const res  = await fetch(`http://localhost:5000/api/admin/food-offers/${offerId}/expire`, {
                method: 'PUT',
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Failed.', 'error'); return; }
            showToast('Offer marked as expired.');
            fetchOffers();
        } catch {
            showToast('Network error.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Action: Cancel Offer ─────────────────────────────────
    // Disabled when: the offer is already cancelled, expired, or has a volunteer assigned.
    const handleCancelOffer = async (offerId) => {
        setOpenMenu(null);

        // Use styled confirmation modal instead of window.confirm
        const confirmed = await openConfirm({
            title:   'Cancel Offer',
            message: 'Cancel this offer? This action cannot be undone.',
            danger:  true,
        });
        if (!confirmed) return;

        setActionLoading(true);
        try {
            const res  = await fetch(`http://localhost:5000/api/admin/food-offers/${offerId}/cancel`, {
                method: 'PUT',
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Failed.', 'error'); return; }
            showToast('Offer cancelled.');
            fetchOffers();
        } catch {
            showToast('Network error.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // ── Filter offers ────────────────────────────────────────
    const filtered = offers.filter(o => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
            (o.food_name   || '').toLowerCase().includes(q) ||
            (o.donor_name  || '').toLowerCase().includes(q);
        const matchStatus   = !filterStatus   || o.status   === filterStatus;
        const matchCategory = !filterCategory || o.category === filterCategory;
        return matchSearch && matchStatus && matchCategory;
    });

    // ── Loading / Error ──────────────────────────────────────
    if (loading) return (
        <div className="afo-loading-screen">
            <div className="afo-spinner" />
            <p>Loading food offers…</p>
        </div>
    );
    if (error) return (
        <div className="afo-error-screen">
            <p className="afo-error-msg">{error}</p>
            <button className="afo-retry-btn" onClick={fetchOffers}>Retry</button>
        </div>
    );

    return (
        <div className="afo-layout">
            <AdminSidebar onLogout={handleLogout} activePage="food-offers" />

            <main className="afo-main">

                {/* ── Banner ── */}
                <div className="afo-banner">
                    <div className="afo-banner-text">
                        <h1 className="afo-banner-title">Food Offers</h1>
                        <p className="afo-banner-subtitle">Monitor and manage all food donation offers</p>
                    </div>
                    <div className="afo-banner-date">
                        <CalendarTodayIcon sx={{ fontSize: 16 }} />
                            {todayFormatted()}
                    </div>
                </div>

                {/* ── Wrapper for content below banner ── */}
                <div className="afo-content-wrapper">
                    {/* ── Table Card ── */}
                    <div className="afo-card">

                        {/* ── Filters row ── */}
                        <div className="afo-filters">
                            <div className="afo-search-wrap">
                                <SearchIcon sx={{ fontSize: 18 }} className="afo-search-icon" />
                                <input
                                    className="afo-search"
                                    placeholder="Search offers or donor…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="afo-select"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Status</option>
                                {statuses.map(s => (
                                    <option key={s} value={s}>
                                        {STATUS_BADGE[s]?.label || s}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="afo-select"
                                value={filterCategory}
                                onChange={e => setFilterCategory(e.target.value)}
                            >
                                <option value="">All Category</option>
                                {categories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* ── Table ── */}
                        <div className="afo-table-wrap">
                            <table className="afo-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Donor</th>
                                        <th>Category</th>
                                        <th>Quantity</th>
                                        <th>Status</th>
                                        <th>Expiry</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="afo-empty">
                                                No offers match your filters.
                                            </td>
                                        </tr>
                                    ) : filtered.map(offer => {
                                        const badge = STATUS_BADGE[offer.status] || { label: offer.status, cls: '' };
                                        return (
                                            <tr key={offer.offer_id}>
                                                <td className="afo-td-title">{offer.food_name || '—'}</td>
                                                <td>{offer.donor_name || '—'}</td>
                                                <td>{offer.category  || '—'}</td>
                                                <td>{offer.portions  != null ? offer.portions : '—'}</td>
                                                <td>
                                                    <span className={`afo-badge ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td>{formatDate(offer.expiry_date)}</td>
                                                <td>
                                                    <button
                                                        className="afo-menu-btn"
                                                        onClick={e => handleMenuClick(e, offer.offer_id)}
                                                    >
                                                        <MoreVertIcon sx={{ fontSize: 20 }} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Row count ── */}
                        <div className="afo-footer">
                            Showing {filtered.length} of {offers.length} offer{offers.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Floating 3-dot Dropdown Menu ── */}
            {openMenu && (() => {
                // Find the offer currently being actioned
                const currentOffer = offers.find(o => o.offer_id === openMenu);
                const offerStatus  = currentOffer?.status;

                /*
                 * Disable rules:
                 *  - Assign Volunteer : disabled if already in_delivery, expired, or cancelled
                 *  - Mark as Expired  : disabled if already expired, cancelled, or in_delivery
                 *  - Cancel Offer     : disabled if already cancelled, expired
                 *
                 * "assigned to a volunteer" is represented by the 'in_delivery' status
                 * since that is what the API sets when a volunteer is assigned.
                 */
                const isAssigned   = offerStatus === 'in_delivery';
                const isExpired    = offerStatus === 'expired';
                const isCancelled  = offerStatus === 'cancelled';
                const isCompleted  = offerStatus === 'completed';

                // Assign is blocked if volunteer already attached, or offer is terminal
                const assignDisabled  = isAssigned || isExpired || isCancelled || isCompleted;
                // Expire is blocked if already in a terminal or assigned state
                const expireDisabled  = isExpired  || isCancelled || isAssigned || isCompleted;
                // Cancel is blocked if already cancelled or in a terminal state
                const cancelDisabled  = isCancelled || isExpired  || isCompleted;

                return (
                    <div
                        ref={menuRef}
                        className="afo-dropdown"
                        style={{ top: menuPos.top, left: menuPos.left }}
                    >
                        {/* ── View Details — always available ── */}
                        <button onClick={() => handleViewDetails(currentOffer)}>
                            <VisibilityIcon sx={{ fontSize: 16 }} /> View Details
                        </button>

                        {/* ── Assign Volunteer — disabled if already assigned / terminal ── */}
                        <button
                            onClick={assignDisabled ? undefined : () => handleOpenAssign(openMenu)}
                            disabled={assignDisabled}
                            className={assignDisabled ? 'afo-dropdown-disabled' : ''}
                            title={assignDisabled ? 'Volunteer already assigned or offer is not assignable' : ''}
                        >
                            <DeliveryDiningIcon sx={{ fontSize: 16 }} /> Assign Volunteer
                        </button>

                        {/* ── Mark as Expired — disabled if already expired / terminal ── */}
                        <button
                            onClick={expireDisabled ? undefined : () => handleMarkExpired(openMenu)}
                            disabled={expireDisabled}
                            className={expireDisabled ? 'afo-dropdown-disabled' : ''}
                            title={expireDisabled ? 'Offer is already expired or cannot be expired' : ''}
                        >
                            <EventBusyIcon sx={{ fontSize: 16 }} /> Mark Expired
                        </button>

                        {/* ── Cancel Offer — disabled if already cancelled / terminal ── */}
                        <button
                            onClick={cancelDisabled ? undefined : () => handleCancelOffer(openMenu)}
                            disabled={cancelDisabled}
                            className={cancelDisabled
                                ? 'afo-dropdown-disabled'
                                : 'afo-dropdown-danger'}
                            title={cancelDisabled ? 'Offer is already cancelled or in a final state' : ''}
                        >
                            <CancelIcon sx={{ fontSize: 16 }} /> Cancel Offer
                        </button>
                    </div>
                );
            })()}

            {/* ── View Details Modal ── */}
            {detailOffer && (
                <div className="afo-modal-backdrop" onClick={() => setDetailOffer(null)}>
                    <div className="afo-modal" onClick={e => e.stopPropagation()}>
                        <div className="afo-modal-header">
                            <div className="afo-modal-header-icon afo-modal-header-icon--info">
                                <VisibilityIcon sx={{ fontSize: 20 }} />
                            </div>
                            <h2>Offer Details</h2>
                            <button className="afo-modal-close" onClick={() => setDetailOffer(null)}>✕</button>
                        </div>
                        <div className="afo-modal-body">
                            <div className="afo-detail-grid">
                                <div className="afo-detail-row"><span>Title</span><strong>{detailOffer.food_name || '—'}</strong></div>
                                <div className="afo-detail-row"><span>Donor</span><strong>{detailOffer.donor_name || '—'}</strong></div>
                                <div className="afo-detail-row"><span>Category</span><strong>{detailOffer.category || '—'}</strong></div>
                                <div className="afo-detail-row"><span>Quantity</span><strong>{detailOffer.portions ?? '—'}</strong></div>
                                <div className="afo-detail-row"><span>Status</span>
                                    <span className={`afo-badge ${STATUS_BADGE[detailOffer.status]?.cls || ''}`}>
                                        {STATUS_BADGE[detailOffer.status]?.label || detailOffer.status}
                                    </span>
                                </div>
                                <div className="afo-detail-row"><span>Expiry Date</span><strong>{formatDate(detailOffer.expiry_date)}</strong></div>
                                <div className="afo-detail-row"><span>Pickup Time</span><strong>{detailOffer.pickup_time ? new Date(detailOffer.pickup_time).toLocaleString() : '—'}</strong></div>
                                <div className="afo-detail-row"><span>Location</span><strong>{detailOffer.donor_city || '—'}</strong></div>
                                {detailOffer.description && (
                                    <div className="afo-detail-row afo-detail-full"><span>Description</span><p>{detailOffer.description}</p></div>
                                )}
                            </div>
                        </div>
                        {/* Close action row */}
                        <div className="afo-modal-footer">
                            <button className="afo-btn-confirm" onClick={() => setDetailOffer(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Assign Volunteer Modal ── */}
            {assignModal && (
                <div className="afo-modal-backdrop" onClick={() => setAssignModal(null)}>
                    <div className="afo-modal afo-modal--sm" onClick={e => e.stopPropagation()}>
                        <div className="afo-modal-header">
                            <div className="afo-modal-header-icon afo-modal-header-icon--assign">
                                <DeliveryDiningIcon sx={{ fontSize: 20 }} />
                            </div>
                            <h2>Assign Volunteer</h2>
                            <button className="afo-modal-close" onClick={() => setAssignModal(null)}>✕</button>
                        </div>
                        <div className="afo-modal-body">
                            <p className="afo-modal-hint">Select a volunteer to handle this delivery:</p>
                            <select
                                className="afo-select afo-select--full"
                                value={selectedVol}
                                onChange={e => setSelectedVol(e.target.value)}
                            >
                                <option value="">— Choose a volunteer —</option>
                                {volunteers.map(v => (
                                    <option key={v.user_id} value={v.user_id}>
                                        {v.name} {v.phone ? `· ${v.phone}` : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="afo-modal-actions">
                                <button className="afo-btn-cancel" onClick={() => setAssignModal(null)}>Cancel</button>
                                <button
                                    className="afo-btn-confirm"
                                    onClick={handleAssignSubmit}
                                    disabled={!selectedVol || actionLoading}
                                >
                                    {actionLoading ? 'Assigning…' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Styled Confirmation Modal (replaces window.confirm) ── */}
            {confirmModal && (
                <div className="afo-modal-backdrop" onClick={confirmModal.onCancel}>
                    <div className="afo-modal afo-modal--sm afo-modal--confirm" onClick={e => e.stopPropagation()}>
                        <div className="afo-modal-header">
                            <div className={`afo-modal-header-icon ${confirmModal.danger ? 'afo-modal-header-icon--danger' : 'afo-modal-header-icon--warn'}`}>
                                {confirmModal.danger
                                    ? <CancelIcon    sx={{ fontSize: 20 }} />
                                    : <EventBusyIcon sx={{ fontSize: 20 }} />
                                }
                            </div>
                            <h2>{confirmModal.title}</h2>
                            {/* No close ✕ on confirm — user must choose an action */}
                        </div>
                        <div className="afo-modal-body afo-modal-body--confirm">
                            <p className="afo-confirm-message">{confirmModal.message}</p>
                            <div className="afo-modal-actions">
                                <button className="afo-btn-cancel" onClick={confirmModal.onCancel}>
                                    No, Keep It
                                </button>
                                <button
                                    className={confirmModal.danger ? 'afo-btn-confirm afo-btn-danger' : 'afo-btn-confirm'}
                                    onClick={confirmModal.onConfirm}
                                >
                                    Yes, Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast notification ── */}
            {toast && (
                <div className={`afo-toast afo-toast--${toast.type}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default AdminFoodOffers;
