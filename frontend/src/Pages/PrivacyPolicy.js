import React from "react";
import { Link, useNavigate } from "react-router-dom";
import CloseIcon from '@mui/icons-material/Close';
import GavelIcon from '@mui/icons-material/Gavel';
import "../Styles/Legal.css";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    window.close();
    setTimeout(() => {
      if (!window.closed) navigate('/');
    }, 150);
  };

  return (
    <div className="legal-overlay">
      <div className="legal-topbar">
        <h1>Privacy <span>Policy</span></h1>
        <div className="legal-actions">
          <Link to="/terms" className="legal-switch-btn">
            <GavelIcon style={{ fontSize: 17 }} />
            View Terms of Service
          </Link>
          <button type="button" className="legal-close-btn" onClick={handleClose}>
            <CloseIcon style={{ fontSize: 17 }} />
            Close
          </button>
        </div>
      </div>

      <div className="legal-body">
        <p className="legal-updated">Last updated: May 14, 2026</p>

        <ul className="legal-list">
          <li><strong>Data we collect:</strong> name, email, phone, password (hashed), role, and addresses for pickup or delivery.</li>
          <li><strong>Activity data:</strong> offers posted or accepted, donations made, feedback, and notifications.</li>
          <li><strong>Technical data:</strong> IP address, browser, and device info — used for security and analytics.</li>
          <li><strong>How we use it:</strong> account management, matching donations, sending notifications, and platform safety.</li>
          <li><strong>Sharing:</strong> only with users involved in the same offer, with admins, and with trusted service providers.</li>
          <li>We <strong>do not sell</strong> your personal data to advertisers or third parties.</li>
          <li><strong>Security:</strong> HTTPS connections, hashed passwords, role-based access, and audit logging on sensitive actions.</li>
          <li><strong>Retention:</strong> kept while your account is active; removed or anonymized after deletion (except where law requires).</li>
          <li><strong>Your rights:</strong> access, correct, delete your data, and opt out of non-essential notifications.</li>
          <li>Cookies and local storage keep you signed in and remember your preferences.</li>
          <li>FeedHope is not intended for children under 13 and we do not knowingly collect their data.</li>
        </ul>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
