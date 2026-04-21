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
import ReceiverDashboard from './Pages/Receiver/ReceiverDashboard';
import ReceiverProfile from './Pages/Receiver/ReceiverProfile';
import ReceiverBrowseOffers from './Pages/Receiver/ReceiverBrowseOffers';
import ReceiverOfferDetails from './Pages/Receiver/ReceiverOfferDetails';
import ReceiverAcceptedOffers from './Pages/Receiver/ReceiverAcceptedOffers';
import ReceiverHistory from './Pages/Receiver/ReceiverHistory';
import ReceiverNotifications from './Pages/Receiver/ReceiverNotifications';


// ── Donor section ──
import DonorDashboard from './Pages/Donor/DonorDashboard';
import DonorProfile from './Pages/Donor/DonorProfile';
import NewOffer from './Pages/Donor/DonorNewOffer';
import DonorMyOffers from './Pages/Donor/DonorMyOffers';
import DonorHistory from './Pages/Donor/DonorHistory';
import DonorMoneyDonation from './Pages/Donor/DonorMoneyDonation';
import DonorMoneyHistory from './Pages/Donor/DonorMoneyHistory';
import DonorFundDistributions from './Pages/Donor/DonorFundDistributions';
import DonorDeliveries from './Pages/Donor/DonorDeliveries';
import DonorFeedback from './Pages/Donor/DonorFeedback';
import DonorNotifications from './Pages/Donor/DonorNotifications';

// ── Volunteer section ──
import VolunteerDashboard from './Pages/Volunteer/VolunteerDashboard';
import VolunteerProfile from './Pages/Volunteer/VolunteerProfile';
import VolunteerHistory from './Pages/Volunteer/VolunteerHistory';
import VolunteerNotifications from './Pages/Volunteer/VolunteerNotifications';
import VolunteerAvailableOffers from './Pages/Volunteer/VolunteerAvailableOffers';
import VolunteerMyDeliveries from './Pages/Volunteer/VolunteerMyDeliveries';
import VolunteerFeedback from './Pages/Volunteer/VolunteerFeedback';

// ── Admin section ──
import AdminDashboard from './Pages/Admin/AdminDashboard';
import AdminFoodOffers from './Pages/Admin/AdminFoodOffers';
import AdminProfile from './Pages/Admin/AdminProfile';
import AdminUsers from './Pages/Admin/AdminUsers';
import AdminDeliveries from './Pages/Admin/AdminDeliveries';
import AdminMoneyDonations from './Pages/Admin/AdminMoneyDonations';
import AdminFundDistribution from './Pages/Admin/AdminFundDistribution';
import AdminNotifications from './Pages/Admin/AdminNotifications';


// ─────────────────────────────────────────────────────────────
//  ProtectedRoute — A simple guard component.
//  Reads the 'feedhope_user' item from localStorage (set on sign-in).
//  If the user is not logged in, redirect them to /signin.
//  If the user is logged in but has the wrong role, redirect to /.
// ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, requiredRole }) => {
    // Try to parse the user object saved in localStorage during sign-in
    const stored = localStorage.getItem('feedhope_user');
    const user = stored ? JSON.parse(stored) : null;

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



                {/* Registration Routes (Public) */}

                <Route path="/donor-registration" element={<DonorRegister />} />
                <Route path="/receiver-registration" element={<ReceiverRegister />} />
                <Route path="/volunteer-registration" element={<VolunteerRegister />} />



                {/* Receiver Section (Protected) */}

                <Route path="/receiver-dashboard" element={<ProtectedRoute requiredRole="Receiver"><ReceiverDashboard /></ProtectedRoute>} />
                <Route path="/receiver-profile" element={<ProtectedRoute requiredRole="Receiver"><ReceiverProfile /></ProtectedRoute>} />
                <Route path="/receiver-browse" element={<ProtectedRoute requiredRole="Receiver"><ReceiverBrowseOffers /></ProtectedRoute>} />
                <Route path="/receiver-offer/:offerId" element={<ProtectedRoute requiredRole="Receiver"><ReceiverOfferDetails /></ProtectedRoute>} />
                <Route path="/receiver-accepted" element={<ProtectedRoute requiredRole="Receiver"><ReceiverAcceptedOffers /></ProtectedRoute>} />
                <Route path="/receiver-history" element={<ProtectedRoute requiredRole="Receiver"><ReceiverHistory /></ProtectedRoute>} />
                <Route path="/receiver-notifications" element={<ProtectedRoute requiredRole="Receiver"><ReceiverNotifications /></ProtectedRoute>} />




                {/* Donor Section (Protected) */}

                <Route path="/donor-dashboard" element={<ProtectedRoute requiredRole="Donor"><DonorDashboard /></ProtectedRoute>} />
                <Route path="/donor-profile" element={<ProtectedRoute requiredRole="Donor"><DonorProfile /></ProtectedRoute>} />
                <Route path="/donor-new-offer" element={<ProtectedRoute requiredRole="Donor"><NewOffer /></ProtectedRoute>} />
                <Route path="/donor-my-offers" element={<ProtectedRoute requiredRole="Donor"><DonorMyOffers /></ProtectedRoute>} />
                <Route path="/donor-history" element={<ProtectedRoute requiredRole="Donor"><DonorHistory /></ProtectedRoute>} />
                <Route path="/donor-donate-money" element={<ProtectedRoute requiredRole="Donor"><DonorMoneyDonation /></ProtectedRoute>} />
                <Route path="/donor-donations-history" element={<ProtectedRoute requiredRole="Donor"><DonorMoneyHistory /></ProtectedRoute>} />
                <Route path="/donor-fund-distributions" element={<ProtectedRoute requiredRole="Donor"><DonorFundDistributions /></ProtectedRoute>} />
                <Route path="/donor-deliveries" element={<ProtectedRoute requiredRole="Donor"><DonorDeliveries /></ProtectedRoute>} />
                <Route path="/donor-feedback" element={<ProtectedRoute requiredRole="Donor"><DonorFeedback /></ProtectedRoute>} />
                <Route path="/donor-notifications" element={<ProtectedRoute requiredRole="Donor"><DonorNotifications /></ProtectedRoute>} />


                {/* ── Volunteer Section (Protected) ── */}

                <Route path="/volunteer-dashboard" element={<ProtectedRoute requiredRole="Volunteer"><VolunteerDashboard /></ProtectedRoute>} />
                <Route path="/volunteer-profile" element={<ProtectedRoute requiredRole="Volunteer"><VolunteerProfile /></ProtectedRoute>} />
                <Route path="/volunteer-available-offers" element={<ProtectedRoute requiredRole="Volunteer"><VolunteerAvailableOffers /></ProtectedRoute>} />
                <Route path="/volunteer/my-deliveries" element={<ProtectedRoute requiredRole="Volunteer"><VolunteerMyDeliveries /></ProtectedRoute>} />
                <Route path="/volunteer-history" element={<ProtectedRoute requiredRole="Volunteer"><VolunteerHistory /></ProtectedRoute>} />
                <Route path="/volunteer-feedback" element={<ProtectedRoute requiredRole="Volunteer"><VolunteerFeedback /></ProtectedRoute>} />
                <Route path="/volunteer-notifications" element={<ProtectedRoute requiredRole="Volunteer"><VolunteerNotifications /></ProtectedRoute>} />



                {/* Admin Section (Protected) */}

                <Route path="/admin-dashboard" element={<ProtectedRoute requiredRole="Admin"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin-food-offers" element={<ProtectedRoute requiredRole="Admin"><AdminFoodOffers /></ProtectedRoute>} />
                <Route path="/admin-profile" element={<ProtectedRoute requiredRole="Admin"><AdminProfile /></ProtectedRoute>} />
                <Route path="/admin-users" element={<ProtectedRoute requiredRole="Admin"><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin-deliveries" element={<ProtectedRoute requiredRole="Admin"><AdminDeliveries /></ProtectedRoute>} />
                <Route path="/admin-money-donations" element={<ProtectedRoute requiredRole="Admin"><AdminMoneyDonations /></ProtectedRoute>} />
                <Route path="/admin-fund-distribution" element={<ProtectedRoute requiredRole="Admin"><AdminFundDistribution /></ProtectedRoute>} />
                <Route path="/admin-notifications" element={<ProtectedRoute requiredRole="Admin"><AdminNotifications /></ProtectedRoute>} />



                {/* ── Catch-all: anything unknown goes back to Home ── */}
                <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
        </Router>
    );
}

export default App;