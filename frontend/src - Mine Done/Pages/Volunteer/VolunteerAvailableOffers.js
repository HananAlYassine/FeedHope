// ============================================================
//  FeedHope — Volunteer Available Offers Page (Blue Theme)
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VolunteerSidebar from '../../Components/Volunteer/VolunteerSidebar';
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

const VolunteerAvailableOffers = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [weightFilter, setWeightFilter] = useState('all');
    const [acceptingId, setAcceptingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // Mock data
    const [offers, setOffers] = useState([
        {
            id: 1,
            title: 'Soup & Sandwiches',
            donor: 'Fresh Bites Restaurant',
            description: 'Homemade vegetable soup and assorted sandwiches. Perfect for distribution.',
            location: '123 Main Street, Downtown',
            time: '15:00 - 17:00',
            category: 'Prepared Meals',
            receiver: 'Hope Community Shelter',
            weight: 10
        },
        {
            id: 2,
            title: 'Fresh Vegetables',
            donor: 'GreenGrocer Market',
            description: 'Fresh organic vegetables including tomatoes, cucumbers, and lettuce.',
            location: '45 Market St, Cityville',
            time: '14:00 - 16:00',
            category: 'Produce',
            receiver: 'City Food Bank',
            weight: 25
        },
        {
            id: 3,
            title: 'Bread & Pastries',
            donor: 'Sunrise Bakery',
            description: 'Assorted fresh bread, croissants, and pastries.',
            location: '89 Bakery Ave, Cityville',
            time: '10:00 - 12:00',
            category: 'Bakery',
            receiver: 'Downtown Mission',
            weight: 15
        }
    ]);

    const handleAccept = (offerId) => {
        setAcceptingId(offerId);
        // Simulate API call
        setTimeout(() => {
            setOffers(prev => prev.filter(offer => offer.id !== offerId));
            setAcceptingId(null);
            setSuccessMessage('Offer accepted! You can view it in "My Deliveries".');
            setTimeout(() => setSuccessMessage(''), 3000);
        }, 800);
    };

    const handleLogout = () => {
        localStorage.removeItem('volunteer_user');
        navigate('/signin');
    };

    // Filter offers based on search and weight
    const filteredOffers = offers.filter(offer => {
        const matchesSearch = offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            offer.donor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            offer.receiver.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWeight = weightFilter === 'all' ||
            (weightFilter === 'under10' && offer.weight < 10) ||
            (weightFilter === 'over10' && offer.weight > 10);
        return matchesSearch && matchesWeight;
    });

    return (
        <div className="vao-layout">
            <VolunteerSidebar user={{ name: 'John Smith' }} onLogout={handleLogout} activePage="available-offers" />

            <main className="vao-main">
                <div className="vao-header">
                    <h1 className="vao-title">Available Deliveries</h1>
                    <p className="vao-subtitle">Browse and accept food donation offers near you</p>
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
                        <option value="over10">&gt; 10 KG</option>
                    </select>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="vao-success-message">
                        <CheckCircleIcon /> {successMessage}
                    </div>
                )}

                {/* Offers List */}
                {filteredOffers.length === 0 ? (
                    <div className="vao-empty-state">
                        <p>No available offers match your criteria.</p>
                        <button onClick={() => { setSearchTerm(''); setWeightFilter('all'); }}>Clear Filters</button>
                    </div>
                ) : (
                    <div className="vao-list-container">
                        {filteredOffers.map(offer => (
                            <div key={offer.id} className="vao-list-item">
                                <div className="vao-item-header">
                                    <h3 className="vao-item-title">{offer.title}</h3>
                                    <span className="vao-item-weight">{offer.weight} KG</span>
                                </div>
                                <div className="vao-item-donor">
                                    <PersonIcon fontSize="small" /> {offer.donor}
                                </div>
                                <p className="vao-item-description">{offer.description}</p>
                                <div className="vao-item-details">
                                    <span><LocationOnIcon fontSize="small" /> {offer.location}</span>
                                    <span><AccessTimeIcon fontSize="small" /> {offer.time}</span>
                                    <span><Inventory2Icon fontSize="small" /> {offer.category}</span>
                                </div>
                                <div className="vao-item-footer">
                                    <div className="vao-item-receiver">
                                        <strong>Receiver:</strong> {offer.receiver}
                                    </div>
                                    <button
                                        className="vao-accept-btn"
                                        onClick={() => handleAccept(offer.id)}
                                        disabled={acceptingId === offer.id}
                                    >
                                        {acceptingId === offer.id ? 'Accepting...' : 'Accept Delivery'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination (if needed) */}
                {filteredOffers.length > 0 && (
                    <div className="vao-pagination-container">
                        <span className="vao-pagination-text">Showing 1-{filteredOffers.length} of {filteredOffers.length} items</span>
                        <div className="vao-pagination-controls">
                            <button className="vao-page-arrow"><ChevronLeftIcon /></button>
                            <button className="vao-page-number active">1</button>
                            <button className="vao-page-arrow"><ChevronRightIcon /></button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default VolunteerAvailableOffers;