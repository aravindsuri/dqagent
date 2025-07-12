import { z } from 'zod';

export const responseSchema = z.object({
  question_id: z.string().min(1, 'Question ID is required'),
  response_text: z.string().min(10, 'Response must be at least 10 characters'),
  confidence_level: z.enum(['high', 'medium', 'low']),
  submitted_by: z.string().min(1, 'Submitter is required')
});

export const questionnaireSchema = z.object({
  country: z.string().min(1, 'Country is required'),
  report_file: z.string().min(1, 'Report file is required'),
  focus_areas: z.array(z.string()).optional()
});