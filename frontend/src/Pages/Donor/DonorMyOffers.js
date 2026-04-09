import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorMyOffers.css';

import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Hardcoded for testing; replace with your Auth logic later
const CURRENT_DONOR_ID = 101;

const STATUS_FILTERS = ['All', 'Available', 'Accepted', 'In Transit', 'Delivered', 'Expired'];

const DonorMyOffers = () => {
    const navigate = useNavigate();

    // State Management
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // 1. Fetch data whenever statusFilter changes
    useEffect(() => {
        const fetchOffers = async () => {
            try {
                setIsLoading(true);
                // The URL includes the status as a query parameter
                const response = await fetch(
                    `http://localhost:5000/api/donor/my-offers/${CURRENT_DONOR_ID}?status=${statusFilter}`
                );

                if (!response.ok) throw new Error('Network response was not ok');

                const data = await response.json();
                setOffers(data);
            } catch (error) {
                console.error('Error fetching offers:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOffers();
    }, [statusFilter]); // Effect runs again if the user clicks a different pill

    // 2. Local Search Filter (filters the already fetched list by food name)
    const displayedOffers = useMemo(() => {
        return offers.filter((offer) =>
            offer.food_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [offers, searchTerm]);

    const handleViewOffer = (offerId) => {
        navigate(`/donor/offer-details/${offerId}`);
    };

    return (
        <div className="ddb-layout">
            <DonorSidebar />

            <main className="ddb-main">
                <div className="my-offers-container">
                    <div className="offers-header">
                        <div>
                            <h1>My Offers</h1>
                            <p className="subtitle">View and manage all your food donation offers</p>
                        </div>
                        <button className="new-offer-btn" onClick={() => navigate('/donor-new-offer')}>
                            <AddIcon />New Offer
                        </button>
                    </div>

                    {/* Search and Status Pills */}
                    <div className="search-filter-row">
                        <div className="search-wrapper">
                            <SearchIcon className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search by food name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <div className="status-pills">
                            {STATUS_FILTERS.map((status) => (
                                <button
                                    key={status}
                                    className={`status-pill ${statusFilter === status ? 'active' : ''}`}
                                    onClick={() => setStatusFilter(status)}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="offers-table-wrapper">
                        {isLoading ? (
                            <div className="loading-container">Loading Offers...</div>
                        ) : (
                            <table className="offers-table">
                                <thead>
                                    <tr>
                                        <th>Food Item</th>
                                        <th>Category</th>
                                        <th>Quantity (KG)</th>
                                        <th>Status</th>
                                        <th>Created At</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedOffers.length > 0 ? (
                                        displayedOffers.map((offer) => (
                                            <tr key={offer.offer_id}>
                                                <td className="title-cell">{offer.food_name}</td>
                                                <td>{offer.category_name}</td>
                                                <td>{offer.quantity_by_kg}</td>
                                                <td>
                                                    <span className={`status-badge ${offer.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                                        {offer.status}
                                                    </span>
                                                </td>
                                                <td>{new Date(offer.created_at).toLocaleDateString()}</td>
                                                <td className="actions-cell">
                                                    <button
                                                        className="action-icon"
                                                        onClick={() => handleViewOffer(offer.offer_id)}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr className="empty-row">
                                            <td colSpan="6">No offers found for this criteria.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="offers-footer">
                        <p>Showing {displayedOffers.length} offers</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DonorMyOffers;