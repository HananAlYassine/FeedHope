// ============================================================
//  FeedHope — Omar & Hanan
//  Pages/Receiver/ReceiverBrowseOffers.js
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';
import DashboardChatbot from '../../Components/Shared/DashboardChatbot';
import '../../Styles/Receiver/ReceiverBrowseOffers.css';

import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ScaleIcon from '@mui/icons-material/Scale';
import EventIcon from '@mui/icons-material/Event';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import BakeryDiningIcon from '@mui/icons-material/BakeryDining';
import GrainIcon from '@mui/icons-material/Grain';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import SetMealIcon from '@mui/icons-material/SetMeal';
import EmojiFoodBeverageIcon from '@mui/icons-material/EmojiFoodBeverage';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import TranslateIcon from '@mui/icons-material/Translate';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// UI labels in English / Arabic. Picked at render-time based on `lang`.
const LABELS = {
  en: {
    portions: 'portions',
    posted: 'Posted:',
    expires: 'Expires:',
    addressMissing: 'Address not provided',
    descriptionMissing: 'No description provided',
    details: 'Details',
    acceptOffer: 'Accept Offer',
    accepting: 'Accepting…',
    translateBtn: 'العربية',
    revertBtn: 'English',
    translating: 'Translating…',
    translatedBanner: 'Translated to Arabic by AI',
  },
  ar: {
    portions: 'حصة',
    posted: 'تاريخ النشر:',
    expires: 'تاريخ الانتهاء:',
    addressMissing: 'العنوان غير متوفر',
    descriptionMissing: 'لا يوجد وصف',
    details: 'التفاصيل',
    acceptOffer: 'قبول العرض',
    accepting: 'جارٍ القبول…',
    translateBtn: 'العربية',
    revertBtn: 'English',
    translating: 'جارٍ الترجمة…',
    translatedBanner: 'تمت الترجمة إلى العربية بواسطة الذكاء الاصطناعي',
  },
};

// Returns an icon based on the category name of the offer
const getCategoryIcon = (categoryName) => {
  const name = categoryName?.toLowerCase() || '';
  if (name.includes('meal') || name.includes('prepared')) return <RestaurantIcon fontSize="small" />;
  if (name.includes('bakery')) return <BakeryDiningIcon fontSize="small" />;
  if (name.includes('grain')) return <GrainIcon fontSize="small" />;
  if (name.includes('beverage')) return <LocalDrinkIcon fontSize="small" />;
  if (name.includes('seafood')) return <SetMealIcon fontSize="small" />;
  if (name.includes('dairy')) return <EmojiFoodBeverageIcon fontSize="small" />;
  if (name.includes('canned')) return <WarehouseIcon fontSize="small" />;
  return <RestaurantIcon fontSize="small" />;
};

// Converts the expiration date of an offer into a readable date & time format
const formatExpiry = (datetime) => {
  if (!datetime) return 'N/A';
  return new Date(datetime).toLocaleString();
};


const OfferCard = ({ offer, onAccept, onDetails, accepting, lang = 'en', translation }) => {
  const t = LABELS[lang] || LABELS.en;
  const isAr = lang === 'ar';
  const weight = offer.quantity_by_kg ? `${offer.quantity_by_kg} kg` : '—';
  const portions = offer.number_of_person || 0;

  // Pull either the original or translated text for each field.
  // Only use the translation when we're actually in Arabic mode — otherwise
  // a cached translation would keep showing in English mode after toggling back.
  const tx = (key, fallback) =>
    (isAr && translation && translation[key]) || offer[key] || fallback;
  const foodName     = tx('food_name', '');
  const description  = tx('description', t.descriptionMissing);
  const categoryName = tx('category_name', offer.category_name || 'General');
  const donorName    = tx('donor_name', offer.donor_name || '');
  const englishAddress = [offer.street, offer.city].filter(Boolean).join(', ');
  const donorAddress = (isAr && translation?.address) || englishAddress || t.addressMissing;

  // Format creation time
  const formatTime = (datetime) => {
    if (!datetime) return '—';
    return new Date(datetime).toLocaleString(isAr ? 'ar-EG' : undefined);
  };

  return (
    <article className="rob-card" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="rob-card-img">
        {offer.image_url ? (
          <img
            src={`http://localhost:5000${offer.image_url}`}
            alt={foodName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <ImageNotSupportedIcon style={{ fontSize: 48, color: '#aaa' }} />
          </div>
        )}
        <span className="rob-category-badge">
          {getCategoryIcon(offer.category_name)}
          {categoryName}
        </span>
        <span className="rob-portions-badge" title="Available portions">
          {portions}
          <span className="rob-portions-label">{t.portions}</span>
        </span>
      </div>

      <div className="rob-card-body">
        <h3 className="rob-offer-title">{foodName}</h3>
        <p className="rob-offer-donor">
          <StorefrontIcon sx={{ fontSize: 14 }} />
          {donorName}
        </p>
        <p className="rob-offer-desc">{description}</p>

        {/* Row 1: Weight and Address side by side */}
        <div className="rob-meta-row">
          <span className="rob-meta-item">
            <ScaleIcon sx={{ fontSize: 14 }} />
            {weight}
          </span>
          <span className="rob-meta-item rob-meta-address">
            <LocationOnIcon sx={{ fontSize: 14 }} />
            {donorAddress}
          </span>
        </div>

        {/* Row 2: Posted and Expires – stacked vertically */}
        <div className="rob-meta-stack">
          <span className="rob-meta-item">
            <EventIcon sx={{ fontSize: 14 }} />
            {t.posted} {formatTime(offer.created_at)}
          </span>
          <span className="rob-meta-item rob-meta-item--expiry">
            <EventIcon sx={{ fontSize: 14 }} />
            {t.expires} {formatExpiry(offer.expiration_date_and_time)}
          </span>
        </div>

        <div className="rob-card-actions">
          <button className="rob-btn-details" onClick={() => onDetails(offer.offer_id)}>
            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            {t.details}
          </button>
          <button className="rob-btn-accept" onClick={() => onAccept(offer.offer_id)} disabled={accepting === offer.offer_id}>
            <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
            {accepting === offer.offer_id ? t.accepting : t.acceptOffer}
          </button>
        </div>
      </div>
    </article>
  );
};



const ReceiverBrowseOffers = () => {
  const navigate = useNavigate();
  const stored = localStorage.getItem('feedhope_user');
  const user = stored ? JSON.parse(stored) : null;

  const organizationName = user?.name || 'Receiver';

  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [accepting, setAccepting] = useState(null);

  // ── AI Translate (Arabic) ─────────────────────────────────
  // `lang` toggles English ⇄ Arabic; `translations` caches per-offer
  // Arabic strings keyed by offer_id so we don't re-translate on every
  // silent refresh.
  const [lang, setLang] = useState('en');
  const [translations, setTranslations] = useState({});
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState('');

  const fetchOffers = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/api/offers');
      if (!res.ok) throw new Error('Failed to fetch offers');
      const data = await res.json();
      setOffers(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/api/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Category fetch error:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchOffers(), fetchCategories()]);
      setLoading(false);
    };
    loadData();
  }, [fetchOffers, fetchCategories]);

  // Real-time: silently re-fetch every 3s so newly created donor offers
  // appear here without a manual refresh.
  useEffect(() => {
    const interval = setInterval(() => { fetchOffers(); }, 3000);
    return () => clearInterval(interval);
  }, [fetchOffers]);

  const handleLogout = () => {
    localStorage.removeItem('feedhope_user');
    navigate('/signin');
  };

  const handleDetails = (offerId) => {
    navigate(`/receiver-offer/${offerId}`);
  };

  const handleAccept = async (offerId) => {
    if (!user?.user_id) {
      alert('You must be logged in to accept an offer.');
      return;
    }
    setAccepting(offerId);
    try {
      const res = await fetch('http://localhost:5000/api/receiver/accept-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, userId: user.user_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Accept failed');

      // Dispatch event so sidebar refreshes unread count
      window.dispatchEvent(new Event('notification-read'));

      fetchOffers();
    } catch (err) {
      alert(err.message);
    } finally {
      setAccepting(null);
    }
  };

  // ── Translate handler ─────────────────────────────────────
  // First click: fetch Arabic translations for the offers shown, cache them,
  // and switch lang→ar. Second click: just toggle back to English (cache stays
  // so re-entering Arabic mode is instant).
  const handleTranslateToggle = async () => {
    setTranslateError('');
    if (lang === 'ar') {
      setLang('en');
      return;
    }
    // Only translate offers we don't already have a cached translation for.
    const targetOffers = filteredOffers.filter(o => !translations[o.offer_id]);
    if (targetOffers.length === 0) {
      setLang('ar');
      return;
    }
    setTranslating(true);
    try {
      const slim = targetOffers.map(o => ({
        offer_id: o.offer_id,
        food_name: o.food_name,
        description: o.description,
        category_name: o.category_name,
        donor_name: o.donor_name,
        address: [o.street, o.city].filter(Boolean).join(', '),
      }));
      const res = await fetch('http://localhost:5000/api/ai/translate-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offers: slim }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTranslateError(data.error || 'Translation failed.');
        return;
      }
      setTranslations(prev => ({ ...prev, ...(data.translations || {}) }));
      setLang('ar');
    } catch {
      setTranslateError('Could not reach the AI service.');
    } finally {
      setTranslating(false);
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesCat = activeCategoryId === 'all' || offer.category_id === Number(activeCategoryId);
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      offer.food_name?.toLowerCase().includes(q) ||
      offer.donor_name?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  if (loading) {
    return (
      <div className="rdb-layout">
        <ReceiverSidebar onLogout={handleLogout} activePage="browse" />
        <main className="rdb-main">
          <div className="rdb-loading-screen">
            <div className="rdb-spinner" />
            <p>Loading available offers…</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rdb-layout">
        <ReceiverSidebar onLogout={handleLogout} activePage="browse" />
        <main className="rdb-main">
          <div className="rdb-error-screen">
            <p className="rdb-error-msg">{error}</p>
            <button className="rdb-retry-btn" onClick={fetchOffers}>Retry</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="rdb-layout">
      <ReceiverSidebar onLogout={handleLogout} activePage="browse" />

      <main className="rdb-main">
        <div className="rdb-banner rob-banner">
          <div className="rdb-banner-text">
            <p className="rdb-banner-greeting">Welcome back, {organizationName}</p>
            <h1 className="rdb-banner-title">Browse Offers</h1>
            <p className="rdb-banner-subtitle">
              Find available food donations near you and accept the ones that match your needs.
            </p>
          </div>
          <div className="rdb-banner-icon">
            <RestaurantIcon sx={{ fontSize: 48, color: '#fff' }} />
          </div>
          <div className="rob-banner-stat">
            <span className="rob-banner-stat-num">{offers.length}</span>
            <span className="rob-banner-stat-label">Offers Available</span>
          </div>
        </div>

        <div className="rob-controls">
          <div className="rob-search-wrap">
            <SearchIcon className="rob-search-icon" sx={{ fontSize: 20 }} />
            <input
              type="text"
              className="rob-search-input"
              placeholder="Search by food name or donor…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={`rob-translate-btn ${lang === 'ar' ? 'rob-translate-btn--active' : ''}`}
            onClick={handleTranslateToggle}
            disabled={translating}
            title={lang === 'ar' ? 'Switch back to English' : 'Translate offers to Arabic'}
          >
            {translating ? (
              <>
                <AutoAwesomeIcon sx={{ fontSize: 16 }} className="rob-translate-spin" />
                {LABELS[lang].translating}
              </>
            ) : (
              <>
                <TranslateIcon sx={{ fontSize: 16 }} />
                {lang === 'ar' ? LABELS.ar.revertBtn : LABELS.en.translateBtn}
              </>
            )}
          </button>

          <div className="rob-filter-wrap">
            <FilterListIcon className="rob-filter-icon" sx={{ fontSize: 18 }} />
            <select
              className="rob-filter-select"
              value={activeCategoryId}
              onChange={e => setActiveCategoryId(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="rob-results-hint">
          Showing <strong>{filteredOffers.length}</strong> offer{filteredOffers.length !== 1 ? 's' : ''}
          {activeCategoryId !== 'all' && ` in selected category`}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>

        {translateError && (
          <div className="rob-translate-error">{translateError}</div>
        )}

        {lang === 'ar' && (
          <div className="rob-translate-banner" dir="rtl">
            <AutoAwesomeIcon sx={{ fontSize: 16 }} />
            <span>{LABELS.ar.translatedBanner}</span>
          </div>
        )}

        {filteredOffers.length === 0 ? (
          <div className="rdb-empty-state rob-empty-state">
            <p>No offers found. Try adjusting your search or category.</p>
          </div>
        ) : (
          <div className="rob-grid">
            {filteredOffers.map(offer => (
              <OfferCard
                key={offer.offer_id}
                offer={offer}
                onAccept={handleAccept}
                onDetails={handleDetails}
                accepting={accepting}
                lang={lang}
                translation={translations[offer.offer_id]}
              />
            ))}
          </div>
        )}
      </main>
    <DashboardChatbot role="Receiver" />
            </div>
  );
};

export default ReceiverBrowseOffers;