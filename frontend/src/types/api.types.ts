import { Question, ConfidenceLevel } from './questionnaire.types';

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: string;
  }
  
  export interface QuestionGenerationRequest {
    country: string;
    report_file: string;
    focus_areas?: string[];
  }
  
  export interface QuestionGenerationResponse {
    country: string;
    entity: string;
    report_date: string;
    questions: Array<Question>;
    summary: {
      total_questions: number;
      high_priority: number;
      critical_priority: number;
      categories: string[];
      requires_immediate_attention: boolean;
    };
  }
  
  export interface ResponseSubmissionRequest {
    question_id: string;
    response_text?: string;
    response_data?: Record<string, any>;
    confidence_level: ConfidenceLevel;
    uploaded_files?: string[];
    submitted_by: string;
  }
  
  export interface ValidationResult {
    is_valid: boolean;
    validation_score: number;
    issues: string[];
    suggestions: string[];
  }
  
  export interface Country {
    code: string;
    name: string;
    entity_id: string;
    entity_name: string;
    active: boolean;
    region: string;
  }
  
  export interface UserProfile {
    id: string;
    name: string;
    email: string;
    country: string;
    role: 'market_team' | 'risk_analyst' | 'admin';
    permissions: string[];
  }
  