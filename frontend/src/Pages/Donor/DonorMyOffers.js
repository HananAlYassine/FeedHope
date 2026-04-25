import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import Skeleton from '../../Components/Shared/Skeleton';
import EmptyState from '../../Components/Shared/EmptyState';
import Button from '../../Components/Shared/Button';
import '../../Styles/Donor/DonorMyOffers.css';

import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import GrassIcon from '@mui/icons-material/Grass';

const DIETARY_OPTIONS = [
    'Vegetarian', 'Vegan', 'Halal', 'Kosher',
    'Gluten-free', 'Dairy-free', 'Nut-free', 'Contains Allergens',
];

const STATUS_FILTERS = ['All', 'Available', 'Accepted', 'In_delivery', 'Delivered', 'Expired'];

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
    const [categories, setCategories] = useState([]);

    // Modals & Menus State
    const [selectedOffer, setSelectedOffer] = useState(null);
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLoadingOffer, setIsLoadingOffer] = useState(false);
    const [editFormData, setEditFormData] = useState({
        offer_id: '',
        food_name: '',
        description: '',
        dietary_information: '',
        quantity_by_kg: '',
        number_of_person: '',
        expiration_date_and_time: '',
        pickup_time: '',
        category_id: ''
    });

    // Fetch categories on component mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/categories');
                if (response.ok) {
                    const data = await response.json();
                    setCategories(data);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Helper function to parse dietary string into array
    const parseDietarySelections = (dietaryString) => {
        if (!dietaryString || dietaryString === 'No specific dietary flags') return [];
        return dietaryString.split(', ').filter(item => item.length > 0);
    };

    // Helper function to convert dietary array to string
    const dietaryArrayToString = (dietaryArray) => {
        if (!dietaryArray || dietaryArray.length === 0) return 'No specific dietary flags';
        return dietaryArray.join(', ');
    };

    // Handle dietary checkbox changes in edit form
    const handleDietaryChange = (option) => {
        const currentSelections = parseDietarySelections(editFormData.dietary_information);
        let newSelections;

        if (currentSelections.includes(option)) {
            newSelections = currentSelections.filter(item => item !== option);
        } else {
            newSelections = [...currentSelections, option];
        }

        setEditFormData({
            ...editFormData,
            dietary_information: dietaryArrayToString(newSelections)
        });
    };

    // Check if a dietary option is selected
    const isDietarySelected = (option) => {
        const selections = parseDietarySelections(editFormData.dietary_information);
        return selections.includes(option);
    };

    // Toggle Action Menu
    const toggleActionMenu = (offerId, event) => {
        event.stopPropagation();
        setActiveActionMenu(prev => prev === offerId ? null : offerId);
    };

    // Delete/Cancel Logic
    const handleDeleteClick = async (offerId) => {
        setActiveActionMenu(null);
        if (window.confirm("Are you sure you want to cancel this offer? This action cannot be undone.")) {
            try {
                const response = await fetch(`http://localhost:5000/api/donor/delete-offer/${offerId}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    setOffers(prev => prev.filter(offer => offer.offer_id !== offerId));
                    alert("Offer deleted successfully");
                } else {
                    const data = await response.json();
                    alert(data.message || "Failed to delete the offer.");
                }
            } catch (error) {
                console.error("Error deleting offer:", error);
                alert("An error occurred while deleting.");
            }
        }
    };

    // Open Edit Modal - Fetch full offer details
    const handleEditClick = async (offer) => {
        setActiveActionMenu(null);
        setIsLoadingOffer(true);
        setIsEditModalOpen(true);

        try {
            // Fetch complete offer details from API
            const response = await fetch(`http://localhost:5000/api/donor/offer/${offer.offer_id}`);

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.offer) {
                    const offerData = data.offer;

                    // Format datetime strings for HTML datetime-local input
                    const formatDateForInput = (dateString) => {
                        if (!dateString) return '';
                        const d = new Date(dateString);
                        if (isNaN(d.getTime())) return '';
                        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    };

                    setEditFormData({
                        offer_id: offerData.offer_id,
                        food_name: offerData.food_name || '',
                        description: offerData.description || '',
                        dietary_information: offerData.dietary_information || 'No specific dietary flags',
                        quantity_by_kg: offerData.quantity_by_kg || '',
                        number_of_person: offerData.number_of_person || '',
                        expiration_date_and_time: formatDateForInput(offerData.expiration_date_and_time),
                        pickup_time: formatDateForInput(offerData.pickup_time),
                        category_id: offerData.category_id || ''
                    });
                }
            } else {
                alert("Failed to load offer details");
                setIsEditModalOpen(false);
            }
        } catch (error) {
            console.error("Error fetching offer details:", error);
            alert("An error occurred while loading offer details");
            setIsEditModalOpen(false);
        } finally {
            setIsLoadingOffer(false);
        }
    };

    // Submit Edit
    const handleEditSubmit = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!editFormData.food_name.trim()) {
            alert("Food name is required");
            return;
        }
        if (!editFormData.category_id) {
            alert("Please select a category");
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/donor/edit-offer/${editFormData.offer_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editFormData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Update UI state locally with the updated offer data
                setOffers(prev => prev.map(offer =>
                    offer.offer_id === editFormData.offer_id
                        ? { ...offer, ...data.offer }
                        : offer
                ));
                setIsEditModalOpen(false);
                alert("Offer updated successfully!");
            } else {
                alert(data.message || "Failed to update offer.");
            }
        } catch (error) {
            console.error("Error updating offer:", error);
            alert("An error occurred while updating.");
        }
    };

    // Fetch offers
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

    // Filter offers based on search term
    const displayedOffers = useMemo(() => {
        return offers.filter((offer) =>
            offer.food_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [offers, searchTerm]);

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    // Get category name by ID for display
    const getCategoryName = (categoryId) => {
        const category = categories.find(cat => cat.category_id === categoryId);
        return category ? category.category_name : 'Uncategorized';
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setActiveActionMenu(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Helper to format dietary display
    const formatDietaryDisplay = (dietaryString) => {
        if (!dietaryString || dietaryString === 'No specific dietary flags') {
            return 'None specified';
        }
        return dietaryString;
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
                                    {status.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="offers-table-wrapper">
                        {isLoading ? (
                            <div style={{ padding: '20px' }}>
                                <Skeleton.Row count={6} />
                            </div>
                        ) : displayedOffers.length === 0 ? (
                            <EmptyState
                                icon={<RestaurantMenuIcon style={{ fontSize: 48 }} />}
                                title="No offers yet"
                                description="Create your first food donation to share with your community."
                                action={
                                    <Button variant="primary" leftIcon={<AddIcon />} onClick={() => navigate('/donor-new-offer')}>
                                        Create New Offer
                                    </Button>
                                }
                            />
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
                                    {displayedOffers.map((offer) => (
                                            <tr key={offer.offer_id}>
                                                <td>#{offer.offer_id}</td>
                                                <td className="title-cell">{offer.food_name}</td>
                                                <td>{offer.category_name || getCategoryName(offer.category_id)}</td>
                                                <td>{offer.quantity_by_kg} kg</td>
                                                <td>
                                                    <span className={`status-badge ${offer.status?.toLowerCase().replace(/\s+/g, '-')}`}>
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

                                                    {/* Three Dots Menu Container */}
                                                    <div className="action-menu-wrapper" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            className="action-btn menu-btn"
                                                            onClick={(e) => toggleActionMenu(offer.offer_id, e)}
                                                            title="More Actions"
                                                        >
                                                            <MoreVertIcon fontSize="small" />
                                                        </button>

                                                        {activeActionMenu === offer.offer_id && (
                                                            <div className="dropdown-menu">
                                                                <button onClick={() => handleEditClick(offer)}>
                                                                    <EditIcon fontSize="small" /> Edit Offer
                                                                </button>
                                                                <button className="danger" onClick={() => handleDeleteClick(offer.offer_id)}>
                                                                    <DeleteOutlineIcon fontSize="small" /> Cancel Offer
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="offers-footer">
                        <p>Showing {displayedOffers.length} {displayedOffers.length === 1 ? 'offer' : 'offers'}</p>
                    </div>
                </div>

                {/* View Details Modal */}
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
                                        <p>{selectedOffer.category_name || getCategoryName(selectedOffer.category_id)}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label>Quantity</label>
                                        <p>{selectedOffer.quantity_by_kg} kg</p>
                                    </div>
                                </div>
                                {selectedOffer.number_of_person && (
                                    <div className="detail-group">
                                        <label>Serves</label>
                                        <p>{selectedOffer.number_of_person} people</p>
                                    </div>
                                )}
                                {selectedOffer.description && (
                                    <div className="detail-group">
                                        <label>Description</label>
                                        <p>{selectedOffer.description}</p>
                                    </div>
                                )}
                                {selectedOffer.dietary_information && selectedOffer.dietary_information !== 'No specific dietary flags' && (
                                    <div className="detail-group">
                                        <label>Dietary Information</label>
                                        <div className="dietary-tags">
                                            {parseDietarySelections(selectedOffer.dietary_information).map((dietary, index) => (
                                                <span key={index} className="dietary-tag">
                                                    <GrassIcon fontSize="small" /> {dietary}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {selectedOffer.expiration_date_and_time && (
                                    <div className="detail-group">
                                        <label>Expiration Date</label>
                                        <p>{new Date(selectedOffer.expiration_date_and_time).toLocaleString()}</p>
                                    </div>
                                )}
                                {selectedOffer.pickup_time && (
                                    <div className="detail-group">
                                        <label>Pickup Time</label>
                                        <p>{new Date(selectedOffer.pickup_time).toLocaleString()}</p>
                                    </div>
                                )}
                                <div className="detail-group">
                                    <label>Current Status</label>
                                    <p className={`status-text ${selectedOffer.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {selectedOffer.status}
                                    </p>
                                </div>
                            </div>
                            <div className="details-footer">
                                <button className="done-btn" onClick={() => setSelectedOffer(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Offer Modal - Fixed Size No Scroll */}
                {isEditModalOpen && (
                    <div className="details-overlay" onClick={() => setIsEditModalOpen(false)}>
                        <div
                            className="details-form-container edit-modal-fixed"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="details-header">
                                <h2>Edit Offer</h2>
                                <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>&times;</button>
                            </div>

                            {isLoadingOffer ? (
                                <div className="loading-container">
                                    <div className="rdb-spinner"></div>
                                    <p>Loading offer details...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleEditSubmit} className="edit-form-fixed">
                                    <div className="edit-form-content">
                                        <div className="detail-group edit-input-group">
                                            <label>Food Name</label>
                                            <input
                                                type="text"
                                                value={editFormData.food_name}
                                                onChange={(e) => setEditFormData({ ...editFormData, food_name: e.target.value })}
                                                required
                                                placeholder="Enter food name"
                                            />
                                        </div>

                                        <div className="detail-group edit-input-group">
                                            <label>Category</label>
                                            <select
                                                value={editFormData.category_id}
                                                onChange={(e) => setEditFormData({ ...editFormData, category_id: parseInt(e.target.value) })}
                                                required
                                            >
                                                <option value="">Select a category</option>
                                                {categories.map(category => (
                                                    <option key={category.category_id} value={category.category_id}>
                                                        {category.category_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="detail-group edit-input-group">
                                            <label>Description</label>
                                            <textarea
                                                value={editFormData.description}
                                                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                                rows="2"
                                                placeholder="Describe the food items, ingredients, preparation date, etc."
                                            />
                                        </div>

                                        {/* Dietary Information as Checkboxes */}
                                        <div className="detail-group edit-input-group">
                                            <label><GrassIcon /> Dietary Information</label>
                                            <div className="dietary-group">
                                                <div className="dietary-grid-edit">
                                                    {DIETARY_OPTIONS.map((option) => (
                                                        <label key={option} className="dietary-check-edit">
                                                            <input
                                                                type="checkbox"
                                                                checked={isDietarySelected(option)}
                                                                onChange={() => handleDietaryChange(option)}
                                                            />
                                                            <span>{option}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="row-2cols-edit">
                                            <div className="detail-group edit-input-group">
                                                <label>Quantity (kg)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={editFormData.quantity_by_kg}
                                                    onChange={(e) => setEditFormData({ ...editFormData, quantity_by_kg: e.target.value })}
                                                    placeholder="Weight in kilograms"
                                                />
                                            </div>
                                            <div className="detail-group edit-input-group">
                                                <label>Number of Persons</label>
                                                <input
                                                    type="number"
                                                    value={editFormData.number_of_person}
                                                    onChange={(e) => setEditFormData({ ...editFormData, number_of_person: e.target.value })}
                                                    placeholder="How many people can this serve?"
                                                />
                                            </div>
                                        </div>

                                        <div className="row-2cols-edit">
                                            <div className="detail-group edit-input-group">
                                                <label>Expiration Date & Time</label>
                                                <input
                                                    type="datetime-local"
                                                    value={editFormData.expiration_date_and_time}
                                                    onChange={(e) => setEditFormData({ ...editFormData, expiration_date_and_time: e.target.value })}
                                                />
                                            </div>
                                            <div className="detail-group edit-input-group">
                                                <label>Pickup Time</label>
                                                <input
                                                    type="datetime-local"
                                                    value={editFormData.pickup_time}
                                                    onChange={(e) => setEditFormData({ ...editFormData, pickup_time: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="details-footer-edit">
                                        <button type="button" className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="submit-btn">
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DonorMyOffers;