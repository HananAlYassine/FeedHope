import React from "react";
import "../Styles/HowItWorks.css";
import { Link } from "react-router-dom";

const HowItWorks = () => {
    return (
        <div className="how-wrapper">
            <header className="how-header-nav">
                <Link to="/" className="how-logo">
                    <div className="how-logo-circle">
                        <img src="/Images/logo-circle.png" alt="FeedHope Logo" />
                    </div>
                    <span>FeedHope</span>
                </Link>
                <nav>
                    <ul>
                        <li><Link to="/mission">Our Mission</Link></li>
                        <li><Link to="/contact">Contact Us</Link></li>
                        <li><Link to="/signin" className="how-btn-signin">Sign In</Link></li>
                    </ul>
                </nav>
            </header>

            <main className="how-main">
                <div className="how-glass-card">
                    {/* Left Side: Hero & Steps */}
                    <div className="how-info-section">
                        <h1>How It <span>Works</span></h1>
                        <p className="hero-description">
                            Our platform connects donors, volunteers, and receivers to ensure surplus food reaches those in need quickly and efficiently.
                        </p>
                        
                        <div className="how-steps-list">
                            <div className="how-step-item">
                                <div className="how-step-num">01</div>
                                <div className="how-step-content">
                                    <h3>Food Donation</h3>
                                    <p>Donors such as restaurants, supermarkets, or individuals upload available surplus food with details like quantity and expiration time.</p>
                                </div>
                            </div>
                            <div className="how-step-item">
                                <div className="how-step-num">02</div>
                                <div className="how-step-content">
                                    <h3>Smart Matching</h3>
                                    <p>The platform intelligently matches food offers with nearby receivers based on urgency, location, and need.</p>
                                </div>
                            </div>
                            <div className="how-step-item">
                                <div className="how-step-num">03</div>
                                <div className="how-step-content">
                                    <h3>Volunteer Pickup</h3>
                                    <p>Volunteers receive notifications and handle the pickup and delivery process efficiently.</p>
                                </div>
                            </div>
                            <div className="how-step-item">
                                <div className="how-step-num">04</div>
                                <div className="how-step-content">
                                    <h3>Food Delivery</h3>
                                    <p>Receivers such as charities or individuals get the food safely before it expires.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Roles & CTA */}
                    <div className="how-content-section">
                        <h2>Who Makes It Possible</h2>
                        
                        <div className="how-roles-list">
                            <div className="role-card">
                                <h4>Donors</h4>
                                <p>Businesses and individuals who contribute surplus food instead of letting it go to waste.</p>
                            </div>
                            <div className="role-card">
                                <h4>Receivers</h4>
                                <p>People and organizations in need who benefit from donated food resources.</p>
                            </div>
                            <div className="role-card">
                                <h4>Volunteers</h4>
                                <p>Dedicated individuals who ensure food is delivered quickly and safely.</p>
                            </div>
                        </div>

                        <div className="how-cta-box">
                            <h2>Join the Movement</h2>
                            <p>Be part of a community that turns surplus into support.</p>
                            <Link to="/donor-registration" className="how-cta-btn">Get Started</Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HowItWorks;