import React, { useState } from "react";
import "../Styles/ForgetPassword.css";
import { Link, useNavigate } from "react-router-dom";

const ForgetPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [popupCode, setPopupCode] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  // New state to track if the code was copied
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();

  const handleSendCode = async () => {
    if (loading) return;
    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setPopupCode(data.code);
      setShowPopup(true);
      setCopied(false); // Reset copy state on new request

    } catch (err) {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle clipboard copy
  const handleCopy = () => {
    navigator.clipboard.writeText(popupCode).then(() => {
      setCopied(true);
    });
  };

  return (
    <div className="fp-container">
      <div className="fp-card">
        <Link to="/signin" className="fp-back">← Back to Login</Link>

        <div className="fp-logo">
          <div className="fp-logo-circle">
            <img
              src="/Images/logo-circle.png"
              alt="FeedHope Logo"
              className="fp-logo-img"
            />
          </div>
          <span></span>
        </div>

        <h1 className="fp-title">Forgot Password</h1>

        <p className="fp-subtitle">
          Enter your email address and we'll send you a 6-digit reset code.
        </p>

        {error && (
          <p style={{ color: "#ef4444", marginBottom: "15px", textAlign: "left", fontSize: "14px", fontWeight: "600" }}>
            {error}
          </p>
        )}

        <label className="fp-label">Email Address</label>
        <input
          className="fp-input"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button
          className="fp-button"
          onClick={handleSendCode}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Code"}
        </button>

        <p className="fp-signin">
          Remember your password? <Link to="/signin">Sign in</Link>
        </p>
      </div>

      {/* ✅ Reset Code Popup Modal */}
      {showPopup && (
        <div className="fp-modal-overlay">
          <div className="fp-modal-content">
            <div style={{ fontSize: "50px", marginBottom: "10px" }}>🔐</div>
            <h2 className="fp-title" style={{ textAlign: "center", width: "100%" }}>
              Your Reset Code
            </h2>
            <p className="fp-subtitle" style={{ textAlign: "center", marginBottom: "20px" }}>
              Copy this code to use on the next page.<br />
              <span style={{ color: "#dc2626", fontWeight: "700" }}>Expires in 2 minutes!</span>
            </p>

            {/* Code Box with Copy Button */}
            <div className="fp-code-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <p className="fp-code-text" style={{ margin: 0, fontSize: "24px", letterSpacing: "4px", fontWeight: "bold" }}>
                {popupCode}
              </p>

              <button
                onClick={handleCopy}
                style={{
                  backgroundColor: copied ? "#10b981" : "#f3f4f6",
                  color: copied ? "#fff" : "#374151",
                  border: copied ? "none" : "1px solid #d1d5db",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "all 0.2s"
                }}
              >
                {copied ? "✓ Code Copied!" : "📋 Copy Code"}
              </button>
            </div>

            <button
              className="fp-button"
              disabled={!copied} // Prevent navigation until copied
              onClick={() => navigate("/reset-password", { state: { email: email.trim() } })}
              style={{
                marginBottom: "12px",
                opacity: copied ? 1 : 0.6,
                cursor: copied ? "pointer" : "not-allowed"
              }}
            >
              {copied ? "Go to Reset →" : "Copy the code first"}
            </button>

            <button
              className="fp-back"
              style={{ textAlign: "center", width: "100%", border: "none", background: "none", cursor: "pointer", marginTop: "10px" }}
              onClick={() => setShowPopup(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgetPassword;