import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../../Styles/Donor/DonorSidebar.css';

// Material UI Icons
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  AddCircle as AddCircleIcon,
  ListAlt as ListAltIcon,
  History as HistoryIcon,
  AttachMoney as AttachMoneyIcon,
  LocalShipping as LocalShippingIcon,
  Feedback as FeedbackIcon,
  Notifications as NotificationsIcon,
  ExitToApp as ExitToAppIcon,
  Restaurant as RestaurantIcon,
  SwapHoriz as SwapHorizIcon,
  Wallet,
} from '@mui/icons-material';

const DonorSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('feedhope_user');
    navigate('/signin');
  };

  return (
    <aside className="fh-sidebar">
      {/* Brand Header - Consistent with Receiver */}
      <div className="fh-sidebar-header">
        <div className="logo-circle">
          {/* App logo image — stored in /public/Images/ */}
          <img
            src="/Images/logo-circle.png"
            alt="FeedHope Logo"
            className="header-logo-img"
          />
        </div>
        <h1 className="fh-logo-text">FeedHope</h1>
      </div>

      {/* Role Switcher - Consistent styling with Receiver */}
      <div className="fh-role-box">
        <div className="fh-role-inner">
          <div className="fh-role-info">
            <div className="fh-role-icon-small">
              <DashboardIcon sx={{ fontSize: 14, color: '#666' }} />
            </div>
            <span className="fh-role-name">Donor</span>
          </div>
          <button className="fh-role-switch" title="Switch role">
            <SwapHorizIcon sx={{ fontSize: 16 }} />
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="fh-sidebar-nav">
        <p className="fh-nav-label">Overview</p>
        <SidebarLink to="/donor-dashboard" icon={<DashboardIcon />} label="Dashboard" />
        <SidebarLink to="/donor-profile" icon={<PersonIcon />} label="My Profile" />

        <p className="fh-nav-label">Donations</p>
        <SidebarLink to="/donor-new-offer" icon={<AddCircleIcon />} label="New Offer" />
        <SidebarLink to="/donor-my-offers" icon={<ListAltIcon />} label="My Offers" />
        <SidebarLink to="/donor-history" icon={<HistoryIcon />} label="History" />

        <p className="fh-nav-label">Finance & Tracking</p>
        <SidebarLink to="/donor-donate-money" icon={<AttachMoneyIcon />} label="Money Donation" />
        <SidebarLink to="/donor-donations-history" icon={<Wallet />} label="Donations History" />
        <SidebarLink to="/donor-deliveries" icon={<LocalShippingIcon />} label="Deliveries" />
        <SidebarLink to="/donor-feedback" icon={<FeedbackIcon />} label="Feedback" />
        <SidebarLink to="/donor-notifications" icon={<NotificationsIcon />} label="Notifications" badge="1" />
      </nav>

      {/* Footer / Logout */}
      <div className="fh-sidebar-footer">
        <button className="fh-logout-btn" onClick={handleLogout}>
          <ExitToAppIcon sx={{ fontSize: 20 }} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

// Sub-component for individual links
const SidebarLink = ({ to, icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `fh-nav-item ${isActive ? 'active' : ''}`}
  >
    <div className="fh-nav-content">
      <span className="fh-nav-icon">{icon}</span>
      <span className="fh-nav-text">{label}</span>
    </div>
    {badge && <span className="fh-nav-badge">{badge}</span>}
  </NavLink>
);

export default DonorSidebar;