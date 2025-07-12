import { useState, useEffect } from 'react';
import { Questionnaire, Question, QuestionResponse } from '../types/questionnaire.types';

export const useQuestionnaire = (country: string) => {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock data for now
    setLoading(false);
    setQuestionnaire({
      id: '1',
      country,
      entity: 'Netherlands',
      report_file: 'netherlands_may_2025.json',
      generated_at: '2025-01-12',
      due_date: '2025-01-20',
      status: 'pending',
      questions: [],
      responses: [],
      progress: {
        total_questions: 0,
        completed_responses: 0,
        completion_percentage: 0
      }
    });
  }, [country]);

  const saveResponse = (questionId: string, response: any) => {
    // Mock implementation
    console.log('Saving response:', questionId, response);
  };

  const submitResponse = (questionId: string, response: any) => {
    // Mock implementation
    console.log('Submitting response:', questionId, response);
  };

  return {
    questionnaire,
    questions,
    responses,
    loading,
    error,
    submitResponse,
    saveResponse
  };
}; 