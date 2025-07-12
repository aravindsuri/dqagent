import { api } from './api';
import { 
  QuestionGenerationRequest, 
  QuestionGenerationResponse,
  ResponseSubmissionRequest,
  ApiResponse
} from '../types/api.types';
import { Questionnaire } from '../types/questionnaire.types';

export const questionnaireService = {
  async generateQuestionnaire(request: QuestionGenerationRequest): Promise<QuestionGenerationResponse> {
    const response = await api.post<QuestionGenerationResponse>('/questionnaire/generate', request);
    return response.data;
  },

  async getQuestionnaire(questionnaireId: string): Promise<Questionnaire> {
    const response = await api.get<Questionnaire>(`/questionnaire/${questionnaireId}`);
    return response.data;
  },

  async submitResponse(questionnaireId: string, request: ResponseSubmissionRequest): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>(`/questionnaire/${questionnaireId}/response`, request);
    return response.data;
  },

  async submitBulkResponses(questionnaireId: string, request: ResponseSubmissionRequest[]): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>(`/questionnaire/${questionnaireId}/bulk-response`, request);
    return response.data;
  },

  async getCountries(): Promise<any> {
    const response = await api.get('/countries');
    return response.data;
  },

  async analyzeDQReport(reportData: any): Promise<any> {
    const response = await api.post('/dq-report/analyze', reportData);
    return response.data;
  }
};
