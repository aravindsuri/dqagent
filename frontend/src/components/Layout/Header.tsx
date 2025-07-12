import React from 'react';
import { UserProfile } from '.';

export const Header: React.FC = () => {
  return (
    <header className="teams-header">
      <div className="teams-header-content">
        <div className="teams-app-info">
          <div className="teams-app-icon">
            <div className="teams-app-icon-grid">
              <div className="grid-item"></div>
              <div className="grid-item"></div>
              <div className="grid-item"></div>
              <div className="grid-item"></div>
            </div>
          </div>
          <div className="teams-app-title">
            <h1>Data Quality Assistant</h1>
          </div>
        </div>
        
        <div className="teams-header-actions">
          <button className="teams-icon-button" title="Search">
            🔍
          </button>
          <button className="teams-icon-button" title="Notifications">
            🔔
          </button>
          <button className="teams-icon-button" title="Settings">
            ⚙️
          </button>
          <UserProfile />
        </div>
      </div>
    </header>
  );
};