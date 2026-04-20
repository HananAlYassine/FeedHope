// ============================================================
//  FeedHope — Omar & Hanan — Pages/Admin/AdminNotifications.js
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import '../../Styles/Admin/AdminNotifications.css';

// ── MUI Icons ─────────────────────────────────────────────────
import CalendarTodayIcon      from '@mui/icons-material/CalendarToday';
import NotificationsIcon      from '@mui/icons-material/Notifications';
import NotificationsNoneIcon  from '@mui/icons-material/NotificationsNone';
import DeleteSweepIcon        from '@mui/icons-material/DeleteSweep';
import DoneAllIcon            from '@mui/icons-material/DoneAll';
import StorageIcon            from '@mui/icons-material/Storage';
import PeopleAltIcon          from '@mui/icons-material/PeopleAlt';
import LocalShippingIcon      from '@mui/icons-material/LocalShipping';
import RestaurantIcon         from '@mui/icons-material/Restaurant';
import AttachMoneyIcon        from '@mui/icons-material/AttachMoney';
import InventoryIcon          from '@mui/icons-material/Inventory';
import PersonAddAltIcon       from '@mui/icons-material/PersonAddAlt';
import InfoOutlinedIcon       from '@mui/icons-material/InfoOutlined';
import DeleteIcon             from '@mui/icons-material/Delete';

// ── Helper: format today's date as "Weekday, DD Month YYYY" ───
const todayFormatted = () =>
    new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

// ── Helper: convert a timestamp to a relative time label ──────
// e.g. "just now", "5 min ago", "3 hr ago", "2 days ago"
const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'just now';
    if (mins  < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days  < 7)  return `${days} day${days !== 1 ? 's' : ''} ago`;
    return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
};

// ── Helper: return the correct MUI icon for each notification type ──
// The `type` column in the DB uses these exact string values:
//   'new_registration' | 'new_offer' | 'offer_accepted'
//   'money_donation'   | 'fund_distribution'
const getIcon = (type = '') => {
    switch (type.toLowerCase()) {
        case 'new_registration':  return <PersonAddAltIcon  sx={{ fontSize: 18 }} />;
        case 'new_offer':         return <RestaurantIcon    sx={{ fontSize: 18 }} />;
        case 'offer_accepted':    return <LocalShippingIcon sx={{ fontSize: 18 }} />;
        case 'money_donation':    return <AttachMoneyIcon   sx={{ fontSize: 18 }} />;
        case 'fund_distribution': return <InventoryIcon     sx={{ fontSize: 18 }} />;
        default:                  return <InfoOutlinedIcon  sx={{ fontSize: 18 }} />;
    }
};

// ── Helper: return a CSS colour class for the icon pill ───────
const getIconClass = (type = '') => {
    switch (type.toLowerCase()) {
        case 'new_registration':  return 'an-icon--teal';
        case 'new_offer':         return 'an-icon--orange';
        case 'offer_accepted':    return 'an-icon--blue';
        case 'money_donation':    return 'an-icon--green';
        case 'fund_distribution': return 'an-icon--indigo';
        default:                  return 'an-icon--gray';
    }
};

// ── Helper: classify a notification into 'system' or 'users' ──
// system → platform operations (new offer created, fund distributed)
// users  → individual user actions (registration, acceptance, donation)
const classifySource = (type = '') => {
    const systemTypes = ['new_offer', 'fund_distribution'];
    return systemTypes.includes(type.toLowerCase()) ? 'system' : 'users';
};

// ── Main Component ─────────────────────────────────────────────
const AdminNotifications = () => {
    const navigate = useNavigate();

    // Active tab: 'all' | 'unread'
    const [activeTab, setActiveTab]         = useState('all');

    // Source filter: 'both' | 'system' | 'users'
    const [sourceFilter, setSourceFilter]   = useState('both');

    // Notifications array fetched from the backend
    const [notifications, setNotifications] = useState([]);

    // Loading and error state
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    // Toast: temporary feedback message shown after user actions
    const [toast, setToast] = useState(null);

    // ── Modal state ────────────────────────────────────────────
    // deleteSingleTarget: holds the notification ID to delete when the
    //   single-delete confirmation modal is open; null means modal is closed.
    const [deleteSingleTarget, setDeleteSingleTarget] = useState(null);

    // showDeleteAllModal: boolean — true while the "Delete All" modal is open.
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

    // actionLoading: true while an async delete request is in-flight,
    //   used to disable the confirm button and show a loading label.
    const [actionLoading, setActionLoading] = useState(false);

    // ── Show a toast message for 3 seconds ────────────────────
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Fetch admin notifications from the backend ─────────────
    // GET /api/admin/notifications returns only the five important
    // types: new_registration, new_offer, offer_accepted,
    // money_donation, fund_distribution — sorted newest-first.
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res  = await fetch('http://localhost:5000/api/admin/notifications');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load notifications.');
            setNotifications(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch once when the component mounts
    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Logout ─────────────────────────────────────────────────
    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // ── Mark ALL unread notifications as read ──────────────────
    const handleMarkAllRead = async () => {
        try {
            const res = await fetch(
                'http://localhost:5000/api/admin/notifications/mark-all-read',
                { method: 'PUT' }
            );
            if (!res.ok) throw new Error();
            // Optimistically flip every notification to read in local state
            setNotifications(prev =>
                prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
            // Tell the sidebar to refresh its unread badge to 0
            window.dispatchEvent(new Event('notification-read'));
            showToast('All notifications marked as read.');
        } catch {
            showToast('Failed to mark notifications as read.', 'error');
        }
    };

    // ── Open the "Delete All" styled modal ────────────────────
    // Replaces the old window.confirm('Delete ALL notifications?…') call.
    // We simply set the boolean flag to true — the modal JSX renders below.
    const handleDeleteAllClick = () => {
        setShowDeleteAllModal(true);
    };

    // ── Confirmed: actually delete ALL notifications ───────────
    // Called when the admin clicks "Delete All" inside the confirmation modal.
    const handleDeleteAllConfirm = async () => {
        setActionLoading(true);
        try {
            const notifRes = await fetch(
                'http://localhost:5000/api/admin/notifications/delete-all',
                { method: 'DELETE' }
            );
            if (!notifRes.ok) throw new Error(await notifRes.text());

            // Clear local state so the list empties immediately
            setNotifications([]);
            // Tell the sidebar badge to reset to 0
            window.dispatchEvent(new Event('notification-read'));
            showToast('All notifications deleted.');
        } catch (err) {
            console.error(err);
            showToast('Failed to delete notifications.', 'error');
        } finally {
            setActionLoading(false);
            // Always close the modal whether the request succeeded or failed
            setShowDeleteAllModal(false);
        }
    };

    // ── Open the "Delete Single" styled modal ─────────────────
    // Replaces the old window.confirm('Delete this notification?') call.
    // We store the target ID so the confirm handler knows which one to delete.
    const handleDeleteOneClick = (notificationId) => {
        setDeleteSingleTarget(notificationId);
    };

    // ── Confirmed: actually delete ONE notification ────────────
    // Called when the admin clicks "Delete" inside the single-delete modal.
    const handleDeleteOneConfirm = async () => {
        if (!deleteSingleTarget) return;
        setActionLoading(true);
        try {
            const res = await fetch(
                `http://localhost:5000/api/admin/notifications/${deleteSingleTarget}`,
                { method: 'DELETE' }
            );
            if (!res.ok) throw new Error();
            // Remove it from local state without a full refetch
            setNotifications(prev =>
                prev.filter(n => n.notification_id !== deleteSingleTarget)
            );
            window.dispatchEvent(new Event('notification-read'));
            showToast('Notification deleted.');
        } catch {
            showToast('Failed to delete notification.', 'error');
        } finally {
            setActionLoading(false);
            // Clear the target and close the modal
            setDeleteSingleTarget(null);
        }
    };

    // ── Mark a SINGLE notification as read on click ────────────
    const handleMarkOneRead = async (notifId) => {
        try {
            await fetch(
                `http://localhost:5000/api/admin/notifications/${notifId}/read`,
                { method: 'PUT' }
            );
            setNotifications(prev =>
                prev.map(n =>
                    n.notification_id === notifId
                        ? { ...n, read_at: n.read_at || new Date().toISOString() }
                        : n
                )
            );
            window.dispatchEvent(new Event('notification-read'));
        } catch { /* non-critical, ignore silently */ }
    };

    // ── Build the filtered list of display items ───────────────
    // Normalises each DB row, then applies tab + source filters.
    const buildItems = () => {
        let items = notifications.map(n => ({
            id:      n.notification_id,
            title:   n.message_title,
            message: n.message,
            date:    n.date,
            isRead:  !!n.read_at,
            type:    n.type || '',
            source:  classifySource(n.type || ''), // 'system' | 'users'
        }));

        // Unread tab: keep only items where read_at was NULL
        if (activeTab === 'unread') {
            items = items.filter(item => !item.isRead);
        }

        // Source filter: applied on top of the tab filter
        //   'system' → new_offer, fund_distribution
        //   'users'  → new_registration, offer_accepted, money_donation
        if (sourceFilter !== 'both') {
            items = items.filter(item => item.source === sourceFilter);
        }

        return items;
    };

    const items       = buildItems();
    // unreadCount drives the badge in the "Unread" tab button and the sidebar
    const unreadCount = notifications.filter(n => !n.read_at).length;

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className="an-layout">

            {/* Sidebar — highlights "notifications" nav item and handles logout */}
            <AdminSidebar onLogout={handleLogout} activePage="notifications" />

            <main className="an-main">
                <div className="an-content-wrapper">

                    {/* ════════════ BANNER ════════════ */}
                    <div className="an-banner">
                        <div className="an-banner-text">
                            <div className="an-banner-heading">
                                <NotificationsIcon sx={{ fontSize: 30 }} />
                                <h1 className="an-banner-title">Notifications</h1>
                            </div>
                            <p className="an-banner-subtitle">
                                Important system alerts and user activity
                            </p>
                        </div>
                        <div className="an-banner-date">
                            <CalendarTodayIcon sx={{ fontSize: 16 }} />
                            {todayFormatted()}
                        </div>
                    </div>

                    {/* ════════════ TOOLBAR ════════════ */}
                    <div className="an-toolbar">

                        {/* Left side: tab buttons + source filter buttons */}
                        <div className="an-toolbar-left">

                            {/* "All Notifications" tab — shows every notification */}
                            <button
                                className={`an-tab-btn ${activeTab === 'all' ? 'an-tab-btn--active' : ''}`}
                                onClick={() => setActiveTab('all')}
                            >
                                <NotificationsIcon sx={{ fontSize: 16 }} />
                                All Notifications
                            </button>

                            {/* "Unread" tab — shows only rows where read_at IS NULL */}
                            <button
                                className={`an-tab-btn ${activeTab === 'unread' ? 'an-tab-btn--active' : ''}`}
                                onClick={() => setActiveTab('unread')}
                            >
                                <NotificationsNoneIcon sx={{ fontSize: 16 }} />
                                Unread
                                {/* Red badge showing how many unread notifications exist */}
                                {unreadCount > 0 && (
                                    <span className="an-badge">{unreadCount}</span>
                                )}
                            </button>

                            {/* Divider between tab group and source filter group */}
                            <span className="an-toolbar-divider" />

                            {/* "System" filter: new_offer + fund_distribution events */}
                            <button
                                className={`an-tab-btn an-tab-btn--source ${sourceFilter === 'system' ? 'an-tab-btn--source-active' : ''}`}
                                onClick={() => setSourceFilter(prev => prev === 'system' ? 'both' : 'system')}
                                title="Show system operation notifications only"
                            >
                                <StorageIcon sx={{ fontSize: 16 }} />
                                System
                            </button>

                            {/* "Users" filter: registrations + acceptances + donations */}
                            <button
                                className={`an-tab-btn an-tab-btn--source ${sourceFilter === 'users' ? 'an-tab-btn--source-active' : ''}`}
                                onClick={() => setSourceFilter(prev => prev === 'users' ? 'both' : 'users')}
                                title="Show user activity notifications only"
                            >
                                <PeopleAltIcon sx={{ fontSize: 16 }} />
                                Users
                            </button>
                        </div>

                        {/* Right side: action buttons */}
                        <div className="an-toolbar-right">

                            {/* Mark All as Read — disabled when nothing is unread */}
                            <button
                                className="an-action-btn an-action-btn--read"
                                onClick={handleMarkAllRead}
                                disabled={unreadCount === 0}
                                title="Mark all notifications as read"
                            >
                                <DoneAllIcon sx={{ fontSize: 16 }} />
                                Mark All as Read
                            </button>

                            {/* Delete All — now opens the styled confirmation modal
                                instead of the native window.confirm dialog.
                                Disabled when the notification list is already empty. */}
                            <button
                                className="an-action-btn an-action-btn--delete"
                                onClick={handleDeleteAllClick}
                                disabled={notifications.length === 0}
                                title="Permanently delete all notifications"
                            >
                                <DeleteSweepIcon sx={{ fontSize: 16 }} />
                                Delete All
                            </button>
                        </div>
                    </div>

                    {/* ════════════ NOTIFICATIONS CARD ════════════ */}
                    <div className="an-card">

                        {/* Loading spinner placeholder */}
                        {loading && (
                            <div className="an-state-msg">
                                <NotificationsNoneIcon sx={{ fontSize: 36, opacity: 0.3 }} />
                                Loading notifications…
                            </div>
                        )}

                        {/* Error state with a retry button */}
                        {!loading && error && (
                            <div className="an-state-msg an-state-msg--error">
                                {error}
                                <button className="an-retry-btn" onClick={fetchData}>Retry</button>
                            </div>
                        )}

                        {/* Empty state — message adapts to active tab / source filter */}
                        {!loading && !error && items.length === 0 && (
                            <div className="an-state-msg">
                                <NotificationsNoneIcon sx={{ fontSize: 42, opacity: 0.25 }} />
                                <span>
                                    {activeTab === 'unread'
                                        ? 'No unread notifications.'
                                        : sourceFilter !== 'both'
                                            ? `No ${sourceFilter} notifications found.`
                                            : 'No notifications yet.'}
                                </span>
                            </div>
                        )}

                        {/* Notification list */}
                        {!loading && !error && items.length > 0 && (
                            <ul className="an-list">
                                {items.map(item => (
                                    <li
                                        key={item.id}
                                        className={`an-item ${!item.isRead ? 'an-item--unread' : ''}`}
                                        // Clicking anywhere on an unread row marks it as read
                                        onClick={() => {
                                            if (!item.isRead) handleMarkOneRead(item.id);
                                        }}
                                    >
                                        {/* Coloured icon pill — colour driven by notification type */}
                                        <div className={`an-item-icon ${getIconClass(item.type)}`}>
                                            {getIcon(item.type)}
                                        </div>

                                        {/* Text body: title, source badge, message, timestamp */}
                                        <div className="an-item-body">
                                            <div className="an-item-header">
                                                <span className="an-item-title">{item.title}</span>

                                                {/* Source badge: "System" (grey) or "Users" (teal) */}
                                                <span className={`an-source-tag an-source-tag--${item.source}`}>
                                                    {item.source === 'system'
                                                        ? <><StorageIcon   sx={{ fontSize: 11 }} /> System</>
                                                        : <><PeopleAltIcon sx={{ fontSize: 11 }} /> Users</>
                                                    }
                                                </span>
                                            </div>
                                            <p className="an-item-msg">{item.message}</p>
                                            <span className="an-item-time">{timeAgo(item.date)}</span>
                                        </div>

                                        {/* Blue dot indicator for unread items */}
                                        {!item.isRead && (
                                            <span className="an-unread-dot" title="Unread" />
                                        )}

                                        {/* Trash icon — now opens the styled single-delete modal
                                            instead of the native window.confirm dialog.
                                            stopPropagation prevents the mark-as-read click from firing. */}
                                        <button
                                            className="an-delete-single-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteOneClick(item.id);
                                            }}
                                            aria-label="Delete this notification"
                                        >
                                            <DeleteIcon sx={{ fontSize: 16 }} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Footer: record count + unread tally */}
                        {!loading && !error && (
                            <div className="an-footer">
                                Showing {items.length} notification{items.length !== 1 ? 's' : ''}
                                {unreadCount > 0 && ` · ${unreadCount} unread`}
                            </div>
                        )}
                    </div>

                </div>
            </main>

            {/* ════════════════════════════════════════════════════════
                MODAL — DELETE SINGLE NOTIFICATION CONFIRMATION
                Opens when the admin clicks the trash icon on any row.
                deleteSingleTarget holds the ID of the notification to delete.
                Clicking the backdrop (the dimmed overlay) cancels the action.
            ════════════════════════════════════════════════════════ */}
            {deleteSingleTarget && (
                /* Backdrop — full-viewport dimmed overlay with blur.
                   Clicking it sets deleteSingleTarget back to null (cancel). */
                <div
                    className="an-modal-backdrop"
                    onClick={() => setDeleteSingleTarget(null)}
                >
                    {/* Modal card — stopPropagation so clicks inside don't close the backdrop */}
                    <div
                        className="an-modal an-modal--confirm"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* ── Modal Header ──────────────────────────────────
                            Red gradient background, trash icon, and title —
                            identical to the Delete User header in AdminUsers. */}
                        <div className="an-modal-header an-modal-header--danger">
                            {/* Semi-transparent circular icon holder */}
                            <div className="an-modal-header-icon an-modal-header-icon--danger">
                                <DeleteIcon sx={{ fontSize: 20 }} />
                            </div>
                            <h2 className="an-modal-title an-modal-title--light">
                                Delete Notification
                            </h2>
                        </div>

                        {/* ── Modal Body ────────────────────────────────────
                            Centred text layout: headline question + sub-warning */}
                        <div className="an-modal-body an-modal-body--confirm">
                            <p className="an-confirm-headline">
                                Are you sure you want to permanently delete this notification?
                            </p>
                            <p className="an-confirm-sub">
                                This action cannot be undone.
                            </p>

                            {/* ── Action buttons row ────────────────────────
                                Cancel closes the modal; Delete triggers the API call. */}
                            <div className="an-modal-actions">
                                {/* Cancel button — outlined style, closes modal with no side-effect */}
                                <button
                                    className="an-btn-cancel"
                                    onClick={() => setDeleteSingleTarget(null)}
                                >
                                    Cancel
                                </button>

                                {/* Confirm / Delete button — red filled, triggers the actual delete.
                                    Disabled while the request is in-flight to prevent double-clicks. */}
                                <button
                                    className="an-btn-confirm an-btn-danger"
                                    onClick={handleDeleteOneConfirm}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════
                MODAL — DELETE ALL NOTIFICATIONS CONFIRMATION
                Opens when the admin clicks the "Delete All" toolbar button.
                showDeleteAllModal is the boolean flag that controls visibility.
                Clicking the backdrop cancels the action.
            ════════════════════════════════════════════════════════ */}
            {showDeleteAllModal && (
                /* Backdrop — same full-viewport dimmed overlay.
                   Clicking it sets showDeleteAllModal to false (cancel). */
                <div
                    className="an-modal-backdrop"
                    onClick={() => setShowDeleteAllModal(false)}
                >
                    {/* Modal card */}
                    <div
                        className="an-modal an-modal--confirm"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* ── Modal Header ──────────────────────────────────
                            Same red gradient as the single-delete modal,
                            but uses DeleteSweepIcon to signal a bulk operation. */}
                        <div className="an-modal-header an-modal-header--danger">
                            {/* Semi-transparent icon holder */}
                            <div className="an-modal-header-icon an-modal-header-icon--danger">
                                <DeleteSweepIcon sx={{ fontSize: 20 }} />
                            </div>
                            <h2 className="an-modal-title an-modal-title--light">
                                Delete All Notifications
                            </h2>
                        </div>

                        {/* ── Modal Body ────────────────────────────────────
                            Slightly stronger warning copy since this is irreversible
                            and affects every notification at once. */}
                        <div className="an-modal-body an-modal-body--confirm">
                            <p className="an-confirm-headline">
                                Are you sure you want to permanently delete{' '}
                                <strong>all notifications</strong>?
                            </p>
                            <p className="an-confirm-sub">
                                This will remove every notification from the system.
                                This action cannot be undone.
                            </p>

                            {/* ── Action buttons row ────────────────────────
                                Cancel closes the modal; Delete All triggers the bulk API call. */}
                            <div className="an-modal-actions">
                                {/* Cancel button */}
                                <button
                                    className="an-btn-cancel"
                                    onClick={() => setShowDeleteAllModal(false)}
                                >
                                    Cancel
                                </button>

                                {/* Confirm / Delete All button — red filled.
                                    Disabled while the request is in-flight. */}
                                <button
                                    className="an-btn-confirm an-btn-danger"
                                    onClick={handleDeleteAllConfirm}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Deleting…' : 'Delete All'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast — slides in from bottom-right for 3 seconds */}
            {toast && (
                <div className={`an-toast an-toast--${toast.type}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default AdminNotifications;
