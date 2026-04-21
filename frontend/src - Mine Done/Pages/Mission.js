import React from "react";
import "../Styles/Mission.css";
import { Link } from "react-router-dom";

const Mission = () => {
  return (
    <div className="mission-wrapper">
      <header className="mission-header-nav">
        <Link to="/" className="mission-logo">
          <div className="mission-logo-circle">
            <img src="/Images/logo-circle.png" alt="FeedHope Logo" />
          </div>
          <span>FeedHope</span>
        </Link>
        <nav>
          <ul>
            <li><Link to="/how-it-works">How it Works</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/signin" className="mission-btn-signin">Sign In</Link></li>
          </ul>
        </nav>
      </header>

      <main className="mission-main">
        <div className="mission-glass-card">
          {/* Left Side: Mission & Vision */}
          <div className="mission-info-section">
            <h1>Our <span>Mission</span></h1>
            <p className="hero-tagline">
              We exist to eliminate food waste and fight hunger by connecting people who have surplus food with those who need it most.
            </p>

            <div className="mission-statement">
              <h3>Why We Exist</h3>
              <p>
                Every day, tons of food go to waste while millions struggle to find a meal.
                Our mission is to bridge this gap by creating a seamless platform where food donors,
                volunteers, and receivers come together to make a real impact.
              </p>
            </div>

            <div className="vision-box">
              <h3>Our Vision</h3>
              <p>
                A world where no food is wasted and no person goes hungry.
                We envision communities working together to build a sustainable and caring future.
              </p>
            </div>
          </div>

          {/* Right Side: Values, Steps & CTA */}
          <div className="mission-values-section">
            <h2>Our Core Values</h2>
            <div className="values-grid">
              <div className="value-card">
                <strong>Sustainability</strong>
                <p>Reducing food waste to protect our planet.</p>
              </div>
              <div className="value-card">
                <strong>Community</strong>
                <p>Connecting people to help one another.</p>
              </div>
              <div className="value-card">
                <strong>Transparency</strong>
                <p>Building trust through clear communication.</p>
              </div>
              <div className="value-card">
                <strong>Impact</strong>
                <p>Making real, measurable change.</p>
              </div>
            </div>

            <div className="mini-steps-section">
              <h3>How We Make It Happen</h3>
              <div className="mini-steps-flex">
                <span>Donors share surplus</span> →
                <span>Platform matches</span> →
                <span>Volunteers deliver</span> →
                <span>Receivers get support</span>
              </div>
            </div>

            <div className="mission-cta-box">
              <h2>Be Part of the Change</h2>
              <Link to="/donor-registration" className="mission-cta-btn">Join the Movement</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Mission;