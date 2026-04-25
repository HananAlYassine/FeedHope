import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

/**
 * <BottomNav
 *   accent="donor"   // donor | receiver | volunteer | admin
 *   items={[
 *     { to: '/donor-dashboard', label: 'Home', icon: <DashboardIcon /> },
 *     { to: '/donor-my-offers', label: 'Offers', icon: <ListAltIcon /> },
 *     ...
 *   ]}
 * />
 *
 * Renders a fixed bottom tab bar visible only on mobile (<= 992px).
 */
const BottomNav = ({ items = [], accent = 'donor' }) => (
  <nav className={`fh-bnav fh-bnav--${accent}`} aria-label="Primary mobile navigation">
    {items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => `fh-bnav-item ${isActive ? 'is-active' : ''}`}
      >
        <span className="fh-bnav-icon">
          {item.icon}
          {item.badge > 0 && <span className="fh-bnav-badge">{item.badge > 99 ? '99+' : item.badge}</span>}
        </span>
        <span className="fh-bnav-label">{item.label}</span>
      </NavLink>
    ))}
  </nav>
);

export default BottomNav;
