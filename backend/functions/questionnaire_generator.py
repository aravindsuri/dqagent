# backend/functions/questionnaire_generator.py
import json
import logging
from typing import Dict, Any, List
from datetime import datetime
from models.question_models import Question, QuestionPriority, ResponseType, QuestionGenerationResponse
from services.openai_service import OpenAIService

async def generate_questionnaire(dq_data: Dict[str, Any], country: str, openai_service: OpenAIService) -> QuestionGenerationResponse:
    """Generate complete questionnaire from DQ report data"""
    
    questions = []
    
    # Generate questions for each category
    questions.extend(await generate_overview_questions(dq_data, openai_service))
    questions.extend(await generate_additional_info_questions(dq_data, openai_service))
    questions.extend(await generate_writeoff_questions(dq_data, openai_service))
    questions.extend(await generate_error_warning_questions(dq_data, openai_service))
    
    # Sort by priority
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    questions.sort(key=lambda x: (priority_order.get(x.priority, 3), x.order_sequence))
    
    # Update order sequence
    for i, question in enumerate(questions):
        question.order_sequence = i + 1
    
    # Generate summary
    summary = {
        "total_questions": len(questions),
        "high_priority": len([q for q in questions if q.priority == "high"]),
        "critical_priority": len([q for q in questions if q.priority == "critical"]),
        "categories": list(set(q.category for q in questions)),
        "requires_immediate_attention": any(q.priority in ["critical", "high"] for q in questions)
    }
    
    return QuestionGenerationResponse(
        country=country,
        entity=dq_data.get('metadata', {}).get('delivering_entity_name', 'Unknown'),
        report_date=dq_data.get('metadata', {}).get('reporting_date', ''),
        questions=questions,
        summary=summary
    )

async def generate_overview_questions(dq_data: Dict[str, Any], openai_service: OpenAIService) -> List[Question]:
    """Generate questions based on overview/portfolio analysis"""
    questions = []
    overview = dq_data.get('overview', {})
    portfolios = overview.get('portfolios', [])
    
    # Find delinquent amount issues
    relevant_portfolio = None
    error_portfolio = None
    
    for portfolio in portfolios:
        if portfolio.get('criteria') == 'Relevant Portfolio':
            relevant_portfolio = portfolio
        elif 'Error' in portfolio.get('criteria', ''):
            error_portfolio = portfolio
    
    # Generate delinquent amount question (like Netherlands example)
    if relevant_portfolio and relevant_portfolio.get('delinquent_amount', 0) > 500000:
        delinquent_amount = relevant_portfolio['delinquent_amount']
        
        questions.append(Question(
            id=f"overview_delinquent_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            category="Overview",
            priority=QuestionPriority.CRITICAL,
            question_text=f"It has been observed that there is a considerable increase in delinquent amount (€{delinquent_amount:,.2f}) and change in the NBV of the relevant portfolio compared to the previous month. Can you please provide additional information on this?",
            context="Significant delinquent amount increase detected in portfolio analysis",
            expected_response_type=ResponseType.TEXT,
            validation_rules=["min_length:75", "requires_explanation", "requires_timeline"],
            related_data={
                "delinquent_amount": delinquent_amount,
                "portfolio_data": relevant_portfolio,
                "threshold_exceeded": True
            },
            order_sequence=1,
            generated_by_ai=True,
            confidence_score=0.95
        ))
    
    # Generate error portfolio question
    if error_portfolio and error_portfolio.get('no_of_contracts', 0) > 0:
        questions.append(Question(
            id=f"overview_errors_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            category="Overview",
            priority=QuestionPriority.HIGH,
            question_text=f"There are {error_portfolio['no_of_contracts']} contracts in the Error portfolio with negative amounts detected. Please explain the nature of these errors and your remediation plan.",
            context="Error contracts with negative amounts detected in portfolio overview",
            expected_response_type=ResponseType.TEXT,
            validation_rules=["min_length:50", "requires_action_plan"],
            related_data={
                "error_contracts": error_portfolio['no_of_contracts'],
                "error_amount": error_portfolio.get('net_book_value', 0),
                "portfolio_data": error_portfolio
            },
            order_sequence=2,
            generated_by_ai=True,
            confidence_score=0.90
        ))
    
    return questions

async def generate_additional_info_questions(dq_data: Dict[str, Any], openai_service: OpenAIService) -> List[Question]:
    """Generate questions based on Additional Information changes"""
    questions = []
    additional_info = dq_data.get('additional_info', {})
    changes = additional_info.get('changes', {})
    
    # Identify significant changes (matching Netherlands pattern)
    significant_changes = {}
    high_impact_changes = []
    
    for change_type, count in changes.items():
        if count > 10:  # Threshold for significance
            significant_changes[change_type] = count
            if count > 50:  # High impact threshold
                high_impact_changes.append(f"{change_type}: {count}")
    
    if significant_changes:
        # Create question similar to Netherlands example
        change_summary = []
        for change_type, count in list(significant_changes.items())[:5]:  # Top 5 changes
            change_summary.append(f"{change_type}: {count}")
        
        questions.append(Question(
            id=f"additional_changes_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            category="Additional Information",
            priority=QuestionPriority.HIGH if high_impact_changes else QuestionPriority.MEDIUM,
            question_text=f"You'll find the list of contracts in the \"Additional Information\" sheet of the DQ report. Can you please provide clarifications on the changes highlighted: {'; '.join(change_summary)}",
            context="Significant data changes detected in multiple categories",
            expected_response_type=ResponseType.STRUCTURED,
            validation_rules=["requires_explanations_per_category", "min_length:100"],
            related_data={
                "significant_changes": significant_changes,
                "total_changes": sum(significant_changes.values()),
                "high_impact_changes": high_impact_changes,
                "change_categories": list(significant_changes.keys())
            },
            follow_up_questions=[
                "What business processes or system changes caused these modifications?",
                "Are these changes permanent or temporary adjustments?",
                "What controls are in place to validate these changes?"
            ],
            order_sequence=3,
            generated_by_ai=True,
            confidence_score=0.85
        ))
    
    return questions

async def generate_writeoff_questions(dq_data: Dict[str, Any], openai_service: OpenAIService) -> List[Question]:
    """Generate writeoff-related questions"""
    questions = []
    writeoffs = dq_data.get('writeoffs', {})
    writeoff_data = writeoffs.get('writeoffs', [])
    flags = writeoffs.get('flags', {})
    
    # Check for writeoff changes
    if flags.get('has_new_writeoffs') or any(w.get('net_loss_amount', 0) > 0 for w in writeoff_data):
        # Find the main writeoff data
        for writeoff in writeoff_data:
            if writeoff.get('criteria') in ['Converted Portfolio', 'Relevant Portfolio']:
                net_loss = writeoff.get('net_loss_amount', 0)
                
                questions.append(Question(
                    id=f"writeoffs_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    category="Writeoffs",
                    priority=QuestionPriority.MEDIUM,
                    question_text=f"Can you please check and provide additional information on the net loss amount (€{net_loss:,.2f}) and confirm the writeoff analysis? You'll find it in the 'Writeoff' sheet of the DQ report.",
                    context="Writeoff amounts require verification and explanation",
                    expected_response_type=ResponseType.TEXT,
                    validation_rules=["min_length:50", "requires_confirmation"],
                    related_data={
                        "net_loss_amount": net_loss,
                        "writeoff_criteria": writeoff.get('criteria'),
                        "new_writeoffs_present": flags.get('has_new_writeoffs', False),
                        "writeoff_data": writeoff
                    },
                    order_sequence=4,
                    generated_by_ai=True,
                    confidence_score=0.80
                ))
                break
    
    return questions

async def generate_error_warning_questions(dq_data: Dict[str, Any], openai_service: OpenAIService) -> List[Question]:
    """Generate questions for errors and warnings"""
    questions = []
    warnings = dq_data.get('warnings', {})
    warning_data = warnings.get('warnings', [])
    errors = dq_data.get('errors', {})
    
    # Check for rule confirmation warnings
    rule_warnings = [w for w in warning_data if 'confirm' in w.get('description', '').lower()]
    
    if rule_warnings:
        total_contracts = sum(w.get('contracts', 0) for w in rule_warnings)
        
        questions.append(Question(
            id=f"warnings_rules_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            category="Warnings",
            priority=QuestionPriority.MEDIUM,
            question_text=f"Can you please provide additional information for the warnings: {total_contracts} contracts with rule confirmation issues. What specific business rules are failing and what is your remediation plan?",
            context="Rule confirmation warnings detected requiring business explanation",
            expected_response_type=ResponseType.STRUCTURED,
            validation_rules=["requires_detailed_breakdown", "requires_remediation_plan"],
            related_data={
                "warning_contracts": total_contracts,
                "rule_warnings": rule_warnings,
                "warning_types": [w.get('description') for w in rule_warnings]
            },
            order_sequence=5,
            generated_by_ai=True,
            confidence_score=0.75
        ))
    
    return questions

# backend/functions/response_processor.py
import json
import logging
from typing import Dict, Any
from datetime import datetime
from models.response_models import ResponseSubmissionRequest, ValidationResult
from services.openai_service import OpenAIService

async def process_response(
    questionnaire_id: str,
    request: ResponseSubmissionRequest,
    validation: ValidationResult
) -> Dict[str, Any]:
    """Process and store response"""
    
    response_id = f"resp_{questionnaire_id}_{request.question_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Create response record
    response_record = {
        "id": response_id,
        "questionnaire_id": questionnaire_id,
        "question_id": request.question_id,
        "response_text": request.response_text,
        "response_data": request.response_data,
        "confidence_level": request.confidence_level,
        "uploaded_files": request.uploaded_files or [],
        "submitted_by": request.submitted_by,
        "submitted_at": datetime.utcnow().isoformat(),
        "ai_validated": validation.is_valid,
        "ai_validation_score": validation.validation_score,
        "ai_suggestions": validation.suggestions,
        "status": "completed" if validation.is_valid else "partial"
    }
    
    # Here you would save to database/storage
    # For now, just log it
    logging.info(f"Response processed: {response_id}")
    
    return {
        "response_id": response_id,
        "status": response_record["status"],
        "validation_score": validation.validation_score
    }

async def validate_response(
    request: ResponseSubmissionRequest,
    openai_service: OpenAIService
) -> ValidationResult:
    """Validate response using AI"""
    
    if not request.response_text:
        return ValidationResult(
            is_valid=False,
            validation_score=0.0,
            issues=["Response text is required"],
            suggestions=["Please provide a detailed response"]
        )
    
    try:
        # Use OpenAI to validate response quality
        validation_result = await openai_service.validate_response(
            question=f"Question ID: {request.question_id}",
            response=request.response_text,
            context="DQ questionnaire response validation"
        )
        
        return ValidationResult(**validation_result)
        
    except Exception as e:
        logging.error(f"AI validation failed: {str(e)}")
        # Fallback validation
        return ValidationResult(
            is_valid=len(request.response_text) >= 50,
            validation_score=0.6,
            issues=["AI validation temporarily unavailable"],
            suggestions=["Please ensure response is complete and detailed"]
        )

# backend/functions/dq_analyzer.py
from typing import Dict, Any
from services.openai_service import OpenAIService

async def analyze_dq_report(report_data: Dict[str, Any], openai_service: OpenAIService) -> Dict[str, Any]:
    """Analyze DQ report and provide AI insights"""
    
    # Calculate risk indicators
    risk_score = calculate_risk_score(report_data)
    key_insights = extract_key_insights(report_data)
    patterns = identify_patterns(report_data)
    
    analysis = {
        "risk_score": risk_score,
        "risk_level": get_risk_level(risk_score),
        "key_insights": key_insights,
        "patterns_identified": patterns,
        "requires_attention": risk_score > 7.0,
        "summary": generate_summary(report_data),
        "recommendations": generate_recommendations(report_data),
        "confidence": 0.89
    }
    
    return analysis

def calculate_risk_score(report_data: Dict[str, Any]) -> float:
    """Calculate overall risk score from DQ data"""
    
    score_components = []
    
    # Portfolio risk
    overview = report_data.get('overview', {})
    portfolios = overview.get('portfolios', [])
    
    total_contracts = 0
    error_contracts = 0
    total_delinquent = 0
    
    for portfolio in portfolios:
        if 'Error' in portfolio.get('criteria', ''):
            error_contracts += portfolio.get('no_of_contracts', 0)
        total_contracts += portfolio.get('no_of_contracts', 0)
        total_delinquent += portfolio.get('delinquent_amount', 0)
    
    if total_contracts > 0:
        error_rate = (error_contracts / total_contracts) * 100
        score_components.append(min(error_rate * 2, 10))
    
    # Delinquency risk
    if total_delinquent > 500000:
        delinquency_score = min((total_delinquent / 1000000) * 5, 10)
        score_components.append(delinquency_score)
    
    # Change volume risk
    additional_info = report_data.get('additional_info', {})
    total_changes = additional_info.get('summary', {}).get('total_changes', 0)
    if total_changes > 200:
        change_score = min(total_changes / 100, 10)
        score_components.append(change_score)
    
    return sum(score_components) / len(score_components) if score_components else 0

def get_risk_level(score: float) -> str:
    """Convert risk score to risk level"""
    if score >= 8:
        return "high"
    elif score >= 5:
        return "medium"
    else:
        return "low"

def extract_key_insights(report_data: Dict[str, Any]) -> list:
    """Extract key insights from DQ report"""
    insights = []
    
    # Check delinquent amounts
    overview = report_data.get('overview', {})
    for portfolio in overview.get('portfolios', []):
        if portfolio.get('delinquent_amount', 0) > 500000:
            insights.append(f"High delinquency detected: €{portfolio['delinquent_amount']:,.2f} in {portfolio.get('criteria', 'Unknown')} portfolio")
    
    # Check error rates
    errors = report_data.get('errors', {})
    if errors.get('summary', {}).get('total_error_contracts', 0) > 0:
        insights.append(f"Data quality issues: {errors['summary']['total_error_contracts']} contracts with errors")
    
    # Check change volume
    additional_info = report_data.get('additional_info', {})
    high_impact_changes = additional_info.get('categories', {}).get('high_impact', {})
    if high_impact_changes:
        top_change = max(high_impact_changes.items(), key=lambda x: x[1])
        insights.append(f"High change volume: {top_change[1]} changes in {top_change[0]}")
    
    return insights

def identify_patterns(report_data: Dict[str, Any]) -> list:
    """Identify patterns in the data"""
    patterns = []
    
    # Pattern: Contract terminations
    additional_info = report_data.get('additional_info', {})
    changes = additional_info.get('changes', {})
    
    contract_end_changes = changes.get('Changes in Contract End Date', 0)
    if contract_end_changes > 100:
        patterns.append("High volume of contract end date changes suggests termination pattern")
    
    # Pattern: Rating changes
    rating_changes = changes.get('Changes in Rating', 0)
    if rating_changes > 100:
        patterns.append("Significant rating updates indicate credit risk reassessment")
    
    return patterns

def generate_summary(report_data: Dict[str, Any]) -> str:
    """Generate executive summary"""
    
    overview = report_data.get('overview', {})
    summary_data = overview.get('summary', {})
    
    total_contracts = summary_data.get('total_contracts', 0)
    delinquent_amount = summary_data.get('total_delinquent_amount', 0)
    
    return f"Report covers {total_contracts:,} contracts with €{delinquent_amount:,.2f} in delinquent amounts. Multiple high-impact changes detected requiring management attention."

def generate_recommendations(report_data: Dict[str, Any]) -> list:
    """Generate actionable recommendations"""
    recommendations = []
    
    # Based on risk score and patterns
    risk_score = calculate_risk_score(report_data)
    
    if risk_score > 7:
        recommendations.append("Immediate escalation to senior management required")
        recommendations.append("Implement enhanced monitoring for delinquent accounts")
    
    additional_info = report_data.get('additional_info', {})
    if additional_info.get('summary', {}).get('total_changes', 0) > 200:
        recommendations.append("Review change management processes and controls")
        recommendations.append("Validate data integrity after high change volume")
    
    errors = report_data.get('errors', {})
    if errors.get('summary', {}).get('negative_amount_issues', 0) > 0:
        recommendations.append("Investigate and correct negative amount calculations")
    
    return recommendations