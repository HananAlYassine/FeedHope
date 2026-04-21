// ============================================================
//  FeedHope — Omar & Hanan
//  Pages/Receiver/ReceiverOfferDetails.js
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';
import '../../Styles/Receiver/ReceiverOfferDetails.css';
import '../../Styles/Receiver/ReceiverBrowseOffers.css';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StorefrontIcon from '@mui/icons-material/Storefront';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CategoryIcon from '@mui/icons-material/Category';
import ScaleIcon from '@mui/icons-material/Scale';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NoMealsIcon from '@mui/icons-material/NoMeals';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import PeopleIcon from '@mui/icons-material/People';

const formatDate = (dt) => {
  if (!dt) return 'N/A';
  return new Date(dt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (dt) => {
  if (!dt) return 'N/A';
  const d = new Date(dt);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const ReceiverOfferDetails = () => {
  const navigate = useNavigate();
  const { offerId } = useParams();
  const stored = localStorage.getItem('feedhope_user');
  const user = stored ? JSON.parse(stored) : null;

  const organizationName = user?.name || 'Receiver';

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  const fetchOffer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/offers/${offerId}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to fetch offer details');
      }
      const data = await res.json();
      setOffer(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    fetchOffer();
  }, [fetchOffer]);

  const handleAccept = async () => {
    if (!user?.user_id) {
      alert('You must be logged in to accept an offer.');
      return;
    }
    setAccepting(true);
    try {
      const res = await fetch('http://localhost:5000/api/receiver/accept-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: offer.offer_id, userId: user.user_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Accept failed');
      // alert('Offer accepted successfully!');
      fetchOffer();
    } catch (err) {
      alert(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('feedhope_user');
    navigate('/signin');
  };

  const statusClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'available': return 'rod-status rod-status--available';
      case 'accepted': return 'rod-status rod-status--accepted';
      default: return 'rod-status rod-status--other';
    }
  };

  const statusLabel = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const pickupAddress = offer
    ? [offer.street, offer.city, offer.country].filter(Boolean).join(', ') || 'Address not provided'
    : '';

  if (loading) {
    return (
      <div className="rdb-layout">
        <ReceiverSidebar onLogout={handleLogout} activePage="browse" />
        <main className="rdb-main">
          <div className="rdb-loading-screen">
            <div className="rdb-spinner" />
            <p>Loading offer details…</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="rdb-layout">
        <ReceiverSidebar onLogout={handleLogout} activePage="browse" />
        <main className="rdb-main">
          <div className="rdb-error-screen">
            <p className="rdb-error-msg">{error || 'Offer not found.'}</p>
            <button className="rdb-retry-btn" onClick={fetchOffer}>Retry</button>
          </div>
        </main>
      </div>
    );
  }

  const isAvailable = offer.status?.toLowerCase() === 'available';
  const portions = offer.number_of_person || 0;

  return (
    <div className="rdb-layout">
      <ReceiverSidebar onLogout={handleLogout} activePage="browse" />

      <main className="rdb-main">
        <div className="rdb-banner rob-banner">
          <div className="rdb-banner-text">
            <p className="rdb-banner-greeting">Welcome back, {organizationName}</p>
            <h1 className="rdb-banner-title">Offer Details</h1>
            <p className="rdb-banner-subtitle">
              Review the complete information and accept this donation.
            </p>
          </div>
          <div className="rdb-banner-icon">
            <RestaurantIcon sx={{ fontSize: 48, color: '#fff' }} />
          </div>
          <div className="rob-banner-stat">
            <span className="rob-banner-stat-num">{portions}</span>
            <span className="rob-banner-stat-label">Portions</span>
          </div>
        </div>

        <button className="rod-back-btn" onClick={() => navigate('/receiver-browse')}>
          <ArrowBackIcon sx={{ fontSize: 16 }} />
          Back to Browse
        </button>

        <div className="rob-card rod-detail-card">
          <div className="rob-card-body">
            <div className="rod-card-header">
              <div>
                <h3 className="rob-offer-title">{offer.food_name}</h3>
                <p className="rob-offer-donor">
                  <StorefrontIcon sx={{ fontSize: 14 }} />
                  {offer.donor_name}
                </p>
              </div>
              <span className={statusClass(offer.status)}>
                <FiberManualRecordIcon sx={{ fontSize: 10 }} />
                {statusLabel(offer.status)}
              </span>
            </div>

            <section className="rod-section">
              <h3 className="rod-section-title">
                <InfoOutlinedIcon sx={{ fontSize: 17 }} />
                Description
              </h3>
              <p className="rod-description">{offer.description || 'No description provided.'}</p>
            </section>

            <div className="rod-meta-grid">
              <div className="rod-meta-item">
                <CategoryIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">Category</span>
                <span className="rod-meta-value">{offer.category_name || '—'}</span>
              </div>
              <div className="rod-meta-item">
                <ScaleIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">Quantity (KG)</span>
                <span className="rod-meta-value">{offer.quantity_by_kg ? `${offer.quantity_by_kg} KG` : '—'}</span>
              </div>
              <div className="rod-meta-item">
                <PeopleIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">Portions</span>
                <span className="rod-meta-value">{portions}</span>
              </div>
              <div className="rod-meta-item">
                <EventIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">Expiry Date</span>
                <span className="rod-meta-value">{formatDate(offer.expiration_date_and_time)}</span>
              </div>
              <div className="rod-meta-item">
                <LocationOnIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">Pickup Address</span>
                <span className="rod-meta-value">{pickupAddress}</span>
              </div>
              <div className="rod-meta-item">
                <AccessTimeIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">Pickup Time</span>
                <span className="rod-meta-value">{formatTime(offer.pickup_time)}</span>
              </div>
            </div>

            <section className="rod-section">
              <h3 className="rod-section-title">
                <NoMealsIcon sx={{ fontSize: 17 }} />
                Dietary Information
              </h3>
              <p className="rod-dietary">{offer.dietary_information || 'No dietary information provided.'}</p>
            </section>

            {isAvailable && (
              <button className="rod-accept-btn" onClick={handleAccept} disabled={accepting}>
                <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />
                {accepting ? 'Accepting…' : 'Accept Offer'}
              </button>
            )}
            {!isAvailable && (
              <div className="rod-unavailable-notice">
                This offer is no longer available for acceptance.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReceiverOfferDetails;