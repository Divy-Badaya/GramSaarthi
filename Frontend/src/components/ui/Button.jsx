import React from 'react';

/**
 * Reusable Button component.
 * Uses gs-btn design system classes.
 *
 * Props:
 *   variant: 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'finance' | 'navy' | 'danger'
 *   size:    'sm' | 'md' | 'lg' | 'xl'
 *   full:    boolean (100% width)
 *   loading: boolean (shows spinner)
 *   icon:    React element (leading icon)
 *   iconEnd: React element (trailing icon)
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  loading = false,
  icon = null,
  iconEnd = null,
  children,
  className = '',
  disabled,
  ...props
}) {
  const variantClass = `gs-btn-${variant}`;
  const sizeClass = size !== 'md' ? `gs-btn-${size}` : '';
  const fullClass = full ? 'gs-btn-full' : '';

  return (
    <button
      className={`gs-btn ${variantClass} ${sizeClass} ${fullClass} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="gs-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
      ) : icon}
      {children}
      {!loading && iconEnd}
    </button>
  );
}
