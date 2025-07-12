import { QuestionPriority } from '../types/questionnaire.types';

export const getPriorityColor = (priority: QuestionPriority): string => {
  switch (priority) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
    default:
      return 'low';
  }
};

export const getPriorityIcon = (priority: QuestionPriority): string => {
  switch (priority) {
    case 'critical':
      return '🚨';
    case 'high':
      return '⚠️';
    case 'medium':
      return '📋';
    case 'low':
    default:
      return '📝';
  }
};

export const getPriorityWeight = (priority: QuestionPriority): number => {
  switch (priority) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
    default:
      return 1;
  }
};

export const sortQuestionsByPriority = <T extends { priority: QuestionPriority; order_sequence: number }>(
  questions: T[]
): T[] => {
  return [...questions].sort((a, b) => {
    const priorityDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return a.order_sequence - b.order_sequence;
  });
};

export const getQuestionCategoryIcon = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'overview':
      return '📊';
    case 'additional information':
      return '📋';
    case 'writeoffs':
      return '💰';
    case 'warnings':
      return '⚠️';
    case 'errors':
      return '🚫';
    case 'acquisitions':
      return '🏢';
    default:
      return '📝';
  }
};

export const validateResponse = (
  response: string,
  validationRules: string[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (const rule of validationRules) {
    if (rule.startsWith('min_length:')) {
      const minLength = parseInt(rule.split(':')[1]);
      if (response.length < minLength) {
        errors.push(`Response must be at least ${minLength} characters long`);
      }
    }
    
    if (rule === 'requires_explanation' && !response.toLowerCase().includes('because')) {
      errors.push('Response should include an explanation of the cause');
    }
    
    if (rule === 'requires_timeline' && !/\d{4}|month|week|day|quarter|q[1-4]/i.test(response)) {
      errors.push('Response should include a timeline or date');
    }
    
    if (rule === 'requires_action_plan' && !/plan|action|measure|step|implement/i.test(response)) {
      errors.push('Response should include an action plan or next steps');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};