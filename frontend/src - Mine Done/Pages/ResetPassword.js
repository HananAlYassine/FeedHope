import React, { useState } from "react";
import "../Styles/ResetPassword.css";
import { Link, useNavigate, useLocation } from "react-router-dom";
// Material UI Icons
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State Management - Initialize email with the value passed from ForgetPassword if it exists
  const [email, setEmail] = useState(location.state?.email || "");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI States
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setError("");

    if (!email || !resetCode || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 3 || newPassword.length > 10) {
      setError("Password must be between 3 and 10 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          token: resetCode.trim(),
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid code or email.");
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate("/signin"), 3000);
    } catch (err) {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rp-container">
      <div className="rp-card">
        <Link to="/forgot-password" size="small" className="rp-back" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <ArrowBackIcon sx={{ fontSize: 18 }} /> Back
        </Link>

        <div className="rp-logo">
          <div className="rp-logo-circle">
            <img src="/Images/logo-circle.png" alt="Logo" className="rp-logo-img" />
          </div>
          <span></span>
        </div>

        <h1 className="rp-title">Reset Password</h1>

        {!success ? (
          <>
            <p className="rp-subtitle">
              Enter your email, the OTP code, and your new password.
            </p>

            {error && <p className="rp-error">{error}</p>}

            {/* Email Field - Will be pre-filled if navigating from ForgetPassword */}
            <label className="rp-label">Email Address</label>
            <input
              className="rp-input"
              type="email"
              placeholder="Confirm your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Reset Code Field - User can click here and paste their copied code */}
            <label className="rp-label">Reset Code (OTP)</label>
            <input
              className="rp-input"
              style={{
                textAlign: "center",
                letterSpacing: "4px",
                fontWeight: "bold",
                fontSize: "1.2rem",
              }}
              type="text"
              placeholder="Paste 6-digit code"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              maxLength={6}
            />

            {/* New Password Field */}
            <label className="rp-label">New Password</label>
            <div className="rp-input-wrapper">
              <input
                className="rp-input"
                type={showNew ? "text" : "password"}
                placeholder="3-10 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div className="rp-eye" onClick={() => setShowNew(!showNew)}>
                {showNew ? <VisibilityOff /> : <Visibility />}
              </div>
            </div>

            {/* Confirm Password Field */}
            <label className="rp-label">Confirm Password</label>
            <div className="rp-input-wrapper">
              <input
                className="rp-input"
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <div className="rp-eye" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <VisibilityOff /> : <Visibility />}
              </div>
            </div>

            <button className="rp-button" onClick={handleReset} disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        ) : (
          <div className="rp-success" style={{ textAlign: 'center' }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 60, color: "#10b981", mb: 2 }} />
            <p className="rp-success-title">Password Updated!</p>
            <p className="rp-success-sub">Redirecting to sign in...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;