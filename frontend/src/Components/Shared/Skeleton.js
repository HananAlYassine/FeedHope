import React from 'react';
import './Skeleton.css';

/**
 * <Skeleton width="60%" height={20} radius={6} />
 * <Skeleton.Card />     animated card placeholder
 * <Skeleton.Row count={5} />   list of row placeholders
 * <Skeleton.Stat count={4} />  dashboard stats row
 */
const Skeleton = ({ width = '100%', height = 14, radius = 6, className = '', style = {} }) => (
  <span
    className={`fh-skel ${className}`}
    style={{ width, height, borderRadius: radius, ...style }}
    aria-hidden="true"
  />
);

const SkeletonCard = () => (
  <div className="fh-skel-card">
    <Skeleton width="40%" height={16} />
    <Skeleton width="100%" height={12} style={{ marginTop: 12 }} />
    <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
    <Skeleton width="60%" height={12} style={{ marginTop: 8 }} />
  </div>
);

const SkeletonRow = ({ count = 5 }) => (
  <div className="fh-skel-rows">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="fh-skel-row">
        <Skeleton width={40} height={40} radius={8} />
        <div className="fh-skel-row-text">
          <Skeleton width="50%" height={14} />
          <Skeleton width="30%" height={10} style={{ marginTop: 6 }} />
        </div>
      </div>
    ))}
  </div>
);

const SkeletonStat = ({ count = 4 }) => (
  <div className="fh-skel-stats" style={{ '--cols': count }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="fh-skel-stat">
        <Skeleton width={48} height={48} radius={8} />
        <div className="fh-skel-stat-text">
          <Skeleton width="60%" height={22} />
          <Skeleton width="40%" height={11} style={{ marginTop: 6 }} />
        </div>
      </div>
    ))}
  </div>
);

Skeleton.Card = SkeletonCard;
Skeleton.Row = SkeletonRow;
Skeleton.Stat = SkeletonStat;

export default Skeleton;
