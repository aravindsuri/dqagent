import React from 'react';

export const QuickActions: React.FC = () => {
  return (
    <div className="quick-actions">
      <h2>Quick Actions</h2>
      <div className="action-buttons">
        <button>Start New Assessment</button>
        <button>View Reports</button>
      </div>
    </div>
  );
};