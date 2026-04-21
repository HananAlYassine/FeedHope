import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorSidebar from '../../Components/Donor/DonorSidebar';
import '../../Styles/Donor/DonorDashboard.css';
import '../../Styles/Donor/DonorMoneyDonation.css';

// MUI Icons
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';

const DonorMoneyDonation = () => {
    const [user, setUser] = useState(null);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('OMT');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('feedhope_user');
        if (!storedUser) {
            navigate('/signin');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('feedhope_user');
        navigate('/signin');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        // 1. Changed check: Use user_id which is guaranteed to be in your localStorage object
        if (!user || !user.user_id) {
            setErrorMessage("Error: User session not found. Please re-login.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/donor/donate-money', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    payment_method: paymentMethod,
                    // 2. Send userId instead of donor_id
                    userId: user.user_id,
                    description: description
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage(data.message);
                setAmount('');
                setDescription('');
            } else {
                setErrorMessage(data.error || 'Request failed');
            }
        } catch (err) {
            setErrorMessage('Could not connect to the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} />

            <main className="ddb-main">
                <div className="ddb-banner dmd-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor Dashboard</p>
                        <h1 className="ddb-banner-title">Make an Impact</h1>
                        <p className="ddb-banner-subtitle">Your contribution directly supports food recovery efforts.</p>
                    </div>
                </div>

                <div className="dmd-form-container">
                    <div className="dmd-form-card">
                        <div className="dmd-form-header">
                            <div className="dmd-header-icon-wrapper">
                                <AttachMoneyIcon className="dmd-header-icon" />
                            </div>
                            <div>
                                <h2 className="dmd-form-title">Donation Details</h2>
                                <p className="dmd-form-subtitle">Securely enter your donation information below.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="dmd-form-body">
                            {/* Amount Input */}
                            <div className="dmd-form-group">
                                <label className="dmd-label">Donation Amount</label>
                                <div className="dmd-amount-input-wrapper">
                                    <span className="dmd-currency-symbol">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="dmd-input dmd-amount-input"
                                        disabled={loading}
                                        required
                                    />
                                    <span className="dmd-currency-code">USD</span>
                                </div>
                            </div>

                            {/* Payment Method Icons */}
                            <div className="dmd-form-group">
                                <label className="dmd-label">Payment Method</label>
                                <div className="dmd-payment-options">
                                    {['OMT', 'WishMoney', 'Bank Transfer'].map((method) => (
                                        <label key={method} className={`dmd-payment-tile ${paymentMethod === method ? 'selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value={method}
                                                checked={paymentMethod === method}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                disabled={loading}
                                            />
                                            {method === 'OMT' && <PaymentsIcon className="dmd-payment-icon" />}
                                            {method === 'WishMoney' && <PhoneIphoneIcon className="dmd-payment-icon" />}
                                            {method === 'Bank Transfer' && <AccountBalanceIcon className="dmd-payment-icon" />}
                                            <span className="dmd-payment-name">{method}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Optional Note */}
                            <div className="dmd-form-group">
                                <label className="dmd-label">Note (Optional)</label>
                                <textarea
                                    rows="3"
                                    placeholder="Leave a message with your donation..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="dmd-textarea"
                                    disabled={loading}
                                />
                            </div>

                            {/* Status Alerts */}
                            {errorMessage && <div className="dmd-alert dmd-error">{errorMessage}</div>}
                            {successMessage && <div className="dmd-alert dmd-success">{successMessage}</div>}

                            <div className="dmd-actions">
                                <button
                                    type="button"
                                    className="dmd-btn dmd-btn-cancel"
                                    onClick={() => navigate('/donor-dashboard')}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="dmd-btn dmd-btn-confirm" disabled={loading}>
                                    {loading ? 'Processing...' : 'Complete Donation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DonorMoneyDonation;