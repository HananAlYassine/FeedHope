import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  SwapHoriz as SwapHorizIcon,
  Wallet,
  AccountBalanceWallet as AccountBalanceWalletIcon,
} from '@mui/icons-material';

const DonorSidebar = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Get user from localStorage
  const storedUser = localStorage.getItem('feedhope_user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  const fetchUnreadCount = async () => {
    if (!user || !user.user_id) return;
    try {
      const response = await axios.get(`http://localhost:5000/api/donor/notifications/unread-count/${user.user_id}`);
      setUnreadCount(response.data.count || 0);
    } catch (err) {
      console.error("Sidebar badge error:", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    window.addEventListener('notifUpdated', fetchUnreadCount);
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      window.removeEventListener('notifUpdated', fetchUnreadCount);
      clearInterval(interval);
    };
  }, [user?.user_id]);

  // --- LOGOUT WITH SYSLOG ---
  const handleLogout = async () => {
    try {
      if (user && user.user_id) {
        await axios.post("http://localhost:5000/api/logout", {
          userId: user.user_id,
          role: 'Donor'
        });
      }
    } catch (err) {
      console.error("Logout syslog failed:", err);
    } finally {
      localStorage.removeItem('feedhope_user');
      navigate('/signin');
    }
  };

  return (
    <aside className="fh-sidebar">
      <div className="fh-sidebar-header">
        <div className="logo-circlee">
          <img src="/Images/logo-circle.png" alt="Logo" className="header-logo-img" />
        </div>
        <h1 className="fh-logo-text">FeedHope</h1>
      </div>

      <div className="fh-role-box">
        <div className="fh-role-inner">
          <div className="fh-role-info">
            <div className="fh-role-icon-small"><DashboardIcon sx={{ fontSize: 14, color: '#666' }} /></div>
            <span className="fh-role-name">Donor</span>
          </div>
          <button className="fh-role-switch" title="Switch role"><SwapHorizIcon sx={{ fontSize: 16 }} /></button>
        </div>
      </div>

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
        <SidebarLink to="/donor-fund-distributions" icon={<AccountBalanceWalletIcon />} label="Fund Distributions" />
        <SidebarLink to="/donor-deliveries" icon={<LocalShippingIcon />} label="Deliveries" />
        <SidebarLink to="/donor-feedback" icon={<FeedbackIcon />} label="Feedback" />
        <SidebarLink
          to="/donor-notifications"
          icon={<NotificationsIcon />}
          label="Notifications"
          badge={unreadCount > 0 ? unreadCount : null}
        />
      </nav>

      <div className="fh-sidebar-footer">
        <button className="fh-logout-btn" onClick={handleLogout}>
          <ExitToAppIcon sx={{ fontSize: 20 }} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

const SidebarLink = ({ to, icon, label, badge }) => (
  <NavLink to={to} className={({ isActive }) => `fh-nav-item ${isActive ? 'active' : ''}`}>
    <div className="fh-nav-content">
      <span className="fh-nav-icon">{icon}</span>
      <span className="fh-nav-text">{label}</span>
    </div>
    {badge && <span className="fh-nav-badge">{badge}</span>}
  </NavLink>
);

export default DonorSidebar;