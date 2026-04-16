import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorMyOffers.css';

import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const STATUS_FILTERS = ['All', 'Available', 'Accepted', 'In Transit', 'Delivered', 'Expired'];

const DonorMyOffers = () => {
    const navigate = useNavigate();

    const [user] = useState(() => {
        const saved = localStorage.getItem('feedhope_user');
        return saved ? JSON.parse(saved) : null;
    });

    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // State to handle the transparent details form
    const [selectedOffer, setSelectedOffer] = useState(null);

    const handleDelete = async (offerId) => {
        if (window.confirm("Are you sure you want to delete this offer? This action cannot be undone.")) {
            try {
                const response = await fetch(`http://localhost:5000/api/donor/delete-offer/${offerId}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    setOffers(prev => prev.filter(offer => offer.offer_id !== offerId));
                    alert("Offer deleted successfully");
                } else {
                    alert("Failed to delete the offer.");
                }
            } catch (error) {
                console.error("Error deleting offer:", error);
                alert("An error occurred while deleting.");
            }
        }
    };

    useEffect(() => {
        if (!user || !user.user_id) {
            navigate('/signin');
            return;
        }

        const fetchOffers = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(
                    `http://localhost:5000/api/donor/my-offers/${user.user_id}?status=${statusFilter}`
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
    }, [statusFilter, user, navigate]);

    const displayedOffers = useMemo(() => {
        return offers.filter((offer) =>
            offer.food_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [offers, searchTerm]);

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} activePage="my-offers" />

            <main className="ddb-main">
                <div className="my-offers-container">
                    <div className="offers-header">
                        <div>
                            <h1>My Offers</h1>
                            <p className="subtitle">View and manage your donation history</p>
                        </div>
                        <button className="new-offer-btn" onClick={() => navigate('/donor-new-offer')}>
                            <AddIcon /> New Offer
                        </button>
                    </div>

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

                    <div className="offers-table-wrapper">
                        {isLoading ? (
                            <div className="loading-container">
                                <div className="rdb-spinner" style={{ margin: '0 auto 10px' }}></div>
                                <p>Loading Offers...</p>
                            </div>
                        ) : (
                            <table className="offers-table">
                                <thead>
                                    <tr>
                                        <th>Offer ID</th>
                                        <th>Food Name</th>
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
                                                <td>#{offer.offer_id}</td>
                                                <td className="title-cell">{offer.food_name}</td>
                                                <td>{offer.category_name || 'Uncategorized'}</td>
                                                <td>{offer.quantity_by_kg} kg</td>
                                                <td>
                                                    <span className={`status-badge ${offer.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                                        {offer.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {new Date(offer.created_at).toLocaleString('en-GB', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit', hour12: true
                                                    })}
                                                </td>
                                                <td className="actions-cell">
                                                    <button
                                                        className="action-btn view-btn"
                                                        onClick={() => setSelectedOffer(offer)}
                                                        title="View Details"
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </button>
                                                    <button
                                                        className="action-btn delete-btn"
                                                        onClick={() => handleDelete(offer.offer_id)}
                                                        title="Delete Offer"
                                                    >
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr className="empty-row">
                                            <td colSpan="7">No offers found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="offers-footer">
                        <p>Showing {displayedOffers.length} {displayedOffers.length === 1 ? 'offer' : 'offers'}</p>
                    </div>
                </div>

                {/* Glassmorphism Details Form Overlay */}
                {selectedOffer && (
                    <div className="details-overlay" onClick={() => setSelectedOffer(null)}>
                        <div className="details-form-container" onClick={(e) => e.stopPropagation()}>
                            <div className="details-header">
                                <h2>Offer Details</h2>
                                <button className="close-btn" onClick={() => setSelectedOffer(null)}>&times;</button>
                            </div>

                            <div className="details-body">
                                <div className="detail-group">
                                    <label>Food Name</label>
                                    <p>{selectedOffer.food_name}</p>
                                </div>
                                <div className="detail-row">
                                    <div className="detail-group">
                                        <label>Category</label>
                                        <p>{selectedOffer.category_name || 'Uncategorized'}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label>Quantity</label>
                                        <p>{selectedOffer.quantity_by_kg} kg</p>
                                    </div>
                                </div>
                                <div className="detail-group">
                                    <label>Current Status</label>
                                    <p className={`status-text ${selectedOffer.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {selectedOffer.status}
                                    </p>
                                </div>
                                <div className="detail-row">
                                    <div className="detail-group">
                                        <label>Created At</label>
                                        <p>{new Date(selectedOffer.created_at).toLocaleString()}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label>ID</label>
                                        <p>#{selectedOffer.offer_id}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="details-footer">
                                <button className="done-btn" onClick={() => setSelectedOffer(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DonorMyOffers;