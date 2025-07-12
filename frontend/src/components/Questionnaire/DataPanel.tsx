import React from 'react';
import { Questionnaire } from '../../types/questionnaire.types';

interface DataPanelProps {
  questionnaire: Questionnaire;
}

export const DataPanel: React.FC<DataPanelProps> = ({ questionnaire }) => {
  // Mock DQ data based on Netherlands example
  const mockDQData = {
    relevant_portfolio: {
      contracts: 8720,
      nbv: 529650427.19,
      gross_exposure: 529650427.04,
      delinquent_amount: 682924.14
    },
    error_portfolio: {
      contracts: 3,
      amount: -0.15
    },
    key_changes: {
      contract_end_dates: 186,
      rating_updates: 145,
      borrower_types: 16,
      dealer_changes: 27
    }
  };

  const formatCurrency = (amount: number): string => {
    if (Math.abs(amount) >= 1000000) {
      return `€${(amount / 1000000).toFixed(2)}M`;
    }
    return `€${amount.toLocaleString()}`;
  };

  return (
    <div className="teams-data-panel">
      <h4>📊 Related DQ Data</h4>
      
      {/* Relevant Portfolio */}
      <div className="teams-data-card teams-data-card-success">
        <div className="teams-data-header">
          <span className="teams-data-title">RELEVANT PORTFOLIO</span>
        </div>
        <div className="teams-data-content">
          <div className="teams-data-item">
            <span className="teams-data-label">📋 Contracts:</span>
            <span className="teams-data-value">{mockDQData.relevant_portfolio.contracts.toLocaleString()}</span>
          </div>
          <div className="teams-data-item">
            <span className="teams-data-label">💰 NBV:</span>
            <span className="teams-data-value">{formatCurrency(mockDQData.relevant_portfolio.nbv)}</span>
          </div>
          <div className="teams-data-item">
            <span className="teams-data-label">📈 Gross Exposure:</span>
            <span className="teams-data-value">{formatCurrency(mockDQData.relevant_portfolio.gross_exposure)}</span>
          </div>
          <div className="teams-data-item teams-data-warning">
            <span className="teams-data-label">⚠️ Delinquent:</span>
            <span className="teams-data-value">{formatCurrency(mockDQData.relevant_portfolio.delinquent_amount)}</span>
          </div>
        </div>
      </div>

      {/* Error Portfolio */}
      <div className="teams-data-card teams-data-card-error">
        <div className="teams-data-header">
          <span className="teams-data-title">ERROR PORTFOLIO</span>
        </div>
        <div className="teams-data-content">
          <div className="teams-data-item">
            <span className="teams-data-label">🚫 Contracts:</span>
            <span className="teams-data-value">{mockDQData.error_portfolio.contracts}</span>
          </div>
          <div className="teams-data-item">
            <span className="teams-data-label">💸 Amount:</span>
            <span className="teams-data-value">{formatCurrency(mockDQData.error_portfolio.amount)}</span>
          </div>
          <div className="teams-data-note">
            Negative amounts detected
          </div>
        </div>
      </div>

      {/* Key Changes */}
      <div className="teams-data-card teams-data-card-info">
        <div className="teams-data-header">
          <span className="teams-data-title">KEY CHANGES (MAY 2025)</span>
        </div>
        <div className="teams-data-content">
          <div className="teams-data-item">
            <span className="teams-data-label">📅 Contract End Date:</span>
            <span className="teams-data-value teams-data-highlight">{mockDQData.key_changes.contract_end_dates}</span>
          </div>
          <div className="teams-data-item">
            <span className="teams-data-label">⭐ Rating Changes:</span>
            <span className="teams-data-value teams-data-highlight">{mockDQData.key_changes.rating_updates}</span>
          </div>
          <div className="teams-data-item">
            <span className="teams-data-label">👥 Borrower Type:</span>
            <span className="teams-data-value">{mockDQData.key_changes.borrower_types}</span>
          </div>
          <div className="teams-data-item">
            <span className="teams-data-label">🏢 Dealer Changes:</span>
            <span className="teams-data-value">{mockDQData.key_changes.dealer_changes}</span>
          </div>
        </div>
      </div>
    </div>
  );
};