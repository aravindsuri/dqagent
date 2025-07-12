import React from 'react';
import { Link } from 'react-router-dom';

export const TabNavigation: React.FC = () => {

  const tabs = [
    { id: 'chat', label: 'Chat', path: '/chat', disabled: true },
    { id: 'data', label: 'Data', path: '/', active: true },
    { id: 'insights', label: 'AI Insights', path: '/insights', badge: 5, disabled: true },
    { id: 'actions', label: 'Actions', path: '/actions', disabled: true },
  ];

  return (
    <nav className="teams-tab-navigation">
      <div className="teams-tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            className={`teams-tab ${tab.active ? 'teams-tab-active' : ''} ${
              tab.disabled ? 'teams-tab-disabled' : ''
            }`}
          >
            {tab.badge && (
              <span className="teams-badge teams-badge-error">{tab.badge}</span>
            )}
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};