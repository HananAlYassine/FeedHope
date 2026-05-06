import React from 'react';
import './Card.css';

const Card = ({ className = '', children, padding = 'md', ...rest }) => (
  <section className={`fh-card fh-card--pad-${padding} ${className}`} {...rest}>
    {children}
  </section>
);

const CardHeader = ({ title, icon, action, className = '' }) => (
  <header className={`fh-card-header ${className}`}>
    <div className="fh-card-title">
      {icon && <span className="fh-card-icon">{icon}</span>}
      <span>{title}</span>
    </div>
    {action && <div className="fh-card-action">{action}</div>}
  </header>
);

const CardBody = ({ className = '', children }) => (
  <div className={`fh-card-body ${className}`}>{children}</div>
);

Card.Header = CardHeader;
Card.Body = CardBody;

export default Card;
