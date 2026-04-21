import React, { useState } from 'react';
import "../Styles/ContactUs.css";
import { Link } from "react-router-dom";
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const ContactUs = () => {

    const [formData, setFormData] = useState({ full_name: '', email: '', message: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.full_name || !formData.email || !formData.message) {
        return setError('All fields are required.');
    }

    setLoading(true);
    try {
        const response = await fetch('http://localhost:5000/api/contact-us', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: formData.full_name,
                email: formData.email,
                message: formData.message,
                //  No user_id needed — backend finds it automatically by email
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return setError(data.error || 'Something went wrong.');
        }

        setSuccess('Your message has been sent successfully! ✅');
        setFormData({ full_name: '', email: '', message: '' });

    } catch (err) {
        setError('Could not connect to the server.');
    } finally {
        setLoading(false);
    }
};

    // Function to handle external navigation
    const handleExternalLink = (url) => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
        <div className="contact-wrapper">
            <header className="contact-header-nav">
                <Link to="/" className="contact-logo">
                    <div className="contact-logo-circle">
                        <img src="/Images/logo-circle.png" alt="FeedHope Logo" />
                    </div>
                    <span>FeedHope</span>
                </Link>
                <nav>
                    <ul>
                        <li><Link to="/mission">Our Mission</Link></li>
                        <li><Link to="/how-it-works">How it Works</Link></li>
                        <li><Link to="/signin" className="contact-btn-signin">Sign In</Link></li>
                    </ul>
                </nav>
            </header>

            <main className="contact-main">
                <div className="contact-glass-card">
                    <div className="contact-info-section">
                        <h1>Get in Touch</h1>
                        <p>Have questions about donating or volunteering? We'd love to hear from you.</p>
                        
                        <div className="contact-details">
                            {/* Phone Item */}
                            <div className="detail-item">
                                <PhoneIcon className="detail-icon" />
                                <div className="detail-text">
                                    <span>Phone</span>
                                    <p>+961 01 234 567</p>
                                </div>
                            </div>

                            {/* Email Item */}
                            <div className="detail-item">
                                <EmailIcon className="detail-icon" />
                                <div className="detail-text">
                                    <span>Email</span>
                                    <p>support@feedhope.com</p>
                                </div>
                            </div>

                            {/* Location Item */}
                            <div className="detail-item">
                                <LocationOnIcon className="detail-icon" />
                                <div className="detail-text">
                                    <span>Location</span>
                                    <p>Beirut, Lebanon (LIU Campus)</p>
                                </div>
                            </div>
                        </div>

                        <div className="contact-socials">
                            <div 
                                className="social-link-icon"
                                onClick={() => handleExternalLink("https://twitter.com/feedhope")}
                                style={{ cursor: 'pointer' }}
                            >
                                <TwitterIcon />
                            </div>
                            <div 
                                className="social-link-icon"
                                onClick={() => handleExternalLink("https://instagram.com/feedhope")}
                                style={{ cursor: 'pointer' }}
                            >
                                <InstagramIcon />
                            </div>
                        </div>
                    </div>

                    <div className="contact-form-section">
                        <form onSubmit={handleSubmit}>
                            
                            {error && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '10px' }}>{error}</p>}
                            {success && <p style={{ color: '#22c55e', fontSize: '14px', marginBottom: '10px' }}>{success}</p>}

                            <div className="contact-form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                name="full_name"
                                placeholder="John Doe"
                                value={formData.full_name}
                                onChange={handleChange}
                                required
                            />
                            </div>

                            <div className="contact-form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                name="email"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            </div>

                            <div className="contact-form-group">
                            <label>Message</label>
                            <textarea
                                name="message"
                                placeholder="How can we help you?"
                                rows="4"
                                value={formData.message}
                                onChange={handleChange}
                                required
                            />
                            </div>

                            <button type="submit" className="contact-submit-btn" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Message'}
                            </button>

                        </form>
                        </div>
                </div>
            </main>
        </div>
    );
};

export default ContactUs;

