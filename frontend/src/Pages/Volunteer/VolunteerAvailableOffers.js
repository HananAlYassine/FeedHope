// ============================================================
//  FeedHope — Volunteer Available Offers Page
//  Shows ONLY offers where Food_offer.status = 'accepted'
//  (claimed by a receiver but not yet picked up by any volunteer).
//  When the volunteer accepts here, status flips to
//  'delivery_accepted' and the offer moves to "My Deliveries".
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
import MapModal from '../../Components/Shared/MapModal';
import '../../Styles/Volunteer/VolunteerDashboard.css';
import '../../Styles/Volunteer/VolunteerAvailableOffers.css';

// MUI Icons
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MapIcon from '@mui/icons-material/Map';

const API_BASE = 'http://localhost:5000';

const formatPickupTime = (dt) => {
    if (!dt) return '—';
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return String(dt);
    return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const VolunteerAvailableOffers = () => {
    const navigate = useNavigate();

    const [user] = useState(() => {
        const raw = localStorage.getItem('feedhope_user');
        return raw ? JSON.parse(raw) : null;
    });

    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [weightFilter, setWeightFilter] = useState('all');
    const [acceptingId, setAcceptingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [mapTarget, setMapTarget] = useState(null); // { offer } when modal open

    const fetchOffers = useCallback(async () => {
        if (!user?.user_id) return;
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/api/volunteer/available-offers/${user.user_id}`);
            setOffers(res.data.offers || []);
        } catch (err) {
            console.error('Failed to load available offers:', err);
            setErrorMessage('Failed to load available offers. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user?.user_id]);

    useEffect(() => {
        if (!user) {
            navigate('/signin');
            return;
        }
        fetchOffers();
    }, [fetchOffers, navigate, user]);

    // Real-time: silently re-fetch every 3s so newly receiver-accepted offers
    // appear here without a manual refresh.
    useEffect(() => {
        if (!user?.user_id) return;
        const silentRefresh = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/volunteer/available-offers/${user.user_id}`);
                setOffers(res.data.offers || []);
            } catch {}
        };
        const interval = setInterval(silentRefresh, 3000);
        return () => clearInterval(interval);
    }, [user?.user_id]);

    const handleAccept = async (offerId) => {
        if (!user?.user_id) return;
        setAcceptingId(offerId);
        setErrorMessage('');
        try {
            await axios.post(`${API_BASE}/api/volunteer/accept-delivery`, {
                userId: user.user_id,
                offerId
            });
            // Optimistically remove it from the list
            setOffers(prev => prev.filter(o => o.offer_id !== offerId));
            setSuccessMessage('Delivery accepted! You can now find it under "My Deliveries".');
            setTimeout(() => setSuccessMessage(''), 3500);
        } catch (err) {
            console.error('Accept delivery failed:', err);
            setErrorMessage(err.response?.data?.error || 'Failed to accept this delivery.');
            // Refresh list — the offer may have been taken by someone else
            fetchOffers();
        } finally {
            setAcceptingId(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        localStorage.removeItem('volunteer_user');
        navigate('/signin');
    };

    // Filter offers based on search and weight
    const filteredOffers = offers.filter(offer => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
            (offer.food_name || '').toLowerCase().includes(search) ||
            (offer.donor_name || '').toLowerCase().includes(search) ||
            (offer.receiver_name || '').toLowerCase().includes(search);

        const weight = Number(offer.quantity_by_kg) || 0;
        const matchesWeight =
            weightFilter === 'all' ||
            (weightFilter === 'under10' && weight > 0 && weight < 10) ||
            (weightFilter === 'over10' && weight >= 10);

        return matchesSearch && matchesWeight;
    });

    return (
        <div className="vao-layout">
            <VolunteerSidebar user={user} onLogout={handleLogout} activePage="available-offers" />

            <main className="vao-main">
                <div className="vao-header">
                    <h1 className="vao-title">Available Deliveries</h1>
                    <p className="vao-subtitle">Offers already accepted by a receiver — pick one up to deliver</p>
                </div>

                {/* Search and Filter Bar */}
                <div className="vao-search-bar">
                    <div className="vao-search-input-wrapper">
                        <SearchIcon className="vao-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by food, donor, or receiver..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="vao-search-input"
                        />
                    </div>
                    <select
                        className="vao-filter-select"
                        value={weightFilter}
                        onChange={(e) => setWeightFilter(e.target.value)}
                    >
                        <option value="all">All Weights</option>
                        <option value="under10">&lt; 10 KG</option>
                        <option value="over10">&ge; 10 KG</option>
                    </select>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="vao-success-message">
                        <CheckCircleIcon /> {successMessage}
                    </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                    <div className="vao-success-message" style={{ background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }}>
                        <ErrorOutlineIcon /> {errorMessage}
                    </div>
                )}

                {/* Offers List */}
                {loading ? (
                    <div className="vao-empty-state">
                        <p>Loading available offers…</p>
                    </div>
                ) : filteredOffers.length === 0 ? (
                    <div className="vao-empty-state">
                        <p>{offers.length === 0
                            ? 'There are no offers awaiting a volunteer right now.'
                            : 'No available offers match your criteria.'}
                        </p>
                        {offers.length > 0 && (
                            <button onClick={() => { setSearchTerm(''); setWeightFilter('all'); }}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="vao-list-container">
                        {filteredOffers.map(offer => (
                            <div key={offer.offer_id} className="vao-list-item">
                                <div className="vao-item-header">
                                    <h3 className="vao-item-title">{offer.food_name}</h3>
                                    <span className="vao-item-weight">
                                        {offer.quantity_by_kg ? `${offer.quantity_by_kg} KG` : '—'}
                                    </span>
                                </div>
                                <div className="vao-item-donor">
                                    <PersonIcon fontSize="small" /> {offer.donor_name}
                                </div>
                                {offer.description && (
                                    <p className="vao-item-description">{offer.description}</p>
                                )}
                                <div className="vao-item-details">
                                    <span><LocationOnIcon fontSize="small" /> {offer.donor_address || 'Address unavailable'}</span>
                                    <span><AccessTimeIcon fontSize="small" /> Pickup: {formatPickupTime(offer.pickup_time)}</span>
                                    {offer.category && (
                                        <span><Inventory2Icon fontSize="small" /> {offer.category}</span>
                                    )}
                                    {offer.distance_km != null && (
                                        <span><LocationOnIcon fontSize="small" /> {offer.distance_km} km</span>
                                    )}
                                </div>
                                <div className="vao-item-footer">
                                    <div className="vao-item-receiver">
                                        <strong>Deliver to:</strong> {offer.receiver_name}
                                        {offer.receiver_address ? ` — ${offer.receiver_address}` : ''}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            type="button"
                                            onClick={() => setMapTarget(offer)}
                                            style={{
                                                background: '#fff', color: '#1976d2',
                                                border: '1px solid #93c5fd', borderRadius: 8,
                                                padding: '8px 12px', fontWeight: 600, fontSize: 13,
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                cursor: 'pointer'
                                            }}
                                            title="See pickup & drop-off on a map"
                                        >
                                            <MapIcon style={{ fontSize: 16 }} /> View Map
                                        </button>
                                        <button
                                            className="vao-accept-btn"
                                            onClick={() => handleAccept(offer.offer_id)}
                                            disabled={acceptingId === offer.offer_id}
                                        >
                                            {acceptingId === offer.offer_id ? 'Accepting…' : 'Accept Delivery'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer count */}
                {!loading && filteredOffers.length > 0 && (
                    <div className="vao-pagination-container">
                        <span className="vao-pagination-text">
                            Showing 1-{filteredOffers.length} of {filteredOffers.length} items
                        </span>
                        <div className="vao-pagination-controls">
                            <button className="vao-page-arrow" disabled><ChevronLeftIcon /></button>
                            <button className="vao-page-number active">1</button>
                            <button className="vao-page-arrow" disabled><ChevronRightIcon /></button>
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

export default VolunteerAvailableOffers;
