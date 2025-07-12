import React from 'react';

export const Sidebar: React.FC = () => {
  const stats = {
    countries: 18,
    responses: 12,
    ai_insights: 5
  };

  const regions = [
    { code: 'NL', name: 'Netherlands', active: 5 },
    { code: 'DE', name: 'Germany', active: 4 },
    { code: 'ES', name: 'Spain', active: 4 },
    { code: 'BR', name: 'Brazil', active: 2 }
  ];

  return (
    <div className="teams-sidebar">
      <h3>Live Statistics</h3>
      
      <div className="teams-stat-items">
        <div className="teams-stat-item teams-stat-primary">
          <div className="teams-stat-icon">🏢</div>
          <div className="teams-stat-content">
            <span className="teams-stat-label">Countries</span>
            <span className="teams-stat-badge">{stats.countries}</span>
          </div>
        </div>
        
        <div className="teams-stat-item teams-stat-success">
          <div className="teams-stat-icon">👥</div>
          <div className="teams-stat-content">
            <span className="teams-stat-label">Responses</span>
            <span className="teams-stat-badge teams-badge-success">{stats.responses}</span>
          </div>
        </div>
        
        <div className="teams-stat-item teams-stat-active">
          <div className="teams-stat-icon">🤖</div>
          <div className="teams-stat-content">
            <span className="teams-stat-label">AI Insights</span>
            <span className="teams-stat-badge teams-badge-error">{stats.ai_insights}</span>
          </div>
        </div>
      </div>

      <h4>AI Status</h4>
      <div className="teams-status-list">
        <div className="teams-status-item">
          <div className="teams-status-indicator teams-status-active"></div>
          <span>Proactive Monitoring</span>
        </div>
        <div className="teams-status-item">
          <div className="teams-status-indicator teams-status-active"></div>
          <span>AI Analysis</span>
        </div>
        <div className="teams-status-item">
          <div className="teams-status-indicator teams-status-active"></div>
          <span>Auto Actions</span>
        </div>
      </div>

      <h4>Supported Regions</h4>
      <div className="teams-region-list">
        {regions.map((region) => (
          <div key={region.code} className="teams-region-item">
            <div className="teams-region-code">{region.code}</div>
            <div className="teams-region-info">
              <span className="teams-region-name">{region.name}</span>
              <span className="teams-region-status">{region.active} regions active</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
