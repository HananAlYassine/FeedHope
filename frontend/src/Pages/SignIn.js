import React, { useState } from "react";
import "../Styles/SignIn.css";
import { Link, useNavigate } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const SignIn = () => {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignIn = async () => {
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Sign in failed.");
        return;
      }

      localStorage.setItem("feedhope_user", JSON.stringify(data.user));

      const role = data.user.role;

      if (role === "Admin") navigate("/admin-dashboard");
      else if (role === "Donor") navigate("/donor-dashboard");
      else if (role === "Receiver") navigate("/receiver-dashboard");
      else if (role === "Volunteer") navigate("/volunteer-dashboard");
      else navigate("/");

    } catch (err) {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page">

      {/* Suppress Edge/Chrome native password eye icon */}
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear,
        input[type="password"]::-webkit-credentials-auto-fill-button {
          display: none !important;
        }
      `}</style>

      <div className="signin-wrapper">

        {/* LEFT SIDE */}
        <div className="signin-left">
          <div className="brand">
            <div className="brand-icon">
              <img
                src="/Images/logo-circle.png"
                alt="FeedHope Logo"
                className="brand-logo-img"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <span>FeedHope</span>
          </div>
          <h1>Welcome back to our community!</h1>
          <p>
            Join thousands of donors, receivers, and volunteers working together
            to reduce food waste and feed those in need.
          </p>
          <ul className="features">
            <li>Connect with local food donors</li>
            <li>Track your donations in real-time</li>
            <li>Make a difference in your community</li>
            <li>Simple and secure platform</li>
          </ul>
        </div>

        {/* RIGHT SIDE */}
        <div className="signin-right">

          <Link to="/" className="back-home-link">← Back to Home</Link>

          <div className="signin-header">
            <h1>Sign In</h1>
            <p>Enter your credentials to access your account</p>
          </div>

          {error && <p style={{ color: "red", marginBottom: "10px" }}>{error}</p>}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password field with MUI eye toggle */}
          <div className="form-group password">
            <label>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={show ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShow(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#718096',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
                tabIndex={-1}
              >
                {show ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" /> Remember me
            </label>
            <Link to="/forgetpassword" className="forgot-password">Forgot password?</Link>
          </div>

          <button className="signin-button" onClick={handleSignIn} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="signup-link">
            Don't have an account? <Link to="/donor-registration">Sign up for free</Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SignIn;