import React, { useState, useRef, useEffect } from 'react';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/NewOffer.css';

import TagIcon from '@mui/icons-material/Tag';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CategoryIcon from '@mui/icons-material/Category';
import LineWeightIcon from '@mui/icons-material/LineWeight';
import PeopleIcon from '@mui/icons-material/People';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import GrassIcon from '@mui/icons-material/Grass';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const DIETARY_OPTIONS = [
    'Vegetarian', 'Vegan', 'Halal', 'Kosher',
    'Gluten-free', 'Dairy-free', 'Nut-free', 'Contains Allergens',
];

const getCurrentDatetimeLocal = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
};

const DonorNewOffers = () => {
    const [categories, setCategories]               = useState([]);
    const [foodName, setFoodName]                   = useState('');
    const [description, setDescription]             = useState('');
    const [categoryId, setCategoryId]               = useState('');
    const [quantityKg, setQuantityKg]               = useState('');
    const [numPersons, setNumPersons]               = useState('');
    const [pickupTime, setPickupTime]               = useState('');
    const [expirationDate, setExpirationDate]       = useState('');
    const [dietarySelections, setDietarySelections] = useState([]);
    const [imageFile, setImageFile]                 = useState(null);
    const [imagePreview, setImagePreview]           = useState(null);
    const [notification, setNotification]           = useState({ message: '', type: '' });
    const [isSubmitting, setIsSubmitting]           = useState(false);

    const fileInputRef = useRef(null);

    // ─── Fetch categories on mount ───────────────────────────────
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/categories');
                const data = await response.json();
                setCategories(data);
            } catch (error) {
                console.error('Failed to load categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // ─── Handlers ────────────────────────────────────────────────
    const handleDietaryChange = (option) => {
        setDietarySelections((prev) =>
            prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
        );
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            setImageFile(null);
            setImagePreview(null);
        }
    };

    const triggerFileInput = () => fileInputRef.current.click();

    const resetForm = () => {
        setFoodName('');
        setDescription('');
        setCategoryId('');
        setQuantityKg('');
        setNumPersons('');
        setPickupTime('');
        setExpirationDate('');
        setDietarySelections([]);
        setImageFile(null);
        setImagePreview(null);
        setNotification({ message: '', type: '' });
    };

    const validateForm = () => {
        if (!foodName.trim())                            return 'Please enter a food title.';
        if (!quantityKg || parseFloat(quantityKg) <= 0) return 'Quantity (KG) must be greater than 0.';
        if (!pickupTime)                                 return 'Pickup date & time required.';
        if (!expirationDate)                             return 'Expiration date & time required.';

        const now        = new Date();
        const pickupDate = new Date(pickupTime);
        const expiryDate = new Date(expirationDate);

        if (pickupDate < now)         return 'Pickup time cannot be in the past.';
        if (expiryDate < now)         return 'Expiration date cannot be in the past.';
        if (expiryDate <= pickupDate) return 'Expiration time must be after pickup time.';
        if (!categoryId)              return 'Select a food category.';
        return null;
    };

    // ─── Submit ───────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        
        let userId = null;
        try {
            const stored = localStorage.getItem('feedhope_user');
            if (stored) {
                const parsedUser = JSON.parse(stored);
                userId = parsedUser.user_id;
            }
        } catch {
            userId = null;
        }

        if (!userId) {
            setNotification({
                message: 'You must be logged in to create an offer. Please log in again.',
                type: 'error',
            });
            return;
        }

        const validationError = validateForm();
        if (validationError) {
            setNotification({ message: validationError, type: 'error' });
            return;
        }

        setIsSubmitting(true);
        const dietaryText = dietarySelections.length
            ? dietarySelections.join(', ')
            : 'No specific dietary flags';

        const formData = new FormData();
        formData.append('foodName',          foodName);
        formData.append('description',       description);
        formData.append('categoryId',        categoryId);
        formData.append('quantityKg',        quantityKg);
        formData.append('numPersons',        numPersons);
        formData.append('pickupTime',        pickupTime);
        formData.append('expirationDate',    expirationDate);
        formData.append('dietarySelections', dietaryText);
        formData.append('userId',            userId); 

        if (imageFile) {
            formData.append('imageFile', imageFile);
        }

        try {
            const response = await fetch('http://localhost:5000/api/donor/create-offer', {
                method: 'POST',
                body: formData, // fetch sets Content-Type multipart/form-data automatically
            });

            const result = await response.json();

            if (response.ok) {
                setNotification({
                    message: `Offer created successfully! (ID: ${result.offerId})`,
                    type: 'success',
                });
                resetForm();
            } else {
                setNotification({ message: result.error || 'Failed to create offer.', type: 'error' });
            }
        } catch (err) {
            console.error('Error submitting offer:', err);
            setNotification({ message: 'Server connection failed. Is the backend running?', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const minDateTime = getCurrentDatetimeLocal();

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div className="ddb-layout">
            <DonorSidebar />

            <main className="ddb-main">
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div className="form-card">
                        <div className="form-header">
                            <h2>Create New Offer</h2>
                            <p>Share your surplus food with those in need — fill the details below</p>
                        </div>

                        <form className="form-body" onSubmit={handleSubmit}>

                            {/* Title */}
                            <div className="input-group">
                                <label><TagIcon /> Title *</label>
                                <input
                                    type="text"
                                    value={foodName}
                                    onChange={(e) => setFoodName(e.target.value)}
                                    placeholder="e.g. Leftover Pasta & Salads"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div className="input-group">
                                <label><DescriptionIcon /> Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe food items, packaging, and any special instructions..."
                                />
                            </div>

                            {/* Image Upload */}
                            <div className="input-group">
                                <label><CloudUploadIcon /> Upload Image</label>
                                <div className="upload-area" onClick={triggerFileInput}>
                                    <CloudUploadIcon className="upload-icon" />
                                    <p>Click or drag to upload a photo</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                                {imagePreview && (
                                    <div className="image-preview">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            style={{ maxHeight: '200px', marginTop: '10px', borderRadius: '8px' }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Category & Quantity */}
                            <div className="row-2cols">
                                <div className="input-group">
                                    <label><CategoryIcon /> Category *</label>
                                    <select
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.category_id} value={cat.category_id}>
                                                {cat.category_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label><LineWeightIcon /> Quantity (KG) *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={quantityKg}
                                        onChange={(e) => setQuantityKg(e.target.value)}
                                        placeholder="e.g. 5.5"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Number of Persons */}
                            <div className="row-2cols">
                                <div className="input-group">
                                    <label><PeopleIcon /> Number of Persons (approx.)</label>
                                    <input
                                        type="number"
                                        value={numPersons}
                                        onChange={(e) => setNumPersons(e.target.value)}
                                        placeholder="e.g. 12"
                                    />
                                </div>
                            </div>

                            {/* Pickup & Expiration */}
                            <div className="row-2cols">
                                <div className="input-group">
                                    <label><ScheduleIcon /> Pickup Date & Time *</label>
                                    <input
                                        type="datetime-local"
                                        value={pickupTime}
                                        onChange={(e) => setPickupTime(e.target.value)}
                                        min={minDateTime}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label><HourglassEmptyIcon /> Expiration Date & Time *</label>
                                    <input
                                        type="datetime-local"
                                        value={expirationDate}
                                        onChange={(e) => setExpirationDate(e.target.value)}
                                        min={minDateTime}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Dietary Information */}
                            <div className="input-group">
                                <label><GrassIcon /> Dietary Information</label>
                                <div className="dietary-group">
                                    <div
                                        className="dietary-grid"
                                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
                                    >
                                        {DIETARY_OPTIONS.map((opt) => (
                                            <label key={opt} className="dietary-check">
                                                <input
                                                    type="checkbox"
                                                    checked={dietarySelections.includes(opt)}
                                                    onChange={() => handleDietaryChange(opt)}
                                                />
                                                {' '}{opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={resetForm}
                                    disabled={isSubmitting}
                                >
                                    <CancelIcon /> Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-create"
                                    disabled={isSubmitting}
                                >
                                    <CheckCircleIcon /> {isSubmitting ? 'Creating...' : 'Create Offer'}
                                </button>
                            </div>
                        </form>

                        {/* Notification Banner */}
                        {notification.message && (
                            <div
                                className={`notification ${notification.type}`}
                                style={{
                                    marginTop: '15px',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    backgroundColor: notification.type === 'error' ? '#ffebee' : '#e8f5e9',
                                }}
                            >
                                {notification.message}
                                <button
                                    onClick={() => setNotification({ message: '', type: '' })}
                                    style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DonorNewOffers;
