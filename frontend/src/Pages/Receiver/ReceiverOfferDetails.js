// ============================================================
//  FeedHope — Omar & Hanan
//  Pages/Receiver/ReceiverOfferDetails.js
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';
import DashboardChatbot from '../../Components/Shared/DashboardChatbot';
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
import TranslateIcon from '@mui/icons-material/Translate';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// Bilingual UI labels for the details page.
const LABELS = {
  en: {
    welcome: 'Welcome back,',
    title: 'Offer Details',
    subtitle: 'Review the complete information and accept this donation.',
    back: 'Back to Browse',
    portions: 'Portions',
    description: 'Description',
    descriptionMissing: 'No description provided.',
    category: 'Category',
    quantityKg: 'Quantity (KG)',
    expiryDate: 'Expiry Date',
    pickupAddress: 'Pickup Address',
    pickupTime: 'Pickup Time',
    addressMissing: 'Address not provided',
    dietary: 'Dietary Information',
    dietaryMissing: 'No dietary information provided.',
    accept: 'Accept Offer',
    accepting: 'Accepting…',
    unavailable: 'This offer is no longer available for acceptance.',
    statusAvailable: 'Available',
    statusAccepted: 'Accepted',
    statusUnknown: 'Unknown',
    translateBtn: 'العربية',
    revertBtn: 'English',
    translating: 'Translating…',
    translatedBanner: 'Translated to Arabic by AI',
  },
  ar: {
    welcome: 'مرحباً بك،',
    title: 'تفاصيل العرض',
    subtitle: 'راجع المعلومات الكاملة واقبل هذا التبرع.',
    back: 'العودة إلى العروض',
    portions: 'حصص',
    description: 'الوصف',
    descriptionMissing: 'لا يوجد وصف.',
    category: 'الفئة',
    quantityKg: 'الكمية (كغ)',
    expiryDate: 'تاريخ الانتهاء',
    pickupAddress: 'عنوان الاستلام',
    pickupTime: 'وقت الاستلام',
    addressMissing: 'العنوان غير متوفر',
    dietary: 'المعلومات الغذائية',
    dietaryMissing: 'لا توجد معلومات غذائية.',
    accept: 'قبول العرض',
    accepting: 'جارٍ القبول…',
    unavailable: 'هذا العرض لم يعد متاحاً للقبول.',
    statusAvailable: 'متاح',
    statusAccepted: 'مقبول',
    statusUnknown: 'غير معروف',
    translateBtn: 'العربية',
    revertBtn: 'English',
    translating: 'جارٍ الترجمة…',
    translatedBanner: 'تمت الترجمة إلى العربية بواسطة الذكاء الاصطناعي',
  },
};

// ----- Helper Functions -----

// Converts date into readable format. Uses Arabic locale when lang='ar'
// so the month name and digits are localized too (Feb 14, 2026 → ١٤ فبراير ٢٠٢٦).
const formatDate = (dt, lang = 'en') => {
  if (!dt) return 'N/A';
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  return new Date(dt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Converts time into 03:45 PM (or Arabic equivalent when lang='ar').
const formatTime = (dt, lang = 'en') => {
  if (!dt) return 'N/A';
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const d = new Date(dt);
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

const ReceiverOfferDetails = () => {
  const navigate = useNavigate();

  const { offerId } = useParams(); // offerId — extracted from URL
  const stored = localStorage.getItem('feedhope_user'); // Reads user data from browser storage
  const user = stored ? JSON.parse(stored) : null; // Converts JSON -> object

  const organizationName = user?.name || 'Receiver';

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  // ── AI Translate (Arabic) ─────────────────────────────────
  const [lang, setLang] = useState('en');
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState('');

  const fetchOffer = useCallback(async () => {
    setLoading(true); // Reset UI before fetching
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/offers/${offerId}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to fetch offer details');
      }
      const data = await res.json();
      setOffer(data);  // Save data into state
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
    // -- Check login --
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
      window.dispatchEvent(new Event('notification-read'));
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

  // ── Translate handler ────────────────────────────────────
  // First click: fetch the Arabic translation for THIS offer once,
  // cache it, then flip lang→ar. Toggling back is instant.
  const handleTranslateToggle = async () => {
    setTranslateError('');
    if (lang === 'ar') {
      setLang('en');
      return;
    }
    if (translation) {
      setLang('ar');
      return;
    }
    if (!offer) return;
    setTranslating(true);
    try {
      const res = await fetch('http://localhost:5000/api/ai/translate-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offers: [{
            offer_id: offer.offer_id,
            food_name: offer.food_name,
            description: offer.description,
            category_name: offer.category_name,
            donor_name: offer.donor_name,
            address: [offer.street, offer.city, offer.country].filter(Boolean).join(', '),
            dietary_information: offer.dietary_information,
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTranslateError(data.error || 'Translation failed.');
        return;
      }
      const tr = data.translations?.[String(offer.offer_id)] || null;
      if (!tr) {
        setTranslateError('Translation unavailable.');
        return;
      }
      setTranslation(tr);
      setLang('ar');
    } catch {
      setTranslateError('Could not reach the AI service.');
    } finally {
      setTranslating(false);
    }
  };

// Returns CSS class depending on Status
  const statusClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'available': return 'rod-status rod-status--available';
      case 'accepted': return 'rod-status rod-status--accepted';
      default: return 'rod-status rod-status--other';
    }
  };

  const t = LABELS[lang] || LABELS.en;
  const isAr = lang === 'ar';

  // Localized status label.
  const statusLabel = (status) => {
    if (!status) return t.statusUnknown;
    const key = status.toLowerCase();
    if (key === 'available') return t.statusAvailable;
    if (key === 'accepted')  return t.statusAccepted;
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // English address always available; Arabic version comes from the AI when
  // translation is loaded.
  const englishAddress = offer
    ? [offer.street, offer.city, offer.country].filter(Boolean).join(', ') || t.addressMissing
    : '';
  const pickupAddress = isAr && translation?.address
    ? translation.address
    : englishAddress;

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

  // Resolve each translatable field to AR (if available) or EN.
  const tx = (key, fallback) =>
    (isAr && translation && translation[key]) || offer[key] || fallback;

  const foodName     = tx('food_name', '');
  const description  = tx('description', t.descriptionMissing);
  const categoryName = tx('category_name', '—');
  const donorName    = tx('donor_name', '');
  const dietaryInfo  = tx('dietary_information', t.dietaryMissing);

  return (
    <div className="rdb-layout">
      <ReceiverSidebar onLogout={handleLogout} activePage="browse" />

      <main className="rdb-main" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="rdb-banner rob-banner">
          <div className="rdb-banner-text">
            <p className="rdb-banner-greeting">{t.welcome} {organizationName}</p>
            <h1 className="rdb-banner-title">{t.title}</h1>
            <p className="rdb-banner-subtitle">{t.subtitle}</p>
          </div>
          <div className="rdb-banner-icon">
            <RestaurantIcon sx={{ fontSize: 48, color: '#fff' }} />
          </div>
          <div className="rob-banner-stat">
            <span className="rob-banner-stat-num">{portions}</span>
            <span className="rob-banner-stat-label">{t.portions}</span>
          </div>
        </div>

        {/* Top action row: back + AI translate */}
        <div className="rod-top-actions">
          <button className="rod-back-btn" onClick={() => navigate('/receiver-browse')}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            {t.back}
          </button>

          <button
            type="button"
            className={`rob-translate-btn ${isAr ? 'rob-translate-btn--active' : ''}`}
            onClick={handleTranslateToggle}
            disabled={translating}
            title={isAr ? 'Switch back to English' : 'Translate to Arabic'}
          >
            {translating ? (
              <>
                <AutoAwesomeIcon sx={{ fontSize: 16 }} className="rob-translate-spin" />
                {t.translating}
              </>
            ) : (
              <>
                <TranslateIcon sx={{ fontSize: 16 }} />
                {isAr ? LABELS.ar.revertBtn : LABELS.en.translateBtn}
              </>
            )}
          </button>
        </div>

        {translateError && (
          <div className="rob-translate-error">{translateError}</div>
        )}

        {isAr && (
          <div className="rob-translate-banner" dir="rtl">
            <AutoAwesomeIcon sx={{ fontSize: 16 }} />
            <span>{t.translatedBanner}</span>
          </div>
        )}

        <div className="rob-card rod-detail-card">
          <div className="rob-card-body">
            <div className="rod-card-header">
              <div>
                <h3 className="rob-offer-title">{foodName}</h3>
                <p className="rob-offer-donor">
                  <StorefrontIcon sx={{ fontSize: 14 }} />
                  {donorName}
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
                {t.description}
              </h3>
              <p className="rod-description">{description}</p>
            </section>

            <div className="rod-meta-grid">
              <div className="rod-meta-item">
                <CategoryIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">{t.category}</span>
                <span className="rod-meta-value">{categoryName}</span>
              </div>
              <div className="rod-meta-item">
                <ScaleIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">{t.quantityKg}</span>
                <span className="rod-meta-value">{offer.quantity_by_kg ? `${offer.quantity_by_kg} ${isAr ? 'كغ' : 'KG'}` : '—'}</span>
              </div>
              <div className="rod-meta-item">
                <PeopleIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">{t.portions}</span>
                <span className="rod-meta-value">{portions}</span>
              </div>
              <div className="rod-meta-item">
                <EventIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">{t.expiryDate}</span>
                <span className="rod-meta-value">{formatDate(offer.expiration_date_and_time, lang)}</span>
              </div>
              <div className="rod-meta-item">
                <LocationOnIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">{t.pickupAddress}</span>
                <span className="rod-meta-value">{pickupAddress}</span>
              </div>
              <div className="rod-meta-item">
                <AccessTimeIcon sx={{ fontSize: 16 }} className="rod-meta-icon" />
                <span className="rod-meta-label">{t.pickupTime}</span>
                <span className="rod-meta-value">{formatTime(offer.pickup_time, lang)}</span>
              </div>
            </div>

            <section className="rod-section">
              <h3 className="rod-section-title">
                <NoMealsIcon sx={{ fontSize: 17 }} />
                {t.dietary}
              </h3>
              <p className="rod-dietary">{dietaryInfo}</p>
            </section>

            {isAvailable && (
              <button className="rod-accept-btn" onClick={handleAccept} disabled={accepting}>
                <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />
                {accepting ? t.accepting : t.accept}
              </button>
            )}
            {!isAvailable && (
              <div className="rod-unavailable-notice">
                {t.unavailable}
              </div>
            )}
          </div>
        </div>
      </main>
    <DashboardChatbot role="Receiver" />
            </div>
  );
};

export default ReceiverOfferDetails;
