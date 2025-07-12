import React from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar } from '../components/Layout';
import { QuestionnaireHeader } from '../components/Questionnaire';
import { useQuestionnaire } from '../hooks/useQuestionnaire';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';

export const Questionnaire: React.FC = () => {
  const { country } = useParams<{ country: string }>();
  
  const { 
    questionnaire, 
    loading, 
    error
  } = useQuestionnaire(country || 'netherlands');

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="teams-error">Error: {error}</div>;
  if (!questionnaire) return <div className="teams-error">No questionnaire found</div>;

  return (
    <div className="teams-questionnaire">
      <Sidebar />
      
      <div className="teams-content">
        <QuestionnaireHeader 
          questionnaire={questionnaire}
          progress={{
            current: 0,
            total: 0,
            percentage: 0
          }}
        />
        
        <div className="teams-questionnaire-body">
          <p>Questionnaire for {country} - Coming soon</p>
        </div>
      </div>
    </div>
  );
};
