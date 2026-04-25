import React from 'react';
import './Button.css';

const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'fh-btn',
    `fh-btn--${variant}`,
    `fh-btn--${size}`,
    fullWidth && 'fh-btn--full',
    loading && 'fh-btn--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {leftIcon && <span className="fh-btn-icon">{leftIcon}</span>}
      <span className="fh-btn-label">{children}</span>
      {rightIcon && <span className="fh-btn-icon">{rightIcon}</span>}
    </button>
  );
};

export default Button;
