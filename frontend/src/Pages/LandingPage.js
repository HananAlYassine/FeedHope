import "../Styles/LandingPage.css";
import React, { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const LandingPage = () => {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogoClick = () => {
        window.location.reload();
    };

    const wrapperStyle = {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/Images/hero-background.jpg')`
    };

    const handleSocialClick = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
};
    return (
        <div className="hero-wrapper" style={wrapperStyle}>
            <header>
                <div className="logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
                    <div className="logo-circle">
                        <img src="/Images/logo-circle.png" alt="FeedHope Logo" className="header-logo-img" />
                    </div>
                    FeedHope
                </div>
                <button
                    className="nav-toggle"
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label="Toggle menu"
                    aria-expanded={menuOpen}
                >
                    {menuOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
                <nav className={menuOpen ? 'is-open' : ''}>
                    <ul>
                        <li><Link to="/mission" onClick={() => setMenuOpen(false)}>Our Mission</Link></li>
                        <li><Link to="/how-it-works" onClick={() => setMenuOpen(false)}>How it Works</Link></li>
                        <li><Link to="/contact" onClick={() => setMenuOpen(false)}>Contact Us</Link></li>
                        <li className="nav-mobile-signin"><Link to="/signin" className="btn-signin" onClick={() => setMenuOpen(false)}>Sign In</Link></li>
                    </ul>
                </nav>

                <Link to="/signin" className="btn-signin nav-desktop-signin">Sign In</Link>
            </header>

            <main>
                <div className="hero-content">
                    <h1>Feed Hope.<br /><span>Share Love.</span></h1>
                    <p>Bridging the gap between surplus food and those in need. Join a global community dedicated to ending hunger through local action.</p>
                    <button className="btn-main" onClick={() => navigate('/donor-registration')}>
                        Join the Movement
                    </button>
                </div>

                <div className="glass-card">
                    <span className="card-tag">✨ Our Story</span>
                    <p>We started with a simple belief: no meal should go to waste when a neighbor is hungry. Our platform connects donors, receivers, and volunteers to create a seamless circle of giving.</p>

                    <Link to="/mission" className="card-link">
                        Read more about our journey &rarr;
                    </Link>
                </div>
            </main>

            <footer>
                <div className="stats">
                    <div className="stat-box">
                        <div className="stat-bar"></div>
                        <div className="stat-val">1.2M+</div>
                        <div className="stat-label">Meals Shared</div>
                    </div>

                    <div className="stat-box">
                        <div className="stat-bar"></div>
                        <div className="stat-val">15,000+</div>
                        <div className="stat-label">Active Volunteers</div>
                    </div>

                    <div className="stat-box">
                        <div className="stat-bar"></div>
                        <div className="stat-val">450+</div>
                        <div className="stat-label">Donation Hubs</div>
                    </div>
                </div>
                <div className="social">
                    <div
                        className="social-icon-wrapper"
                        onClick={() => handleSocialClick("https://twitter.com")}
                    >
                        <TwitterIcon fontSize="inherit" />
                    </div>
                    <div
                        className="social-icon-wrapper"
                        onClick={() => handleSocialClick("https://instagram.com")}
                    >
                        <InstagramIcon fontSize="inherit" />
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;