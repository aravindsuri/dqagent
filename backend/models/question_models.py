from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from enum import Enum

class QuestionPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ResponseType(str, Enum):
    TEXT = "text"
    FILE_UPLOAD = "file_upload"
    STRUCTURED = "structured"
    MULTIPLE_CHOICE = "multiple_choice"

class ResponseStatus(str, Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    COMPLETED = "completed"
    APPROVED = "approved"

class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Question(BaseModel):
    id: str
    category: str
    priority: QuestionPriority
    question_text: str
    context: str
    expected_response_type: ResponseType
    validation_rules: List[str]
    related_data: Dict[str, Any]
    follow_up_questions: Optional[List[str]] = None
    order_sequence: int
    generated_by_ai: bool = True
    confidence_score: Optional[float] = None

class QuestionResponse(BaseModel):
    id: Optional[str] = None
    question_id: str
    response_text: Optional[str] = None
    response_data: Optional[Dict[str, Any]] = None
    confidence_level: ConfidenceLevel
    uploaded_files: Optional[List[str]] = None
    submitted_at: Optional[str] = None
    submitted_by: str
    status: ResponseStatus
    ai_validated: Optional[bool] = None
    ai_validation_score: Optional[float] = None
    ai_suggestions: Optional[List[str]] = None

class QuestionnaireProgress(BaseModel):
    total_questions: int
    completed_responses: int
    completion_percentage: float

class Questionnaire(BaseModel):
    id: str
    country: str
    entity: str
    report_file: str
    generated_at: str
    due_date: str
    status: ResponseStatus
    questions: List[Question]
    responses: List[QuestionResponse]
    progress: QuestionnaireProgress

class QuestionGenerationRequest(BaseModel):
    country: str
    report_file: str
    focus_areas: Optional[List[str]] = None

class QuestionGenerationSummary(BaseModel):
    total_questions: int
    high_priority: int
    critical_priority: int
    categories: List[str]
    requires_immediate_attention: bool

class QuestionGenerationResponse(BaseModel):
    country: str
    entity: str
    report_date: str
    questions: List[Question]
    summary: QuestionGenerationSummary

class ResponseSubmissionRequest(BaseModel):
    question_id: str
    response_text: Optional[str] = None
    response_data: Optional[Dict[str, Any]] = None
    confidence_level: ConfidenceLevel
    uploaded_files: Optional[List[str]] = None
    submitted_by: str

class ValidationResult(BaseModel):
    is_valid: bool
    validation_score: float
    issues: List[str]
    suggestions: List[str]