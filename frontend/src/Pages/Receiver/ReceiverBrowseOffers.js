// // ============================================================
// //  FeedHope — Omar & Hanan
// //  Pages/Receiver/ReceiverBrowseOffers.js
// //
// //  Fully dynamic – all data comes from backend API.
// //  No fake categories, no mock offers, no static placeholders.
// // ============================================================

// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';
// import '../../Styles/Receiver/ReceiverBrowseOffers.css';

// // MUI Icons (only for UI decoration – data comes from DB)
// import SearchIcon from '@mui/icons-material/Search';
// import FilterListIcon from '@mui/icons-material/FilterList';
// import LocationOnIcon from '@mui/icons-material/LocationOn';
// import ScaleIcon from '@mui/icons-material/Scale';
// import AccessTimeIcon from '@mui/icons-material/AccessTime';
// import EventIcon from '@mui/icons-material/Event';
// import StorefrontIcon from '@mui/icons-material/Storefront';
// import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
// import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
// import RestaurantIcon from '@mui/icons-material/Restaurant';
// import BakeryDiningIcon from '@mui/icons-material/BakeryDining';
// import GrainIcon from '@mui/icons-material/Grain';
// import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
// import SetMealIcon from '@mui/icons-material/SetMeal';
// import EmojiFoodBeverageIcon from '@mui/icons-material/EmojiFoodBeverage';
// import WarehouseIcon from '@mui/icons-material/Warehouse';
// import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';

// // Map category names (from DB) to display labels and icons
// const getCategoryIcon = (categoryName) => {
//   const name = categoryName?.toLowerCase() || '';
//   if (name.includes('meal') || name.includes('prepared')) return <RestaurantIcon fontSize="small" />;
//   if (name.includes('bakery')) return <BakeryDiningIcon fontSize="small" />;
//   if (name.includes('grain')) return <GrainIcon fontSize="small" />;
//   if (name.includes('beverage')) return <LocalDrinkIcon fontSize="small" />;
//   if (name.includes('seafood')) return <SetMealIcon fontSize="small" />;
//   if (name.includes('dairy')) return <EmojiFoodBeverageIcon fontSize="small" />;
//   if (name.includes('canned')) return <WarehouseIcon fontSize="small" />;
//   return <RestaurantIcon fontSize="small" />;
// };

// const formatExpiry = (datetime) => {
//   if (!datetime) return 'N/A';
//   return new Date(datetime).toLocaleString();
// };

// const OfferCard = ({ offer, onAccept, accepting }) => {
//   const weight = offer.quantity_by_kg ? `${offer.quantity_by_kg} kg` : '—';
//   const portions = offer.number_of_person || 0;
//   const donorAddress = [offer.street, offer.city].filter(Boolean).join(', ') || 'Address not provided';

//   return (
//     <article className="rob-card">
//       <div className="rob-card-img" style={{ background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//         <ImageNotSupportedIcon style={{ fontSize: 48, color: '#aaa' }} />
//         <span className="rob-category-badge">
//           {getCategoryIcon(offer.category_name)}
//           {offer.category_name || 'General'}
//         </span>
//         <span className="rob-portions-badge" title="Available portions">
//           {portions}
//           <span className="rob-portions-label">portions</span>
//         </span>
//       </div>

//       <div className="rob-card-body">
//         <h3 className="rob-offer-title">{offer.food_name}</h3>
//         <p className="rob-offer-donor">
//           <StorefrontIcon sx={{ fontSize: 14 }} />
//           {offer.donor_name}
//         </p>
//         <p className="rob-offer-desc">{offer.description || 'No description provided'}</p>

//         <div className="rob-offer-meta">
//           <span className="rob-meta-item">
//             <ScaleIcon sx={{ fontSize: 14 }} />
//             {weight}
//           </span>
//           <span className="rob-meta-item">
//             <LocationOnIcon sx={{ fontSize: 14 }} />
//             {donorAddress}
//           </span>
//           <span className="rob-meta-item rob-meta-item--expiry">
//             <EventIcon sx={{ fontSize: 14 }} />
//             Expires: {formatExpiry(offer.expiration_date_and_time)}
//           </span>
//         </div>

//         <div className="rob-card-actions">
//           <button className="rob-btn-details">
//             <InfoOutlinedIcon sx={{ fontSize: 16 }} />
//             Details
//           </button>
//           <button
//             className="rob-btn-accept"
//             onClick={() => onAccept(offer.offer_id)}
//             disabled={accepting === offer.offer_id}
//           >
//             <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
//             {accepting === offer.offer_id ? 'Accepting…' : 'Accept Offer'}
//           </button>
//         </div>
//       </div>
//     </article>
//   );
// };

// const ReceiverBrowseOffers = () => {
//   const navigate = useNavigate();
//   const stored = localStorage.getItem('feedhope_user');
//   const user = stored ? JSON.parse(stored) : null;
//   const firstName = user?.name?.split(' ')[0] || 'Receiver';

//   const [offers, setOffers] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [activeCategoryId, setActiveCategoryId] = useState('all');
//   const [accepting, setAccepting] = useState(null);

//   const fetchOffers = useCallback(async () => {
//     try {
//       const res = await fetch('http://localhost:5000/api/offers');
//       if (!res.ok) throw new Error('Failed to fetch offers');
//       const data = await res.json();
//       setOffers(data);
//     } catch (err) {
//       setError(err.message);
//     }
//   }, []);

//   const fetchCategories = useCallback(async () => {
//     try {
//       const res = await fetch('http://localhost:5000/api/categories');
//       if (!res.ok) throw new Error('Failed to fetch categories');
//       const data = await res.json();
//       setCategories(data);
//     } catch (err) {
//       console.error('Category fetch error:', err);
//       // non‑critical – UI will still work
//     }
//   }, []);

//   useEffect(() => {
//     const loadData = async () => {
//       setLoading(true);
//       await Promise.all([fetchOffers(), fetchCategories()]);
//       setLoading(false);
//     };
//     loadData();
//   }, [fetchOffers, fetchCategories]);

//   const handleLogout = () => {
//     localStorage.removeItem('feedhope_user');
//     navigate('/signin');
//   };

//   const handleAccept = async (offerId) => {
//     if (!user?.user_id) {
//       alert('You must be logged in to accept an offer.');
//       return;
//     }
//     setAccepting(offerId);
//     try {
//       const res = await fetch('http://localhost:5000/api/receiver/accept-offer', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           offerId: offerId,
//           receiverId: user.user_id,
//         }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || 'Accept failed');
//       alert('Offer accepted successfully!');
//       fetchOffers(); // refresh list
//     } catch (err) {
//       alert(err.message);
//     } finally {
//       setAccepting(null);
//     }
//   };

//   const filteredOffers = offers.filter(offer => {
//     const matchesCat = activeCategoryId === 'all' || offer.category_id === activeCategoryId;
//     const q = searchQuery.toLowerCase();
//     const matchesSearch =
//       offer.food_name?.toLowerCase().includes(q) ||
//       offer.donor_name?.toLowerCase().includes(q);
//     return matchesCat && matchesSearch;
//   });

//   if (loading) {
//     return (
//       <div className="rdb-layout">
//         <ReceiverSidebar onLogout={handleLogout} unreadCount={0} activePage="browse" />
//         <main className="rdb-main">
//           <div className="rdb-loading-screen">
//             <div className="rdb-spinner" />
//             <p>Loading available offers…</p>
//           </div>
//         </main>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="rdb-layout">
//         <ReceiverSidebar onLogout={handleLogout} unreadCount={0} activePage="browse" />
//         <main className="rdb-main">
//           <div className="rdb-error-screen">
//             <p className="rdb-error-msg">{error}</p>
//             <button className="rdb-retry-btn" onClick={fetchOffers}>Retry</button>
//           </div>
//         </main>
//       </div>
//     );
//   }

//   return (
//     <div className="rdb-layout">
//       <ReceiverSidebar onLogout={handleLogout} unreadCount={0} activePage="browse" />

//       <main className="rdb-main">
//         <div className="rdb-banner rob-banner">
//           <div className="rdb-banner-text">
//             <p className="rdb-banner-greeting">Welcome back, {firstName}</p>
//             <h1 className="rdb-banner-title">Browse Offers</h1>
//             <p className="rdb-banner-subtitle">
//               Find available food donations near you and accept the ones that match your needs.
//             </p>
//           </div>
//           <div className="rdb-banner-icon">
//             <RestaurantIcon sx={{ fontSize: 48, color: '#fff' }} />
//           </div>
//           <div className="rob-banner-stat">
//             <span className="rob-banner-stat-num">{offers.length}</span>
//             <span className="rob-banner-stat-label">Offers Available</span>
//           </div>
//         </div>

//         <div className="rob-controls">
//           <div className="rob-search-wrap">
//             <SearchIcon className="rob-search-icon" sx={{ fontSize: 20 }} />
//             <input
//               type="text"
//               className="rob-search-input"
//               placeholder="Search by food name or donor…"
//               value={searchQuery}
//               onChange={e => setSearchQuery(e.target.value)}
//             />
//           </div>

//           <div className="rob-filter-wrap">
//             <FilterListIcon className="rob-filter-icon" sx={{ fontSize: 18 }} />
//             <select
//               className="rob-filter-select"
//               value={activeCategoryId}
//               onChange={e => setActiveCategoryId(e.target.value)}
//             >
//               <option value="all">All Categories</option>
//               {categories.map(cat => (
//                 <option key={cat.category_id} value={cat.category_id}>
//                   {cat.category_name}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>

//         <p className="rob-results-hint">
//           Showing <strong>{filteredOffers.length}</strong> offer{filteredOffers.length !== 1 ? 's' : ''}
//           {activeCategoryId !== 'all' && ` in selected category`}
//           {searchQuery && ` matching "${searchQuery}"`}
//         </p>

//         {filteredOffers.length === 0 ? (
//           <div className="rdb-empty-state rob-empty-state">
//             <p>No offers found. Try adjusting your search or category.</p>
//           </div>
//         ) : (
//           <div className="rob-grid">
//             {filteredOffers.map(offer => (
//               <OfferCard
//                 key={offer.offer_id}
//                 offer={offer}
//                 onAccept={handleAccept}
//                 accepting={accepting}
//               />
//             ))}
//           </div>
//         )}
//       </main>
//     </div>
//   );
// };

// export default ReceiverBrowseOffers;
















// ============================================================
//  FeedHope — Omar & Hanan
//  Pages/Receiver/ReceiverBrowseOffers.js
//
//  Fully dynamic – all data comes from backend API.
//  "Details" button now navigates to /receiver-offer/:offerId
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReceiverSidebar from '../../Components/Receiver/ReceiverSidebar';
import '../../Styles/Receiver/ReceiverBrowseOffers.css';

// MUI Icons
import SearchIcon             from '@mui/icons-material/Search';
import FilterListIcon         from '@mui/icons-material/FilterList';
import LocationOnIcon         from '@mui/icons-material/LocationOn';
import ScaleIcon              from '@mui/icons-material/Scale';
import EventIcon              from '@mui/icons-material/Event';
import StorefrontIcon         from '@mui/icons-material/Storefront';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon       from '@mui/icons-material/InfoOutlined';
import RestaurantIcon         from '@mui/icons-material/Restaurant';
import BakeryDiningIcon       from '@mui/icons-material/BakeryDining';
import GrainIcon              from '@mui/icons-material/Grain';
import LocalDrinkIcon         from '@mui/icons-material/LocalDrink';
import SetMealIcon            from '@mui/icons-material/SetMeal';
import EmojiFoodBeverageIcon  from '@mui/icons-material/EmojiFoodBeverage';
import WarehouseIcon          from '@mui/icons-material/Warehouse';
import ImageNotSupportedIcon  from '@mui/icons-material/ImageNotSupported';

// Map category names (from DB) to display icons
const getCategoryIcon = (categoryName) => {
  const name = categoryName?.toLowerCase() || '';
  if (name.includes('meal') || name.includes('prepared')) return <RestaurantIcon fontSize="small" />;
  if (name.includes('bakery'))   return <BakeryDiningIcon fontSize="small" />;
  if (name.includes('grain'))    return <GrainIcon fontSize="small" />;
  if (name.includes('beverage')) return <LocalDrinkIcon fontSize="small" />;
  if (name.includes('seafood'))  return <SetMealIcon fontSize="small" />;
  if (name.includes('dairy'))    return <EmojiFoodBeverageIcon fontSize="small" />;
  if (name.includes('canned'))   return <WarehouseIcon fontSize="small" />;
  return <RestaurantIcon fontSize="small" />;
};

const formatExpiry = (datetime) => {
  if (!datetime) return 'N/A';
  return new Date(datetime).toLocaleString();
};

// ── OfferCard now receives `onDetails` prop ──
const OfferCard = ({ offer, onAccept, onDetails, accepting }) => {
  const weight      = offer.quantity_by_kg ? `${offer.quantity_by_kg} kg` : '—';
  const portions    = offer.number_of_person || 0;
  const donorAddress = [offer.street, offer.city].filter(Boolean).join(', ') || 'Address not provided';

  return (
    <article className="rob-card">
      <div className="rob-card-img" style={{ background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ImageNotSupportedIcon style={{ fontSize: 48, color: '#aaa' }} />
        <span className="rob-category-badge">
          {getCategoryIcon(offer.category_name)}
          {offer.category_name || 'General'}
        </span>
        <span className="rob-portions-badge" title="Available portions">
          {portions}
          <span className="rob-portions-label">portions</span>
        </span>
      </div>

      <div className="rob-card-body">
        <h3 className="rob-offer-title">{offer.food_name}</h3>
        <p className="rob-offer-donor">
          <StorefrontIcon sx={{ fontSize: 14 }} />
          {offer.donor_name}
        </p>
        <p className="rob-offer-desc">{offer.description || 'No description provided'}</p>

        <div className="rob-offer-meta">
          <span className="rob-meta-item">
            <ScaleIcon sx={{ fontSize: 14 }} />
            {weight}
          </span>
          <span className="rob-meta-item">
            <LocationOnIcon sx={{ fontSize: 14 }} />
            {donorAddress}
          </span>
          <span className="rob-meta-item rob-meta-item--expiry">
            <EventIcon sx={{ fontSize: 14 }} />
            Expires: {formatExpiry(offer.expiration_date_and_time)}
          </span>
        </div>

        <div className="rob-card-actions">
          {/* ── Details button navigates to the detail page ── */}
          <button
            className="rob-btn-details"
            onClick={() => onDetails(offer.offer_id)}
          >
            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            Details
          </button>
          <button
            className="rob-btn-accept"
            onClick={() => onAccept(offer.offer_id)}
            disabled={accepting === offer.offer_id}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
            {accepting === offer.offer_id ? 'Accepting…' : 'Accept Offer'}
          </button>
        </div>
      </div>
    </article>
  );
};

const ReceiverBrowseOffers = () => {
  const navigate = useNavigate();
  const stored   = localStorage.getItem('feedhope_user');
  const user     = stored ? JSON.parse(stored) : null;
  const firstName = user?.name?.split(' ')[0] || 'Receiver';

  const [offers,           setOffers]           = useState([]);
  const [categories,       setCategories]       = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [accepting,        setAccepting]        = useState(null);

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

  const handleLogout = () => {
    localStorage.removeItem('feedhope_user');
    navigate('/signin');
  };

  // ── Navigate to Offer Details page ──
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ offerId, receiverId: user.user_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Accept failed');
      alert('Offer accepted successfully!');
      fetchOffers();
    } catch (err) {
      alert(err.message);
    } finally {
      setAccepting(null);
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesCat    = activeCategoryId === 'all' || offer.category_id === activeCategoryId;
    const q             = searchQuery.toLowerCase();
    const matchesSearch =
      offer.food_name?.toLowerCase().includes(q) ||
      offer.donor_name?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  if (loading) {
    return (
      <div className="rdb-layout">
        <ReceiverSidebar onLogout={handleLogout} unreadCount={0} activePage="browse" />
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
        <ReceiverSidebar onLogout={handleLogout} unreadCount={0} activePage="browse" />
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
      <ReceiverSidebar onLogout={handleLogout} unreadCount={0} activePage="browse" />

      <main className="rdb-main">
        <div className="rdb-banner rob-banner">
          <div className="rdb-banner-text">
            <p className="rdb-banner-greeting">Welcome back, {firstName}</p>
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
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReceiverBrowseOffers;
