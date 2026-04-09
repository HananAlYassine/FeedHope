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

    // Load user from localStorage
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

        if (!amount || parseFloat(amount) <= 0) {
            setErrorMessage('Please enter a valid donation amount.');
            return;
        }
        if (!paymentMethod) {
            setErrorMessage('Please select a payment method.');
            return;
        }

        setLoading(true);
        try {
            // API call placeholder
            // ...

            // Mock success
            setSuccessMessage(`Thank you for your generous donation of $${amount}!`);
            setAmount('');
            setDescription('');
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (err) {
            setErrorMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ddb-layout">
            <DonorSidebar user={user} onLogout={handleLogout} />

            <main className="ddb-main">
                {/* Banner Header */}
                <div className="ddb-banner dmd-banner">
                    <div className="ddb-banner-text">
                        <p className="ddb-banner-greeting">Donor Dashboard</p>
                        <h1 className="ddb-banner-title">Make an Impact</h1>
                        <p className="ddb-banner-subtitle">
                            Your monetary contribution directly supports our food recovery initiatives and helps feed those in need.
                        </p>
                    </div>
                </div>

                {/* Donation Form Card */}
                <div className="dmd-form-container">
                    <div className="dmd-form-card">
                        <div className="dmd-form-header">
                            <div className="dmd-header-icon-wrapper">
                                <AttachMoneyIcon className="dmd-header-icon" />
                            </div>
                            <div>
                                <h2 className="dmd-form-title">Donation Details</h2>
                                <p className="dmd-form-subtitle">Choose your amount and payment method securely.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="dmd-form-body">
                            {/* Amount Field */}
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

                            {/* Payment Method */}
                            <div className="dmd-form-group">
                                <label className="dmd-label">Payment Method</label>
                                <div className="dmd-payment-options">

                                    {/* OMT Tile */}
                                    <label className={`dmd-payment-tile ${paymentMethod === 'OMT' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="OMT"
                                            checked={paymentMethod === 'OMT'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            disabled={loading}
                                        />
                                        <PaymentsIcon className="dmd-payment-icon" />
                                        <span className="dmd-payment-name">OMT</span>
                                    </label>

                                    {/* WishMoney Tile */}
                                    <label className={`dmd-payment-tile ${paymentMethod === 'WishMoney' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="WishMoney"
                                            checked={paymentMethod === 'WishMoney'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            disabled={loading}
                                        />
                                        <PhoneIphoneIcon className="dmd-payment-icon" />
                                        <span className="dmd-payment-name">WishMoney</span>
                                    </label>

                                    {/* Bank Transfer Tile */}
                                    <label className={`dmd-payment-tile ${paymentMethod === 'Bank Transfer' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="Bank Transfer"
                                            checked={paymentMethod === 'Bank Transfer'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            disabled={loading}
                                        />
                                        <AccountBalanceIcon className="dmd-payment-icon" />
                                        <span className="dmd-payment-name">Bank Transfer</span>
                                    </label>

                                </div>
                            </div>

                            {/* Reason / Description */}
                            <div className="dmd-form-group">
                                <label className="dmd-label">Note (Optional)</label>
                                <textarea
                                    rows="3"
                                    placeholder="Is there a specific campaign or reason inspiring your gift today?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="dmd-textarea"
                                    disabled={loading}
                                />
                            </div>

                            {/* Error / Success Messages */}
                            {errorMessage && <div className="dmd-alert dmd-error">{errorMessage}</div>}
                            {successMessage && <div className="dmd-alert dmd-success">{successMessage}</div>}

                            {/* Action Buttons */}
                            <div className="dmd-actions">
                                <button
                                    type="button"
                                    className="dmd-btn dmd-btn-cancel"
                                    onClick={() => navigate('/donor-dashboard')}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="dmd-btn dmd-btn-confirm"
                                    disabled={loading}
                                >
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