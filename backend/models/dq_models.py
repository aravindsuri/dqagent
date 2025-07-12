from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from enum import Enum

class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class DQReportMetadata(BaseModel):
    reporting_date: str
    delivering_entity_code: str
    delivering_entity_name: str
    country: str
    generated_at: str

class PortfolioData(BaseModel):
    type: str
    criteria: str
    currency: str
    no_of_contracts: int
    weighted_irr_nominal: float
    nbv_local_cms: float
    gross_exposure: float
    net_book_value: float
    delinquent_amount: float
    downpayment: float

class OverviewSummary(BaseModel):
    total_contracts: int
    total_delinquent_amount: float
    delinquency_rate: float

class IssueIdentified(BaseModel):
    type: str
    severity: Severity
    description: str
    impact: str

class OverviewData(BaseModel):
    portfolios: List[PortfolioData]
    summary: OverviewSummary
    issues_identified: List[IssueIdentified]

class WriteoffData(BaseModel):
    type: str
    criteria: str
    currency: str
    number_of_contracts: int
    net_loss_amount: float
    remarketing_net_proceed: float
    writeoff_recovery_amount: float
    net_rv_loss_amount: float

class WriteoffSummary(BaseModel):
    total_net_loss: float
    new_writeoffs_count: int

class WriteoffFlags(BaseModel):
    has_new_writeoffs: bool
    significant_loss: bool

class WriteoffSection(BaseModel):
    writeoffs: List[WriteoffData]
    summary: WriteoffSummary
    flags: WriteoffFlags

class ErrorData(BaseModel):
    description: str
    currency: str
    contract_count: int
    net_book_value: float

class ErrorSummary(BaseModel):
    total_error_contracts: int
    negative_amount_issues: int

class ErrorSection(BaseModel):
    errors: List[ErrorData]
    error_details: List[Any]
    summary: ErrorSummary

class WarningData(BaseModel):
    description: str
    currency: str
    contracts: int
    netbook_value_local: float

class WarningSummary(BaseModel):
    total_warning_contracts: int
    rule_confirmation_issues: int

class WarningSection(BaseModel):
    warnings: List[WarningData]
    warning_details: List[Any]
    summary: WarningSummary

class AdditionalInfoSummary(BaseModel):
    total_changes: int
    high_impact_changes_count: int
    contract_related_changes: int

class AdditionalInfoCategories(BaseModel):
    high_impact: Dict[str, int]
    contract_related: Dict[str, int]

class AdditionalInfoSection(BaseModel):
    changes: Dict[str, int]
    summary: AdditionalInfoSummary
    categories: Optional[AdditionalInfoCategories] = None

class ThresholdBreach(BaseModel):
    metric: str
    value: float
    threshold: float

class RiskAnalysis(BaseModel):
    risk_score: float
    priority_areas: List[str]
    trends: Dict[str, Any]
    thresholds_breached: List[ThresholdBreach]

class DQReport(BaseModel):
    metadata: DQReportMetadata
    overview: OverviewData
    writeoffs: WriteoffSection
    errors: ErrorSection
    warnings: WarningSection
    additional_info: AdditionalInfoSection
    risk_analysis: RiskAnalysis
    country: str
    generated_at: str