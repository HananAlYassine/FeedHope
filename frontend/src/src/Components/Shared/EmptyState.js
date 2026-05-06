import React from 'react';
import InboxIcon from '@mui/icons-material/Inbox';
import './EmptyState.css';

/**
 * <EmptyState
 *   icon={<RestaurantMenuIcon />}
 *   title="No offers yet"
 *   description="Create your first donation to share with the community."
 *   action={<Button onClick={...}>New Offer</Button>}
 * />
 */
const EmptyState = ({
  icon,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}) => (
  <div className={`fh-empty ${className}`}>
    <div className="fh-empty-icon">{icon || <InboxIcon style={{ fontSize: 48 }} />}</div>
    <h3 className="fh-empty-title">{title}</h3>
    {description && <p className="fh-empty-desc">{description}</p>}
    {action && <div className="fh-empty-action">{action}</div>}
  </div>
);

export default EmptyState;
