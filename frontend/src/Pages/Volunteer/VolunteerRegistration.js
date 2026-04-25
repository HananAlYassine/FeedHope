import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Storefront, VolunteerActivism, LocalShipping, FormatQuote,
    Visibility, VisibilityOff,
    ContentCopy, CheckCircle, MarkEmailRead, Lock
} from '@mui/icons-material';
import "../../Styles/Registration.css";

/* ─────────────────────────────────────────────────────────
    POPUP 1 — Code Reveal Popup
───────────────────────────────────────────────────────── */
const CodeRevealPopup = ({ devCode, pendingEmail, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(devCode).then(() => setCopied(true));
    };

    return (
        <div className="popup-backdrop popup-backdrop--dark">
            <div className="cr-card">
                <div className="cr-header">
                    <div className="cr-icon-ring">
                        <MarkEmailRead style={{ fontSize: '42px', color: '#34d399' }} />
                    </div>
                    <h2 className="cr-title">Your Verification Code</h2>
                    <p className="cr-subtitle">
                        Generated for&nbsp;<strong>{pendingEmail}</strong>
                    </p>
                </div>

                <div className="cr-body">
                    <div className="cr-code-box">
                        <div className="cr-shimmer" />
                        <p className="cr-dev-label">Dev Mode — One-Time Code</p>
                        <p className="cr-code-text">{devCode}</p>
                    </div>

                    <button
                        className={`cr-copy-btn${copied ? ' is-copied' : ''}`}
                        onClick={handleCopy}
                    >
                        {copied
                            ? <><CheckCircle style={{ fontSize: '18px' }} /> Code Copied!</>
                            : <><ContentCopy style={{ fontSize: '18px' }} /> Copy Code</>
                        }
                    </button>

                    <button
                        className={`cr-ok-btn${copied ? ' is-copied' : ''}`}
                        onClick={onClose}
                        disabled={!copied}
                    >
                        {copied ? 'Got it — Enter the Code' : 'Copy the code first'}
                    </button>

                    <p className="cr-hint">
                        Copy the code above, then click the button to proceed.
                    </p>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────
    POPUP 2 — OTP Entry Modal
───────────────────────────────────────────────────────── */
const OtpEntryModal = ({
    pendingEmail, otp, otpRefs,
    verifyError, verifySuccess,
    handleOtpChange, handleOtpKeyDown, handleOtpPaste, handleVerify,
}) => (
    <div className="popup-backdrop popup-backdrop--medium">
        <div className="otp-card">
            <div className="otp-header">
                <div className="otp-header-bubble-top" />
                <div className="otp-header-bubble-bottom" />
                <div className="otp-lock-ring">
                    <Lock style={{ fontSize: '34px', color: '#6ee7b7' }} />
                </div>
                <h2 className="otp-header-title">Enter Verification Code</h2>
                <p className="otp-header-subtitle">
                    Paste or type the 6-digit code for<br />
                    <strong>{pendingEmail}</strong>
                </p>
            </div>

            <div className="otp-body">
                {verifySuccess ? (
                    <div className="otp-success">
                        <div className="otp-success-icon">
                            <CheckCircle style={{ fontSize: '76px', color: '#10b981' }} />
                        </div>
                        <h3 className="otp-success-title">Email Verified!</h3>
                        <p className="otp-success-subtitle">
                            Your account is now active.<br />Redirecting you to sign in…
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleVerify}>
                        <p className="otp-instruction">Enter the 6-digit code you just copied:</p>
                        <div className="otp-inputs-row" onPaste={handleOtpPaste}>
                            {otp.map((digit, i) => (
                                <input
                                    key={i} ref={el => otpRefs.current[i] = el}
                                    type="text" inputMode="numeric" maxLength={1} value={digit}
                                    onChange={e => handleOtpChange(i, e.target.value)}
                                    onKeyDown={e => handleOtpKeyDown(i, e)}
                                    className={`otp-digit-input${verifyError ? ' is-error' : digit ? ' is-filled' : ''}`}
                                />
                            ))}
                        </div>
                        {verifyError && (
                            <div className="otp-error-box">
                                <span className="otp-error-icon">!</span>
                                <p className="otp-error-text">{verifyError}</p>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={otp.join('').length < 6}
                            className={`otp-submit-btn${otp.join('').length >= 6 ? ' is-ready' : ''}`}
                        >
                            Verify &amp; Activate Account
                        </button>
                        <p className="otp-tip">
                            Tip: You can paste the code directly into the boxes above.
                        </p>
                    </form>
                )}
            </div>
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────
    MAIN — VOLUNTEER REGISTRATION
───────────────────────────────────────────────────────── */
const VolunteerRegister = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: '', email: '', phone: '', vehicleType: '',
        plateNumber: '', birthdate: '', gender: '', password: '', confirmPassword: ''
    });

    const [showPassword,        setShowPassword]        = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const today = new Date().toISOString().split('T')[0];

    const [popup,         setPopup]         = useState('none');
    const [devCode,       setDevCode]       = useState('');
    const [pendingEmail,  setPendingEmail]  = useState('');
    const [otp,           setOtp]           = useState(['', '', '', '', '', '']);
    const [verifyError,   setVerifyError]   = useState('');
    const [verifySuccess, setVerifySuccess] = useState(false);
    const otpRefs = useRef([]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) { alert('Passwords do not match!'); return; }

        try {
            const response = await fetch('http://localhost:5000/api/register/volunteer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: formData.fullName, email: formData.email,
                    password: formData.password, phone: formData.phone,
                    birthdate: formData.birthdate, gender: formData.gender,
                    vehicleType: formData.vehicleType, plateNumber: formData.plateNumber
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setDevCode(data.verificationCode);
                setPendingEmail(formData.email);
                setPopup('code');
            } else {
                alert(data.error || 'Registration failed');
            }
        } catch { alert('Server connection error'); }
    };

    const handleCodePopupClose = () => {
        setPopup('otp');
        setTimeout(() => otpRefs.current[0]?.focus(), 120);
    };

    // Function runs when user types in an OTP box
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return; // Allow only numbers
        const updated = [...otp];
        updated[index] = value.slice(-1); // Update digit --> Keeps only last digit
        setOtp(updated);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    // Runs when user presses a key (like Backspace)
    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    };

    // Runs when user pastes something
    const handleOtpPaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) { setOtp(pasted.split('')); otpRefs.current[5]?.focus(); }
        e.preventDefault();
    };

    // Runs when user submits OTP form
    const handleVerify = async (e) => {
        e.preventDefault();
        setVerifyError('');
        const code = otp.join(''); // Convert array -> string
        if (code.length < 6) { setVerifyError('Please enter all 6 digits.'); return; }

        try {
            const response = await fetch('http://localhost:5000/api/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingEmail, code }),
            });
            const data = await response.json();
            if (response.ok) {
                setVerifySuccess(true);
                setTimeout(() => navigate('/signin'), 2500);
            } else {
                setVerifyError(data.error || 'Invalid code. Please try again.');
                setOtp(['', '', '', '', '', '']);
                otpRefs.current[0]?.focus();
            }
        } catch { setVerifyError('Server connection error.'); }
    };

    const eyeBtnStyle = {
        position: 'absolute', right: '10px',
        background: 'none', border: 'none',
        cursor: 'pointer', color: '#718096',
        display: 'flex', alignItems: 'center', padding: 0,
    };

    return (
        <>
            {/* Suppress Edge/Chrome native password eye icon */}
            <style>{`
                input[type="password"]::-ms-reveal,
                input[type="password"]::-ms-clear,
                input[type="password"]::-webkit-credentials-auto-fill-button {
                    display: none !important;
                }
            `}</style>

            {popup === 'code' && (
                <CodeRevealPopup devCode={devCode} pendingEmail={pendingEmail} onClose={handleCodePopupClose} />
            )}
            {popup === 'otp' && (
                <OtpEntryModal
                    pendingEmail={pendingEmail} otp={otp} otpRefs={otpRefs}
                    verifyError={verifyError} verifySuccess={verifySuccess}
                    handleOtpChange={handleOtpChange} handleOtpKeyDown={handleOtpKeyDown}
                    handleOtpPaste={handleOtpPaste} handleVerify={handleVerify}
                />
            )}

            <div className="reg-page-layout">
                <div className="reg-card-container">
                    <div className="reg-hero-section">
                        <div className="reg-hero-overlay"></div>
                        <div className="reg-hero-content">
                            <div className="reg-brand-logo">
                                <img src="/Images/logo-circle.png" className="reg-logo-circle-img" alt="FeedHope" />
                                <span>FeedHope</span>
                            </div>
                            <div>
                                <div className="glass-badge" style={{ marginBottom: '20px' }}>
                                    <span className="impact-value">5K +</span>
                                    <p style={{ margin: '5px 0 0', fontSize: '14px', opacity: 0.9 }}>Active rescuers on the road.</p>
                                </div>
                                <div className="glass-badge">
                                    <FormatQuote style={{ fontSize: '30px', color: '#10b981' }} />
                                    <p style={{ fontStyle: 'italic', fontSize: '13px', margin: '5px 0' }}>
                                        "Being the bridge between waste and need is the most rewarding work."
                                    </p>
                                    <strong style={{ fontSize: '12px' }}>- Alex Johnson</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="reg-form-section">
                        <Link to="/" className="back-link">Back to Home</Link>
                        <h2 style={{ margin: '10px 0 5px', fontWeight: 800 }}>Create Account</h2>
                        <p style={{ fontSize: '13px', color: '#718096', marginBottom: '20px' }}>Join our food rescue mission and make a difference today</p>

                        <span style={{ fontSize: '13px', fontWeight: 600 }}>I am a...</span>
                        <div className="role-pills-nav">
                            <button className="role-nav-btn" onClick={() => navigate('/donor-registration')}><Storefront fontSize="small" /> Donor</button>
                            <button className="role-nav-btn" onClick={() => navigate('/receiver-registration')}><VolunteerActivism fontSize="small" /> Receiver</button>
                            <button className="role-nav-btn active-pill"><LocalShipping fontSize="small" /> Volunteer</button>
                        </div>

                        <form className="auth-input-grid" onSubmit={handleSubmit}>
                            <div className="auth-input-group full-width-field">
                                <label>Full Name</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="auth-input-field" placeholder="Enter your full name" required />
                            </div>
                            <div className="auth-input-group">
                                <label>Email Address</label>
                                <input type="email" name="email" className="auth-input-field" placeholder="Enter email" value={formData.email} onChange={handleChange} required />
                            </div>
                            <div className="auth-input-group">
                                <label>Phone Number</label>
                                <input type="tel" name="phone" className="auth-input-field" placeholder="Enter phone" value={formData.phone} onChange={handleChange} required />
                            </div>
                            <div className="auth-input-group">
                                <label>Vehicle Type</label>
                                <select className="auth-select-field" required name="vehicleType" value={formData.vehicleType} onChange={handleChange}>
                                    <option value="" disabled>Select vehicle</option>
                                    <option value="Motorcycle">Motorcycle</option>
                                    <option value="Car">Car</option>
                                    <option value="Truck">Truck</option>
                                </select>
                            </div>
                            <div className="auth-input-group">
                                <label>License Plate</label>
                                <input type="text" className="auth-input-field" placeholder="e.g., ABC-1234" name="plateNumber" value={formData.plateNumber} onChange={handleChange} required />
                            </div>
                            <div className="auth-input-group">
                                <label>Gender</label>
                                <select className="auth-select-field" required name="gender" value={formData.gender} onChange={handleChange}>
                                    <option value="" disabled>Select a gender</option>
                                    <option value="Female">Female</option>
                                    <option value="Male">Male</option>
                                </select>
                            </div>
                            <div className="auth-input-group">
                                <label>Birth Date</label>
                                <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} className="auth-input-field" max={today} required />
                            </div>

                            {/* ── Password with eye icon ── */}
                            <div className="auth-input-group">
                                <label>Password</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="auth-input-field"
                                        placeholder="Create password"
                                        style={{ paddingRight: '36px' }}
                                        required
                                    />
                                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(p => !p)} style={eyeBtnStyle}>
                                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                    </button>
                                </div>
                            </div>

                            {/* ── Confirm Password with eye icon ── */}
                            <div className="auth-input-group">
                                <label>Confirm Password</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="auth-input-field"
                                        placeholder="Confirm password"
                                        style={{ paddingRight: '36px' }}
                                        required
                                    />
                                    <button type="button" tabIndex={-1} onClick={() => setShowConfirmPassword(p => !p)} style={eyeBtnStyle}>
                                        {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                    </button>
                                </div>
                            </div>

                            <div className="full-width-field terms-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                                <input type="checkbox" id="terms" required />
                                <label htmlFor="terms" style={{ fontSize: '12px', color: '#4a5568', margin: 0 }}>
                                    I agree to the <span style={{ color: '#10b981', fontWeight: 600 }}>Terms of Service</span> and <span style={{ color: '#10b981', fontWeight: 600 }}>Privacy Policy</span>
                                </label>
                            </div>
                            <button type="submit" className="submit-reg-button full-width-field">Create Volunteer Account</button>
                            <p style={{ textAlign: 'center', fontSize: '13px', color: '#718096', marginTop: '10px' }} className="full-width-field">
                                Already have an account? <Link to="/signin" style={{ color: '#10b981', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default VolunteerRegister;
