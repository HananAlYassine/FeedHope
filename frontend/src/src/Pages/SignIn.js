import React, { useState, useEffect } from "react";
import "../Styles/SignIn.css";
import { Link, useNavigate } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

// Keys used to persist the remember-me state between app sessions.
// We deliberately never store the password — that would be exposed by
// any XSS attack. The signed-in user object is already persisted in
// `feedhope_user` (set during a successful login), so when the user
// reopens the app we only need to auto-redirect them to their
// dashboard if they previously opted into Remember Me.
const REMEMBER_KEY = "feedhope_remember_email";
const REMEMBER_FLAG = "feedhope_remember";

const dashboardRouteFor = (role) => {
  if (role === "Admin")     return "/admin-dashboard";
  if (role === "Donor")     return "/donor-dashboard";
  if (role === "Receiver")  return "/receiver-dashboard";
  if (role === "Volunteer") return "/volunteer-dashboard";
  return null;
};

const SignIn = () => {
  const [show, setShow] = useState(false);
  // Lazy initial state: prefill from localStorage on first render
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ── Auto-redirect on mount: if the user previously opted into
  // Remember Me AND there is a stored session, skip this page and
  // jump straight to their dashboard. This is what makes the
  // "close + reopen the app and land directly inside" flow work.
  useEffect(() => {
    const remember = localStorage.getItem(REMEMBER_FLAG) === "1";
    const stored = localStorage.getItem("feedhope_user");
    if (!remember || !stored) return;
    try {
      const user = JSON.parse(stored);
      const path = dashboardRouteFor(user?.current_role || user?.role);
      if (path) navigate(path, { replace: true });
    } catch {
      /* corrupt session — let the normal sign-in flow handle it */
    }
  }, [navigate]);

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

      // Backend now returns `roles: [...]` and `current_role`. Keep `role`
      // as a fallback for any code that still reads the legacy field.
      const stored = {
        ...data.user,
        roles: data.user.roles || (data.user.role ? [data.user.role] : []),
        current_role: data.user.current_role || data.user.role || null,
      };
      localStorage.setItem("feedhope_user", JSON.stringify(stored));

      // Remember-me: persist the email + a flag so future visits to the
      // landing or sign-in page auto-redirect to the dashboard. We never
      // store the password (XSS / shared-device risk).
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, email);
        localStorage.setItem(REMEMBER_FLAG, "1");
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        localStorage.removeItem(REMEMBER_FLAG);
      }

      const role = stored.current_role;
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
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              /> Remember me
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