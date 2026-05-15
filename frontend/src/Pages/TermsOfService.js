import React from "react";
import { Link, useNavigate } from "react-router-dom";
import CloseIcon from '@mui/icons-material/Close';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import "../Styles/Legal.css";

const TermsOfService = () => {
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
        <h1>Terms of <span>Service</span></h1>
        <div className="legal-actions">
          <Link to="/privacy" className="legal-switch-btn">
            <PrivacyTipIcon style={{ fontSize: 17 }} />
            View Privacy Policy
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
          <li>You must be 18+ (or have legal guardian consent) to register and use FeedHope.</li>
          <li><strong>Roles:</strong> Donor, Receiver, Volunteer, Admin — keep your credentials secure and your information accurate.</li>
          <li><strong>Donors:</strong> ensure offered food is safe, accurately described (type, quantity, expiry), and properly stored.</li>
          <li><strong>Receivers &amp; Volunteers:</strong> verify the condition of food at pickup and refuse anything unsafe.</li>
          <li><strong>Volunteers:</strong> transport food responsibly, deliver on time, and treat donors and receivers with respect.</li>
          <li><strong>Monetary donations</strong> are non-refundable and fund food distribution and platform operations.</li>
          <li><strong>Prohibited:</strong> fake or unsafe offers, reselling donated food, harassment, fraud, and unauthorized access.</li>
          <li>We may suspend or terminate accounts that violate these terms or put other users at risk.</li>
          <li>FeedHope is a facilitator — it is not liable for food quality or the conduct of any user.</li>
          <li>These terms may change. Continued use after updates means you accept the new version.</li>
          <li>These terms are governed by the laws of the jurisdiction in which FeedHope operates.</li>
        </ul>
      </div>
    </div>
  );
};

export default TermsOfService;
