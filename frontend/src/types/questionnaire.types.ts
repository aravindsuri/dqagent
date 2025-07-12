export type QuestionPriority = 'low' | 'medium' | 'high' | 'critical';
export type ResponseType = 'text' | 'file_upload' | 'structured' | 'multiple_choice';
export type ResponseStatus = 'pending' | 'partial' | 'completed' | 'approved';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Question {
  id: string;
  category: string;
  priority: QuestionPriority;
  question_text: string;
  context: string;
  expected_response_type: ResponseType;
  validation_rules: string[];
  related_data: Record<string, any>;
  follow_up_questions?: string[];
  order_sequence: number;
  generated_by_ai: boolean;
  confidence_score?: number;
}

export interface QuestionResponse {
  id?: string;
  question_id: string;
  response_text?: string;
  response_data?: Record<string, any>;
  confidence_level: ConfidenceLevel;
  uploaded_files?: string[];
  submitted_at?: string;
  submitted_by: string;
  status: ResponseStatus;
  ai_validated?: boolean;
  ai_validation_score?: number;
  ai_suggestions?: string[];
}

export interface Questionnaire {
  id: string;
  country: string;
  entity: string;
  report_file: string;
  generated_at: string;
  due_date: string;
  status: ResponseStatus;
  questions: Question[];
  responses: QuestionResponse[];
  progress: {
    total_questions: number;
    completed_responses: number;
    completion_percentage: number;
  };
}

export interface QuestionnaireMetadata {
  country: string;
  entity: string;
  report_date: string;
  total_questions: number;
  high_priority_count: number;
  critical_priority_count: number;
  completion_percentage: number;
  due_date: string;
  days_remaining: number;
}