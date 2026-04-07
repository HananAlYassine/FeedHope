// ========================================
//  FeedHope — Omar & Hanan — App.js
// ========================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ── Public pages ──
import LandingPage from "./Pages/LandingPage";
import SignIn from "./Pages/SignIn";
import ForgetPassword from './Pages/ForgetPassword';
import Mission from './Pages/Mission';
import HowItWorks from './Pages/HowItWorks';
import ContactUs from './Pages/ContactUs';
import ResetPassword from "./Pages/ResetPassword";


// ── Registration pages ──
import DonorRegister from './Pages/Donor/DonorRegistration';
import ReceiverRegister from './Pages/Receiver/ReceiverRegistration';
import VolunteerRegister from './Pages/Volunteer/VolunteerRegistration';

// ── Receiver section ──
// ReceiverDashboard is protected — users should be signed in and have role = 'Receiver'
import ReceiverDashboard from './Pages/Receiver/ReceiverDashboard';
import ReceiverProfile from './Pages/Receiver/ReceiverProfile';
import ReceiverBrowseOffers from './Pages/Receiver/ReceiverBrowseOffers';
import ReceiverOfferDetails from './Pages/Receiver/ReceiverOfferDetails';


// ─────────────────────────────────────────────────────────────
//  ProtectedRoute — A simple guard component.
//  Reads the 'feedhope_user' item from localStorage (set on sign-in).
//  If the user is not logged in, redirect them to /signin.
//  If the user is logged in but has the wrong role, redirect to /.
// ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, requiredRole }) => {
    // Try to parse the user object saved in localStorage during sign-in
    const stored = localStorage.getItem('feedhope_user');
    const user   = stored ? JSON.parse(stored) : null;

    // Not logged in at all → go to sign-in page
    if (!user) return <Navigate to="/signin" replace />;

    // Logged in but wrong role (e.g. Donor trying to access Receiver dashboard) → go home
    if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;

    // All good — render the protected page
    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                {/* ── Public Routes ── */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/mission" element={<Mission />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/forgetpassword" element={<ForgetPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* ── Registration Routes ── */}
                <Route path="/donor-registration" element={<DonorRegister />} />
                <Route path="/receiver-registration" element={<ReceiverRegister />} />
                <Route path="/volunteer-registration" element={<VolunteerRegister />} />
                
                

                {/* ── Receiver Section (Protected) ──
                    Both routes require the user to be signed in with role = 'Receiver'.
                    Any other user will be redirected to /signin or /. */}

                {/* Browse Offers — first item in the Receiver sidebar */}
                <Route
                    path="/receiver-dashboard"
                    element={
                        <ProtectedRoute requiredRole="Receiver">
                            <ReceiverDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Browse Offers — second item in the Receiver sidebar */}
                <Route
                    path="/receiver-profile"
                    element={
                        <ProtectedRoute requiredRole="Receiver">
                            <ReceiverProfile />
                        </ProtectedRoute>
                    }
                />

                {/* Browse Offers — third item in the Receiver sidebar */}
                <Route
                    path="/receiver-browse"
                    element={
                        <ProtectedRoute requiredRole="Receiver">
                            <ReceiverBrowseOffers />
                        </ProtectedRoute>
                    }
                />

                {/* ── Offer Detail Page ── */}
                <Route
                    path="/receiver-offer/:offerId"
                    element={
                        <ProtectedRoute requiredRole="Receiver">
                            <ReceiverOfferDetails />
                        </ProtectedRoute>
                    }
                />




                {/* ── Catch-all: anything unknown goes back to Home ── */}
                <Route path="*" element={<Navigate to="/" replace />} />
                    
            </Routes>
        </Router>
    );
}

export default App;