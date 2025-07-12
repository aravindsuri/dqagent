import React from 'react';
import { Questionnaire } from '../../types/questionnaire.types';

interface QuestionnaireHeaderProps {
  questionnaire: Questionnaire;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
}

export const QuestionnaireHeader: React.FC<QuestionnaireHeaderProps> = ({ questionnaire, progress }) => {
  return (
    <div className="questionnaire-header">
      <h1>{questionnaire.entity} - Data Quality Assessment</h1>
      <div className="progress-info">
        <span>Progress: {progress.current} of {progress.total} ({progress.percentage}%)</span>
      </div>
    </div>
  );
};