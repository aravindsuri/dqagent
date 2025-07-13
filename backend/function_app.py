# backend/function_app.py
import azure.functions as func
import logging
from datetime import datetime
import os
import json
from typing import Dict, Any, List
import asyncio
import aiohttp
from openai import AzureOpenAI

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Import our models
from models.question_models import (
    QuestionGenerationRequest, 
    QuestionGenerationResponse,
    ResponseSubmissionRequest,
    ValidationResult,
    Question,
    QuestionPriority,
    ResponseType
)
from models.common_models import ApiResponse, HealthCheck, Country

# Create the Azure Functions app instance (THIS MUST BE DEFINED BEFORE ANY DECORATORS)
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Initialize Azure OpenAI client
def get_openai_client():
    """Initialize Azure OpenAI client"""
    try:
        client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version="2024-02-01",
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
        )
        return client
    except Exception as e:
        logging.error(f"Failed to initialize OpenAI client: {str(e)}")
        return None

# Supabase API helper
async def supabase_request(table: str, filters: Dict[str, str] = None, select: str = "*"):
    """Make async request to Supabase REST API"""
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            raise Exception("Supabase URL or API key not configured")
        
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        
        url = f"{supabase_url}/rest/v1/{table}"
        params = {"select": select}
        
        # Add filters
        if filters:
            for key, value in filters.items():
                params[key] = value
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    raise Exception(f"Supabase API error {response.status}: {error_text}")
                    
    except Exception as e:
        logging.error(f"Supabase API request failed: {str(e)}")
        raise

async def fetch_country_metrics(country: str, month: str) -> List[Dict[str, Any]]:
    """Fetch country metrics from Supabase REST API"""
    try:
        logging.info(f"Fetching metrics for {country}, {month}")
        
        # Convert month to the format expected by Supabase (YYYY-MM-DD)
        if isinstance(month, str):
            if len(month) == 7:  # Format: "2025-05"
                month = f"{month}-01"
        
        # Use Supabase REST API filters
        filters = {
            "country_code": f"eq.{country}",
            "reporting_month": f"eq.{month}"
        }
        
        # Select all columns we need
        select_columns = "country_code,reporting_month,group_type,group_name,currency,num_contracts,irr_nominal,nbv_local_cms,gross_exposure,net_book_value,delinquent_amount,downpayment_amount"
        
        metrics = await supabase_request("country_group_metrics", filters, select_columns)
        
        logging.info(f"Retrieved {len(metrics)} metrics records")
        return metrics
        
    except Exception as e:
        logging.error(f"Error fetching country metrics: {str(e)}")
        raise

def generate_ai_questions(country: str, month: str, metrics: List[Dict[str, Any]]) -> List[Question]:
    """Generate AI-powered questions based on country metrics"""
    try:
        client = get_openai_client()
        if not client:
            raise Exception("OpenAI client not available")
        
        # Calculate summary statistics for better context
        total_contracts = sum(m.get('num_contracts', 0) or 0 for m in metrics)
        total_nbv = sum(m.get('net_book_value', 0) or 0 for m in metrics)
        total_delinquent = sum(m.get('delinquent_amount', 0) or 0 for m in metrics)
        
        summary_stats = {
            "total_contracts": total_contracts,
            "total_net_book_value": total_nbv,
            "total_delinquent_amount": total_delinquent,
            "delinquency_rate": (total_delinquent / total_nbv * 100) if total_nbv > 0 else 0
        }
        
        prompt = f"""
You are a Data Quality Assistant for financial portfolio management. Analyze the following financial metrics for {country} for the month {month} and generate 3-5 specific, insightful questions for the country manager.

SUMMARY STATISTICS:
{json.dumps(summary_stats, indent=2)}

DETAILED METRICS BY GROUP:
{json.dumps(metrics, indent=2)}

Focus on:
1. Unusual trends or anomalies in contract numbers, NBV, or delinquency rates
2. Significant variations between different portfolio groups or products
3. Risk indicators that require management attention
4. Data quality issues or missing information

Generate questions that are:
- Specific and actionable
- Based on actual data observations
- Prioritized by business impact
- Clear and professional

Return a JSON array of objects with this exact structure:
[
  {{
    "id": "q1_category_topic",
    "category": "Portfolio Performance|Risk Management|Data Quality|Operational",
    "question_text": "Your specific question here...",
    "priority": "low|high|critical",
    "expected_response_type": "text",
    "context": "Brief explanation of why this question is important",
    "related_data": {{"key": "value pairs of relevant metrics"}}
  }}
]
"""
        
        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=2000
        )
        
        # Parse the AI response
        ai_response = response.choices[0].message.content
        
        # Extract JSON from the response (in case there's additional text)
        try:
            # Try to find JSON array in the response
            start_idx = ai_response.find('[')
            end_idx = ai_response.rfind(']') + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = ai_response[start_idx:end_idx]
                questions_data = json.loads(json_str)
            else:
                questions_data = json.loads(ai_response)
        except json.JSONDecodeError:
            logging.error(f"Failed to parse AI response as JSON: {ai_response}")
            raise Exception("Invalid JSON response from AI")
        
        # Convert to Question objects
        questions = []
        for i, q_data in enumerate(questions_data):
            question = Question(
                id=q_data.get('id', f'q{i+1}'),
                category=q_data.get('category', 'General'),
                priority=QuestionPriority(q_data.get('priority', 'high')),
                question_text=q_data.get('question_text', ''),
                context=q_data.get('context', ''),
                expected_response_type=ResponseType(q_data.get('expected_response_type', 'text')),
                validation_rules=[],
                related_data=q_data.get('related_data', {}),
                order_sequence=i + 1,
                generated_by_ai=True,
                confidence_score=0.85
            )
            questions.append(question)
        
        return questions
        
    except Exception as e:
        logging.error(f"Failed to generate AI questions: {str(e)}")
        raise

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
        
        # Check database connection
        db_status = "not_configured"
        try:
            # Quick check for Supabase API configuration
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_ANON_KEY")
            db_status = "configured" if supabase_url and supabase_key else "not_configured"
        except:
            db_status = "error"

        health_data = HealthCheck(
            status="healthy",
            services={
                "api": "running",
                "openai": openai_status,
                "database": db_status
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
            services={"api": "error", "openai": "error", "database": "error"},
            timestamp=datetime.utcnow().isoformat()
        )
        
        response = func.HttpResponse(
            error_data.model_dump_json(),
            status_code=500,
            mimetype="application/json"
        )
        return add_cors_headers(response)

@app.route(route="test-supabase-api", methods=["GET"])
def test_supabase_api(req: func.HttpRequest) -> func.HttpResponse:
    """Test Supabase REST API connection"""
    logging.info('Test Supabase API endpoint called.')
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def test_api():
            # Simple test query to get one record
            result = await supabase_request("country_group_metrics", {"limit": "1"})
            return result
        
        result = loop.run_until_complete(test_api())
        loop.close()
        
        response = func.HttpResponse(
            json.dumps({
                "success": True, 
                "message": "Supabase API connection successful",
                "sample_data": result[:1] if result else "No data found"
            }),
            status_code=200,
            mimetype="application/json"
        )
        return add_cors_headers(response)
        
    except Exception as e:
        logging.error(f"Supabase API test failed: {str(e)}")
        response = func.HttpResponse(
            json.dumps({"success": False, "error": str(e)}),
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
            "generate_questionnaire": "/api/questionnaire/generate",
            "country_metrics": "/api/country-metrics/{country}/{month}"
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

@app.route(route="country-metrics/{country}/{month}", methods=["GET"])
def get_country_metrics(req: func.HttpRequest) -> func.HttpResponse:
    """Get country metrics for a specific country and month"""
    logging.info('Country metrics endpoint called.')
    
    try:
        country = req.route_params.get('country')
        month = req.route_params.get('month')
        
        if not country or not month:
            response = func.HttpResponse(
                json.dumps({"error": "Country and month parameters required"}),
                status_code=400,
                mimetype="application/json"
            )
            return add_cors_headers(response)
        
        # Fetch metrics from database
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            metrics = loop.run_until_complete(fetch_country_metrics(country, month))
        finally:
            loop.close()
        
        if not metrics:
            response = func.HttpResponse(
                json.dumps({"error": f"No metrics found for {country} in {month}"}),
                status_code=404,
                mimetype="application/json"
            )
            return add_cors_headers(response)
        
        api_response = ApiResponse(
            success=True,
            data={
                "country": country,
                "month": month,
                "metrics": metrics,
                "total_records": len(metrics)
            },
            timestamp=datetime.utcnow().isoformat()
        )

        response = func.HttpResponse(
            api_response.model_dump_json(),
            status_code=200,
            mimetype="application/json"
        )
        return add_cors_headers(response)

    except Exception as e:
        logging.error(f"Error in country metrics endpoint: {str(e)}")
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
    """Generate AI-powered questionnaire from country metrics"""
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

        # Extract country and month from request
        country = req_body.get('country')
        month = req_body.get('month')
        
        if not country or not month:
            response = func.HttpResponse(
                json.dumps({"error": "Country and month are required"}),
                status_code=400,
                mimetype="application/json"
            )
            return add_cors_headers(response)
        
        # Fetch metrics from database
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            metrics = loop.run_until_complete(fetch_country_metrics(country, month))
        finally:
            loop.close()
        
        if not metrics:
            response = func.HttpResponse(
                json.dumps({"error": f"No metrics found for {country} in {month}"}),
                status_code=404,
                mimetype="application/json"
            )
            return add_cors_headers(response)
        
        # Generate AI questions
        questions = generate_ai_questions(country, month, metrics)
        
        # Create summary
        summary = {
            "total_questions": len(questions),
            "high_priority": len([q for q in questions if q.priority == QuestionPriority.HIGH]),
            "critical_priority": len([q for q in questions if q.priority == QuestionPriority.CRITICAL]),
            "categories": list(set([q.category for q in questions])),
            "requires_immediate_attention": any(q.priority == QuestionPriority.CRITICAL for q in questions),
            "data_points_analyzed": len(metrics)
        }
        
        questionnaire_response = QuestionGenerationResponse(
            country=country,
            entity="Daimler Truck FS",  # You might want to make this dynamic
            report_date=month,
            questions=questions,
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