import React from 'react';
import Button from './Button.jsx';

/**
 * Reusable EmptyState component.
 *
 * Props:
 *   icon:        React element (Lucide icon, default size 28)
 *   emoji:       string (emoji alternative to icon)
 *   title:       string
 *   description: string
 *   action:      { label, onClick, variant } (optional CTA button)
 */
export default function EmptyState({ icon, emoji, title, description, action }) {
  return (
    <div className="gs-empty">
      <div className="gs-empty-icon">
        {emoji ? (
          <span style={{ fontSize: '28px' }}>{emoji}</span>
        ) : icon}
      </div>
      {title && <p className="gs-empty-title">{title}</p>}
      {description && <p className="gs-empty-desc">{description}</p>}
      {action && (
        <Button variant={action.variant || 'primary'} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
