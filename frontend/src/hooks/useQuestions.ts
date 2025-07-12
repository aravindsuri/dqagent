import { useState } from 'react';
import { useQuery } from 'react-query';
import { questionnaireService } from '../services/questionnaire.service';

export const useQuestions = (country: string) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const {
    data: questionnaire,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['questionnaire', country],
    () => questionnaireService.generateQuestionnaire({
      country,
      report_file: `${country.toLowerCase()}_may_2025.json`
    }),
    {
      enabled: !!country,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  const questions = questionnaire?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const goToNextQuestion = () => {
    goToQuestion(currentQuestionIndex + 1);
  };

  const goToPreviousQuestion = () => {
    goToQuestion(currentQuestionIndex - 1);
  };

  const goToFirstIncompleteQuestion = (responses: any[]) => {
    const incompleteIndex = questions.findIndex(q => 
      !responses.some(r => r.question_id === q.id && r.status === 'completed')
    );
    if (incompleteIndex !== -1) {
      setCurrentQuestionIndex(incompleteIndex);
    }
  };

  return {
    questionnaire,
    questions,
    currentQuestion,
    currentQuestionIndex,
    isLoading,
    error,
    goToQuestion,
    goToNextQuestion,
    goToPreviousQuestion,
    goToFirstIncompleteQuestion,
    refetch
  };
};