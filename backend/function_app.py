# backend/function_app.py
import azure.functions as func
import logging
from datetime import datetime
import os
import json
from typing import Dict, Any

# Import our models
from models.question_models import (
    QuestionGenerationRequest, 
    QuestionGenerationResponse,
    ResponseSubmissionRequest,
    ValidationResult
)
from models.common_models import ApiResponse, HealthCheck, Country

# Create the Azure Functions app instance (THIS MUST BE DEFINED BEFORE ANY DECORATORS)
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Add CORS headers helper
def add_cors_headers(response: func.HttpResponse) -> func.HttpResponse:
    """Add CORS headers to response"""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# Health check endpoint
@app.route(route="health", methods=["GET"])
def health_check(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint"""
    logging.info('Health check endpoint called.')
    
    try:
        # Check if Azure OpenAI is configured
        openai_key = os.getenv("AZURE_OPENAI_API_KEY")
        openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        openai_status = "configured" if openai_key and openai_endpoint else "not_configured"

        health_data = HealthCheck(
            status="healthy",
            services={
                "api": "running",
                "openai": openai_status
            },
            timestamp=datetime.utcnow().isoformat()
        )

        response = func.HttpResponse(
            health_data.model_dump_json(),
            status_code=200,
            mimetype="application/json"
        )
        return add_cors_headers(response)

    except Exception as e:
        logging.error(f"Health check failed: {str(e)}")
        error_data = HealthCheck(
            status="error",
            services={"api": "error", "openai": "error"},
            timestamp=datetime.utcnow().isoformat()
        )
        
        response = func.HttpResponse(
            error_data.model_dump_json(),
            status_code=500,
            mimetype="application/json"
        )
        return add_cors_headers(response)

@app.route(route="welcome", methods=["GET"])
def welcome(req: func.HttpRequest) -> func.HttpResponse:
    """Welcome endpoint"""
    logging.info('Welcome endpoint called.')
    
    welcome_data = {
        "message": "Welcome to DQAgent API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "countries": "/api/countries", 
            "generate_questionnaire": "/api/questionnaire/generate"
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    response = func.HttpResponse(
        json.dumps(welcome_data),
        status_code=200,
        mimetype="application/json"
    )
    return add_cors_headers(response)

@app.route(route="countries", methods=["GET"])
def get_countries(req: func.HttpRequest) -> func.HttpResponse:
    """Get list of supported countries"""
    logging.info('Countries endpoint called.')
    
    try:
        countries = [
            Country(
                code="NL",
                name="Netherlands",
                entity_id="76",
                entity_name="Daimler Truck FS",
                active=True,
                region="Europe"
            ),
            Country(
                code="DE",
                name="Germany",
                entity_id="77",
                entity_name="Daimler Truck FS",
                active=True,
                region="Europe"
            ),
            Country(
                code="ES",
                name="Spain",
                entity_id="78",
                entity_name="Daimler Truck FS",
                active=True,
                region="Europe"
            )
        ]

        api_response = ApiResponse(
            success=True,
            data={"countries": [country.model_dump() for country in countries]},
            timestamp=datetime.utcnow().isoformat()
        )

        response = func.HttpResponse(
            api_response.model_dump_json(),
            status_code=200,
            mimetype="application/json"
        )
        return add_cors_headers(response)

    except Exception as e:
        logging.error(f"Error in countries endpoint: {str(e)}")
        error_response = ApiResponse(
            success=False,
            data={},
            message=f"Error: {str(e)}",
            timestamp=datetime.utcnow().isoformat()
        )
        
        response = func.HttpResponse(
            error_response.model_dump_json(),
            status_code=500,
            mimetype="application/json"
        )
        return add_cors_headers(response)

@app.route(route="questionnaire/generate", methods=["POST"])
def generate_questionnaire(req: func.HttpRequest) -> func.HttpResponse:
    """Generate AI-powered questionnaire from DQ report"""
    logging.info('Generate questionnaire endpoint called.')
    
    try:
        # Parse request body
        req_body = req.get_json()
        if not req_body:
            response = func.HttpResponse(
                json.dumps({"error": "Request body required"}),
                status_code=400,
                mimetype="application/json"
            )
            return add_cors_headers(response)

        request_data = QuestionGenerationRequest(**req_body)
        
        # Load DQ report data
        report_path = f"data/sample_data/{request_data.country.lower()}_may_2025.json"

        if not os.path.exists(report_path):
            response = func.HttpResponse(
                json.dumps({"error": f"DQ report file not found: {request_data.country.lower()}_may_2025.json"}),
                status_code=404,
                mimetype="application/json"
            )
            return add_cors_headers(response)

        with open(report_path, 'r') as f:
            dq_data = json.load(f)

        # For now, return a mock response
        # TODO: Implement actual question generation
        from models.question_models import Question, QuestionPriority, ResponseType

        mock_questions = [
            Question(
                id="q1_overview_delinquent",
                category="Overview",
                priority=QuestionPriority.CRITICAL,
                question_text=f"It has been observed that there is a considerable increase in delinquent amount and change in the NBV of the relevant portfolio compared to the previous month. Can you please provide additional information on this?",
                context="Significant delinquent amount increase detected in portfolio analysis",       
                expected_response_type=ResponseType.TEXT,
                validation_rules=["min_length:75", "requires_explanation"],
                related_data={"delinquent_amount": 682924.14, "contracts": 8720},
                order_sequence=1,
                generated_by_ai=True,
                confidence_score=0.95
            )
        ]

        summary = {
            "total_questions": len(mock_questions),
            "high_priority": 0,
            "critical_priority": 1,
            "categories": ["Overview"],
            "requires_immediate_attention": True
        }

        questionnaire_response = QuestionGenerationResponse(
            country=request_data.country,
            entity=dq_data.get('metadata', {}).get('delivering_entity_name', 'Unknown'),
            report_date=dq_data.get('metadata', {}).get('reporting_date', ''),
            questions=mock_questions,
            summary=summary
        )

        response = func.HttpResponse(
            questionnaire_response.model_dump_json(),
            status_code=200,
            mimetype="application/json"
        )
        return add_cors_headers(response)

    except Exception as e:
        logging.error(f"Failed to generate questionnaire: {str(e)}")
        response = func.HttpResponse(
            json.dumps({"error": f"Failed to generate questionnaire: {str(e)}"}),
            status_code=500,
            mimetype="application/json"
        )
        return add_cors_headers(response)

@app.route(route="questionnaire/{questionnaire_id}/response", methods=["POST"])
def submit_response(req: func.HttpRequest) -> func.HttpResponse:
    """Submit response to a specific question"""
    logging.info('Submit response endpoint called.')
    
    try:
        questionnaire_id = req.route_params.get('questionnaire_id')
        
        # Parse request body
        req_body = req.get_json()
        if not req_body:
            response = func.HttpResponse(
                json.dumps({"error": "Request body required"}),
                status_code=400,
                mimetype="application/json"
            )
            return add_cors_headers(response)

        request_data = ResponseSubmissionRequest(**req_body)

        # TODO: Implement actual response processing and validation
        # For now, return a mock success response
        mock_validation = ValidationResult(
            is_valid=True,
            validation_score=0.85,
            issues=[],
            suggestions=["Consider adding more specific timeline information"]
        )

        api_response = ApiResponse(
            success=True,
            data={
                "response_id": f"resp_{questionnaire_id}_{request_data.question_id}",
                "validation": mock_validation.model_dump(),
                "status": "completed"
            },
            message="Response submitted successfully",
            timestamp=datetime.utcnow().isoformat()
        )

        response = func.HttpResponse(
            api_response.model_dump_json(),
            status_code=200,
            mimetype="application/json"
        )
        return add_cors_headers(response)

    except Exception as e:
        logging.error(f"Failed to submit response: {str(e)}")
        response = func.HttpResponse(
            json.dumps({"error": f"Failed to submit response: {str(e)}"}),
            status_code=500,
            mimetype="application/json"
        )
        return add_cors_headers(response)

@app.route(route="questionnaire/{questionnaire_id}", methods=["GET"])
def get_questionnaire(req: func.HttpRequest) -> func.HttpResponse:
    """Get questionnaire details and questions"""
    logging.info('Get questionnaire endpoint called.')
    
    try:
        questionnaire_id = req.route_params.get('questionnaire_id')
        
        # TODO: Load from actual storage
        # For now, return mock data
        mock_questionnaire = {
            "id": questionnaire_id,
            "country": "Netherlands",
            "entity": "Daimler Truck FS",
            "report_date": "2025-05-31",
            "due_date": "2025-07-19",
            "status": "pending",
            "progress": {
                "total_questions": 5,
                "completed_responses": 0,
                "completion_percentage": 0
            }
        }

        api_response = ApiResponse(
            success=True,
            data=mock_questionnaire,
            timestamp=datetime.utcnow().isoformat()
        )

        response = func.HttpResponse(
            api_response.model_dump_json(),
            status_code=200,
            mimetype="application/json"
        )
        return add_cors_headers(response)

    except Exception as e:
        logging.error(f"Failed to get questionnaire: {str(e)}")
        response = func.HttpResponse(
            json.dumps({"error": f"Failed to get questionnaire: {str(e)}"}),
            status_code=500,
            mimetype="application/json"
        )
        return add_cors_headers(response)