// ============================================================
//  FeedHope — Omar & Hanan — Pages/Admin/AdminMoneyDonations.js
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';  // ← ADDED for logout navigation
import AdminSidebar from '../../Components/Admin/AdminSidebar';
import '../../Styles/Admin/AdminMoneyDonations.css';

import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

// ── Helper: format a date string into a readable "DD Mon YYYY" label ──
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};

// ── Helper: return the current date as "Weekday, DD Month YYYY" ──
const todayFormatted = () => {
    return new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
};

// ── Helper: format a number as a USD dollar amount (e.g. $1,250.00) ──
const formatDollar = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '$0.00';
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ── Main Component ────────────────────────────────────────────
const AdminMoneyDonations = () => {
    const navigate = useNavigate();  // ← ADDED for navigation

    // ── State: list of all monetary donations fetched from the API ──
    const [donations, setDonations] = useState([]);

    // ── State: total amount across all donations (computed from API data) ──
    const [totalAmount, setTotalAmount] = useState(0);

    // ── State: loading & error flags ──
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    // ── State: search query for filtering by donor name or payment method ──
    const [search, setSearch] = useState('');

    // ── Fetch all money donations from the backend ───────────────
    const fetchDonations = async () => {
        try {
            setLoading(true);
            const res  = await fetch('http://localhost:5000/api/admin/money-donations');
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to load donations.');
                return;
            }

            const donationsArray = Array.isArray(data) ? data : [];
            setDonations(donationsArray);

            const sum = donationsArray.reduce(
                (acc, d) => acc + parseFloat(d.amount || 0), 0
            );
            setTotalAmount(sum);

        } catch {
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch data once when the component mounts
    useEffect(() => {
        fetchDonations();
    }, []);

    // ── Logout handler (matches AdminFoodOffers) ──
    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // ── Filter logic: match search text against donor name or payment method ──
    const filtered = donations.filter(d => {
        const q = search.toLowerCase();
        return (
            (d.donor_name    || '').toLowerCase().includes(q) ||
            (d.payment_method|| '').toLowerCase().includes(q)
        );
    });

    // ── Render ───────────────────────────────────────────────────
    return (
        <div className="amd-layout">

            {/* ── Sidebar with logout handler and active page ── */}
            <AdminSidebar onLogout={handleLogout} activePage="money-donations" />

            {/* ── Main content area ── */}
            <main className="amd-main">
                <div className="amd-content-wrapper">

                    {/* ════════════════════════════════════════════
                        BANNER — same gradient palette as AdminFoodOffers
                        Shows page title, subtitle, and current date.
                    ════════════════════════════════════════════ */}
                    <div className="amd-banner">

                        {/* Left side: title + subtitle */}
                        <div className="amd-banner-text">
                            <h1 className="amd-banner-title">Money Donations</h1>
                            <p className="amd-banner-subtitle">
                                View all monetary donations from donors
                            </p>
                        </div>

                        {/* Right side: today's date with calendar icon */}
                        <div className="amd-banner-date">
                            <CalendarTodayIcon sx={{ fontSize: 16 }} />
                            {todayFormatted()}
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════
                        STATISTICS BOX — single stat card showing
                        the total amount of money collected system-wide.
                    ════════════════════════════════════════════ */}
                    <div className="amd-stats-row">

                        {/* Single stat: Total Donations */}
                        <div className="amd-stat-card">

                            {/* Dollar icon inside a coloured pill */}
                            <div className="amd-stat-icon">
                                <AttachMoneyIcon sx={{ fontSize: 24 }} />
                            </div>

                            {/* Label + value stacked vertically */}
                            <div className="amd-stat-info">
                                <span className="amd-stat-label">Total Donations</span>
                                <span className="amd-stat-value">
                                    {/* Show loading placeholder while fetching */}
                                    {loading ? '…' : formatDollar(totalAmount)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════
                        TABLE CARD — lists every monetary donation
                        with columns: Donor, Amount, Payment Method, Date.
                    ════════════════════════════════════════════ */}
                    <div className="amd-card">

                        {/* ── Search bar above the table ── */}
                        <div className="amd-filters">
                            <div className="amd-search-wrap">
                                <span className="amd-search-icon">🔍</span>
                                <input
                                    type="text"
                                    className="amd-search"
                                    placeholder="Search by donor or payment method…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* ── Loading state ── */}
                        {loading && (
                            <div className="amd-state-msg">Loading donations…</div>
                        )}

                        {/* ── Error state with retry button ── */}
                        {!loading && error && (
                            <div className="amd-state-msg amd-state-msg--error">
                                {error}
                                <button className="amd-retry-btn" onClick={fetchDonations}>
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* ── Table (only rendered when data is ready) ── */}
                        {!loading && !error && (
                            <div className="amd-table-wrap">
                                <table className="amd-table">
                                    <thead>
                                        <tr>
                                            <th>Donor</th>
                                            <th>Amount</th>
                                            <th>Payment Method</th>
                                            <th>Description</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="amd-empty">
                                                    {search
                                                        ? 'No donations match your search.'
                                                        : 'No monetary donations recorded yet.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map((donation, idx) => (
                                                <tr key={donation.donation_id ?? idx}>
                                                    <td className="amd-td-donor">
                                                        {donation.donor_name || '—'}
                                                    </td>
                                                    <td className="amd-td-amount">
                                                        {formatDollar(donation.amount)}
                                                    </td>
                                                    <td>
                                                        <span className="amd-method-badge">
                                                            {donation.payment_method || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="amd-td-description">  
                                                        {donation.description || '—'}
                                                    </td>
                                                    <td>{formatDate(donation.donation_date)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ── Footer row: record count ── */}
                        {!loading && !error && (
                            <div className="amd-footer">
                                Showing {filtered.length} of {donations.length} donation
                                {donations.length !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
};

export default AdminMoneyDonations;