# backend/function_app.py
import azure.functions as func
import logging
from datetime import datetime, timedelta
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

def generate_ai_summary(country: str, month: str, group_type: str, metric: str, data: List[Dict[str, Any]]) -> str:
    """Generate AI-powered summary analysis based on filtered data"""
    try:
        client = get_openai_client()
        if not client:
            raise Exception("OpenAI client not available")
        
        # Calculate key statistics from the filtered data
        total_records = len(data)
        total_contracts = sum(item.get('num_contracts', 0) or 0 for item in data)
        total_nbv = sum(item.get('net_book_value', 0) or 0 for item in data)
        total_delinquent = sum(item.get('delinquent_amount', 0) or 0 for item in data)
        
        # Calculate IRR statistics if available
        irr_values = [item.get('irr_nominal', 0) for item in data if item.get('irr_nominal') is not None]
        avg_irr = sum(irr_values) / len(irr_values) if irr_values else 0
        min_irr = min(irr_values) if irr_values else 0
        max_irr = max(irr_values) if irr_values else 0
        
        # Get group names for context
        group_names = [item.get('group_name', 'Unknown') for item in data]
        
        # Build context for the AI
        context_stats = {
            "analysis_scope": {
                "country": country,
                "month": month,
                "group_type": group_type,
                "metric_focus": metric,
                "total_records": total_records
            },
            "portfolio_overview": {
                "total_contracts": total_contracts,
                "total_net_book_value": total_nbv,
                "total_delinquent_amount": total_delinquent,
                "delinquency_rate_pct": (total_delinquent / total_nbv * 100) if total_nbv > 0 else 0
            },
            "irr_analysis": {
                "average_irr": avg_irr,
                "min_irr": min_irr,
                "max_irr": max_irr,
                "irr_range": max_irr - min_irr if irr_values else 0
            },
            "segments_analyzed": group_names
        }
        
        # Create metric-specific analysis prompt
        metric_guidance = {
            "IRR (%)": "Focus on profitability analysis, spread between segments, and risk-adjusted returns. Identify highest and lowest performing segments.",
            "NBV (€)": "Analyze portfolio concentration, exposure distribution, and capital allocation across segments. Highlight concentration risks.",
            "Delinquency (%)": "Examine credit risk patterns, problem segments, and portfolio quality indicators. Flag any concerning trends.",
            "Contracts (#)": "Review volume distribution, operational efficiency, and business scale across segments. Identify growth patterns."
        }

        prompt = f"""
            You are a Senior Financial Analyst providing executive-level insights on portfolio performance data. 

            ANALYSIS REQUEST:
            - Country: {country}
            - Period: {month}
            - Focus Area: {group_type} segments
            - Key Metric: {metric}
            - Data Points: {total_records} segments

            PORTFOLIO SUMMARY:
            {json.dumps(context_stats, indent=2)}

            DETAILED SEGMENT DATA:
            {json.dumps(data, indent=2)}

            ANALYSIS GUIDANCE:
            {metric_guidance.get(metric, "Provide comprehensive analysis of the selected metric across all segments.")}

            Please provide a comprehensive executive summary with the following structure and formatting:

            **1. Key Findings**
            • [Finding 1 with specific data points]
            • [Finding 2 with specific data points]  
            • [Finding 3 with specific data points]

            **2. Performance Analysis**
            • **Segment Performance:**
            - [Analysis of top performers with specific IRR/values]
            - [Analysis of middle performers]
            - [Analysis of underperformers]
            • **Portfolio Concentration:**
            - [Analysis of largest segments and their impact]
            - [Risk-return trade-offs]

            **3. Risk Assessment**
            • **Primary Risks:**
            - [Risk 1 with quantification]
            - [Risk 2 with quantification]
            • **Portfolio Balance:**
            - [Assessment of diversification and concentration]

            **4. Strategic Recommendations**
            • [Recommendation 1 with specific action items]
            • [Recommendation 2 with specific action items]
            • [Recommendation 3 with specific action items]
            • [Recommendation 4 with specific action items]

            FORMATTING REQUIREMENTS:
            - Use **bold** for section headers (1., 2., 3., 4.)
            - Use **bold** for subsection headers (Segment Performance:, Primary Risks:, etc.)
            - Use bullet points (•) for main points
            - Use sub-bullets with dashes (-) for detailed breakdowns
            - Include specific numbers, percentages, and monetary values
            - Keep each bullet point concise but informative
            - Total length: 400-500 words
            - Professional, executive-level tone
            """
        
        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logging.error(f"Failed to generate AI summary: {str(e)}")
        raise

def generate_chat_response(question: str, country: str, month: str, context: str, metrics_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate AI-powered chat response with structured formatting"""
    try:
        client = get_openai_client()
        if not client:
            raise Exception("OpenAI client not available")
        
        # Calculate key statistics from the metrics data
        total_records = len(metrics_data)
        total_contracts = sum(item.get('num_contracts', 0) or 0 for item in metrics_data)
        total_nbv = sum(item.get('net_book_value', 0) or 0 for item in metrics_data)
        total_delinquent = sum(item.get('delinquent_amount', 0) or 0 for item in metrics_data)
        
        # Calculate IRR statistics
        irr_values = [item.get('irr_nominal', 0) for item in metrics_data if item.get('irr_nominal') is not None]
        avg_irr = sum(irr_values) / len(irr_values) if irr_values else 0
        
        # Get group types and names
        group_types = list(set(item.get('group_type', 'Unknown') for item in metrics_data))
        
        # Find specific segments mentioned in data for detailed analysis
        segment_details = {}
        for item in metrics_data:
            group_name = item.get('group_name', 'Unknown')
            if group_name not in segment_details:
                segment_details[group_name] = {
                    'contracts': item.get('num_contracts', 0),
                    'irr': item.get('irr_nominal', 0) * 100 if item.get('irr_nominal') else 0,
                    'nbv': item.get('net_book_value', 0),
                    'delinquent': item.get('delinquent_amount', 0),
                    'group_type': item.get('group_type', 'Unknown')
                }
        
        # Build comprehensive context for the AI
        data_context = f"""
        PORTFOLIO OVERVIEW FOR {country.upper()} - {month}:
        • Total Portfolio: {total_contracts:,} contracts, €{total_nbv/1000000:.1f}M NBV
        • Average IRR: {avg_irr*100:.2f}%
        • Total Delinquent: €{total_delinquent/1000:.0f}K
        • Delinquency Rate: {(total_delinquent/total_nbv*100) if total_nbv > 0 else 0:.2f}%
        • Available Group Types: {', '.join(group_types)}
        • Total Data Points: {total_records} segments

        DETAILED SEGMENT BREAKDOWN:
        """
        
        # Add top segments by volume for context
        sorted_segments = sorted(segment_details.items(), key=lambda x: x[1]['contracts'], reverse=True)
        for name, details in sorted_segments[:10]:  # Top 10 segments
            delinq_rate = (details['delinquent'] / details['nbv'] * 100) if details['nbv'] > 0 else 0
            data_context += f"\n• {name} ({details['group_type']}): {details['contracts']:,} contracts, {details['irr']:.2f}% IRR, €{details['nbv']/1000000:.1f}M NBV, {delinq_rate:.2f}% delinq"

        # Create the system prompt that requests structured output
        system_prompt = f"""
You are a Senior Financial Data Analyst for Daimler Truck Financial Services (DTFS). 

CRITICAL: You must respond ONLY with valid JSON in the exact format specified below. Do not include any text before or after the JSON.

Required JSON format:
{{
    "summary": "Brief 1-2 sentence summary of your main finding",
    "sections": [
        {{
            "title": "Section Title",
            "content": [
                {{
                    "type": "paragraph",
                    "text": "Your explanation text here"
                }},
                {{
                    "type": "bullet_list", 
                    "items": [
                        {{"text": "Bullet point 1", "highlight": false}},
                        {{"text": "Important point", "highlight": true}}
                    ]
                }},
                {{
                    "type": "table",
                    "headers": ["Segment", "IRR", "NBV", "Delinquency"],
                    "rows": [
                        ["MB/CV", "4.86%", "€400.8M", "0.07%"],
                        ["BFLEA", "4.84%", "€209.2M", "0.25%"]
                    ]
                }},
                {{
                    "type": "metric",
                    "label": "Key Metric Name",
                    "value": "4.86%",
                    "trend": "positive"
                }}
            ]
        }}
    ],
    "recommendations": [
        {{"action": "Specific actionable recommendation", "priority": "high"}}
    ]
}}

IMPORTANT RULES:
- Start response with {{ and end with }}
- Use only the content types: paragraph, bullet_list, table, metric
- For trends use: positive, negative, or neutral
- For priorities use: high, medium, or low
- Include specific numbers from the data
- Do not use markdown formatting in text fields
- Ensure valid JSON syntax

Current context: {context}
"""

        # Create the user prompt with data and question
        user_prompt = f"""
Data for {country} in {month}:
{data_context}

Question: {question}

Provide your analysis in the required JSON format. Focus on:
1. Direct answer to the question with specific data points
2. Key insights with numbers from the data
3. Actionable recommendations

Remember: Respond ONLY with valid JSON, no additional text."""

        # Call Azure OpenAI with more specific parameters for JSON output
        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,  # Lower temperature for more consistent JSON output
            max_tokens=1500,
            response_format={"type": "json_object"}  # Force JSON output if supported
        )
        
        ai_response_text = response.choices[0].message.content
        
        # Try to parse as JSON with better error handling
        try:
            # Clean the response text
            cleaned_response = ai_response_text.strip()
            
            # Remove any potential markdown code blocks
            if cleaned_response.startswith('```json'):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith('```'):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith('```'):
                cleaned_response = cleaned_response[:-3]
            
            # Find JSON boundaries more reliably
            json_start = cleaned_response.find('{')
            json_end = cleaned_response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = cleaned_response[json_start:json_end]
                structured_response = json.loads(json_str)
                
                # Validate the structure
                if isinstance(structured_response, dict) and 'sections' in structured_response:
                    return structured_response
                else:
                    raise ValueError("Invalid response structure")
            else:
                raise ValueError("No valid JSON found")
                
        except (json.JSONDecodeError, ValueError) as e:
            logging.warning(f"Failed to parse JSON response: {str(e)}")
            logging.warning(f"Raw response: {ai_response_text[:500]}...")
            
            # Fallback: create a structured response from the text
            return {
                "summary": "Analysis completed - response formatting issue occurred",
                "sections": [
                    {
                        "title": "Response",
                        "content": [
                            {
                                "type": "paragraph",
                                "text": ai_response_text
                            }
                        ]
                    }
                ],
                "recommendations": [
                    {
                        "action": "Review response formatting in backend",
                        "priority": "medium"
                    }
                ]
            }
        
    except Exception as e:
        logging.error(f"Failed to generate chat response: {str(e)}")
        raise

def generate_powerpoint_content_react(question: str, country: str, month: str, metrics_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate PowerPoint content using ReAct approach"""
    
    client = get_openai_client()
    if not client:
        raise Exception("OpenAI client not available")
    
    steps = []
    
    # Step 1: Thinking - Analyze the request
    thinking_prompt = f"""
    User is asking: "{question}"
    I need to create a PowerPoint presentation for {country} financial data from {month}.
    
    Let me think about:
    1. What type of presentation is needed?
    2. Who is the target audience?
    3. What key messages should be conveyed?
    4. What slides would be most effective?
    
    Available data: {len(metrics_data)} portfolio segments with IRR, NBV, contracts, and delinquency data.
    """
    
    thinking_response = client.chat.completions.create(
        model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4"),
        messages=[{"role": "user", "content": thinking_prompt}],
        temperature=0.3,
        max_tokens=500
    )
    
    thinking_step = {
        "type": "thinking",
        "content": thinking_response.choices[0].message.content,
        "status": "completed",
        "timestamp": datetime.utcnow().isoformat()
    }
    steps.append(thinking_step)
    
    # Step 2: Action - Analyze the data
    action_step = {
        "type": "action",
        "content": f"Analyzing portfolio data for {country} - {month}. Processing {len(metrics_data)} segments.",
        "tool_used": "data_analysis",
        "status": "in_progress",
        "timestamp": datetime.utcnow().isoformat()
    }
    steps.append(action_step)
    
    # Calculate key statistics
    total_contracts = sum(item.get('num_contracts', 0) or 0 for item in metrics_data)
    total_nbv = sum(item.get('net_book_value', 0) or 0 for item in metrics_data)
    total_delinquent = sum(item.get('delinquent_amount', 0) or 0 for item in metrics_data)
    
    # IRR analysis
    irr_values = [item.get('irr_nominal', 0) for item in metrics_data if item.get('irr_nominal') is not None]
    avg_irr = sum(irr_values) / len(irr_values) if irr_values else 0
    
    # Top and bottom performers
    sorted_by_irr = sorted(metrics_data, key=lambda x: x.get('irr_nominal', 0) or 0, reverse=True)
    top_performer = sorted_by_irr[0] if sorted_by_irr else None
    bottom_performer = sorted_by_irr[-1] if sorted_by_irr else None
    
    data_insights = {
        "total_contracts": total_contracts,
        "total_nbv_millions": total_nbv / 1000000,
        "delinquency_rate": (total_delinquent / total_nbv * 100) if total_nbv > 0 else 0,
        "average_irr": avg_irr * 100,
        "top_performer": top_performer,
        "bottom_performer": bottom_performer,
        "segment_count": len(metrics_data)
    }
    
    # Update action step
    action_step["status"] = "completed"
    action_step["result"] = data_insights
    
    # Step 3: Observation - Review findings
    observation_content = f"""
    Data analysis complete. Key findings:
    • Portfolio size: {total_contracts:,} contracts worth €{total_nbv/1000000:.1f}M
    • Average IRR: {avg_irr*100:.2f}%
    • Delinquency rate: {(total_delinquent/total_nbv*100) if total_nbv > 0 else 0:.2f}%
    • Best performing segment: {top_performer.get('group_name', 'N/A') if top_performer else 'N/A'} ({(top_performer.get('irr_nominal', 0) * 100):.2f}% IRR)
    • Underperforming segment: {bottom_performer.get('group_name', 'N/A') if bottom_performer else 'N/A'} ({(bottom_performer.get('irr_nominal', 0) * 100):.2f}% IRR)
    
    This data tells a clear story about portfolio performance and risk distribution.
    """
    
    observation_step = {
        "type": "observation",
        "content": observation_content,
        "status": "completed",
        "timestamp": datetime.utcnow().isoformat()
    }
    steps.append(observation_step)
    
    # Step 4: Thinking - Plan the presentation structure
    structure_thinking = f"""
    Based on the data analysis, I should create a presentation with:
    
    1. Executive Summary slide - high-level metrics
    2. Portfolio Overview - total volume, value, geographic/segment distribution
    3. Performance Analysis - IRR trends, top/bottom performers
    4. Risk Assessment - delinquency rates, concentration risks
    5. Key Insights & Recommendations
    
    Target audience appears to be: {"executives" if "board" in question.lower() or "executive" in question.lower() else "management team"}
    """
    
    structure_step = {
        "type": "thinking", 
        "content": structure_thinking,
        "status": "completed",
        "timestamp": datetime.utcnow().isoformat()
    }
    steps.append(structure_step)
    
    # Step 5: Action - Generate PowerPoint content
    ppt_generation_step = {
        "type": "action",
        "content": "Generating PowerPoint slide content with charts and key messages",
        "tool_used": "content_generation",
        "status": "in_progress", 
        "timestamp": datetime.utcnow().isoformat()
    }
    steps.append(ppt_generation_step)
    
    # Generate slide content
    slide_content = generate_slide_content(country, month, data_insights, metrics_data, client)
    
    ppt_generation_step["status"] = "completed"
    ppt_generation_step["result"] = f"Generated {len(slide_content)} slides with executive summary, performance analysis, and recommendations"
    
    # Step 6: Final Answer
    final_answer = {
        "type": "final_answer",
        "content": "PowerPoint presentation content generated successfully. Ready for download/review.",
        "status": "completed",
        "timestamp": datetime.utcnow().isoformat(),
        "deliverable": {
            "presentation_title": f"{country} Portfolio Performance - {month}",
            "slides": slide_content,
            "download_ready": True,
            "email_ready": False  # Would be True if email integration available
        }
    }
    steps.append(final_answer)
    
    return {
        "react_mode": True,
        "workflow_type": "powerpoint_creation",
        "steps": steps,
        "final_deliverable": slide_content
    }

def generate_slide_content(country: str, month: str, insights: Dict, metrics_data: List[Dict], client) -> List[Dict]:
    """Generate actual slide content"""
    
    slides = []
    
    # Slide 1: Title Slide
    slides.append({
        "slide_number": 1,
        "title": f"{country} Portfolio Performance Report",
        "subtitle": f"Month: {month}",
        "content_type": "title",
        "content": {
            "date": datetime.now().strftime("%B %Y"),
            "presenter": "Portfolio Management Team"
        }
    })
    
    # Slide 2: Executive Summary
    slides.append({
        "slide_number": 2,
        "title": "Executive Summary",
        "content_type": "summary",
        "content": {
            "key_metrics": [
                f"Portfolio Size: {insights['total_contracts']:,} contracts",
                f"Total NBV: €{insights['total_nbv_millions']:.1f}M", 
                f"Average IRR: {insights['average_irr']:.2f}%",
                f"Delinquency Rate: {insights['delinquency_rate']:.2f}%"
            ],
            "key_insights": [
                f"Portfolio consists of {insights['segment_count']} active segments",
                f"Top performer: {insights['top_performer'].get('group_name', 'N/A') if insights['top_performer'] else 'N/A'}",
                f"Risk profile: {'Low' if insights['delinquency_rate'] < 1 else 'Moderate' if insights['delinquency_rate'] < 2 else 'High'}"
            ]
        }
    })
    
    # Slide 3: Portfolio Overview
    slides.append({
        "slide_number": 3,
        "title": "Portfolio Overview",
        "content_type": "charts_and_tables",
        "content": {
            "chart_data": {
                "type": "bar_chart",
                "title": "Portfolio by Segment (NBV)",
                "data": [
                    {
                        "segment": item.get('group_name', 'Unknown'),
                        "nbv": item.get('net_book_value', 0) / 1000000,
                        "contracts": item.get('num_contracts', 0)
                    }
                    for item in sorted(metrics_data, key=lambda x: x.get('net_book_value', 0), reverse=True)[:10]
                ]
            },
            "summary_table": {
                "headers": ["Segment", "Contracts", "NBV (€M)", "IRR (%)"],
                "rows": [
                    [
                        item.get('group_name', 'Unknown'),
                        f"{item.get('num_contracts', 0):,}",
                        f"€{(item.get('net_book_value', 0) / 1000000):.1f}M",
                        f"{(item.get('irr_nominal', 0) * 100):.2f}%"
                    ]
                    for item in sorted(metrics_data, key=lambda x: x.get('net_book_value', 0), reverse=True)[:5]
                ]
            }
        }
    })
    
    # Slide 4: Performance Analysis  
    slides.append({
        "slide_number": 4,
        "title": "Performance Analysis",
        "content_type": "performance_analysis",
        "content": {
            "top_performers": [
                {
                    "name": item.get('group_name', 'Unknown'),
                    "irr": f"{(item.get('irr_nominal', 0) * 100):.2f}%",
                    "nbv": f"€{(item.get('net_book_value', 0) / 1000000):.1f}M"
                }
                for item in sorted(metrics_data, key=lambda x: x.get('irr_nominal', 0) or 0, reverse=True)[:3]
            ],
            "underperformers": [
                {
                    "name": item.get('group_name', 'Unknown'), 
                    "irr": f"{(item.get('irr_nominal', 0) * 100):.2f}%",
                    "issues": "Low profitability" if (item.get('irr_nominal', 0) * 100) < 3 else "Review required"
                }
                for item in sorted(metrics_data, key=lambda x: x.get('irr_nominal', 0) or 0)[:3]
            ]
        }
    })
    
    # Slide 5: Recommendations
    slides.append({
        "slide_number": 5,
        "title": "Key Recommendations",
        "content_type": "recommendations",
        "content": {
            "immediate_actions": [
                "Review underperforming segments with IRR < 3%",
                "Investigate delinquency patterns in high-risk portfolios",
                "Optimize resource allocation toward top-performing segments"
            ],
            "strategic_initiatives": [
                "Develop action plans for bottom 3 performing segments",
                "Consider portfolio rebalancing opportunities",
                "Enhance monitoring of key risk indicators"
            ]
        }
    })
    
    return slides

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

# ENDPOINTS START HERE

@app.route(route="ai-summary", methods=["POST"])
def create_ai_summary(req: func.HttpRequest) -> func.HttpResponse:
    """Generate AI-powered summary analysis of filtered portfolio data"""
    logging.info('AI Summary endpoint called.')
    
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

        # Extract parameters
        country = req_body.get('country')
        month = req_body.get('month')
        group_type = req_body.get('group_type')
        metric = req_body.get('metric')
        data = req_body.get('data', [])
        
        # Validation
        if not all([country, month, group_type, metric]):
            response = func.HttpResponse(
                json.dumps({"error": "Country, month, group_type, and metric are required"}),
                status_code=400,
                mimetype="application/json"
            )
            return add_cors_headers(response)
        
        if not data or not isinstance(data, list):
            response = func.HttpResponse(
                json.dumps({"error": "Data array is required and must contain at least one record"}),
                status_code=400,
                mimetype="application/json"
            )
            return add_cors_headers(response)
        
        logging.info(f"Generating AI summary for {country}, {month}, {group_type}, {metric} with {len(data)} records")
        
        # Generate AI summary
        summary_text = generate_ai_summary(country, month, group_type, metric, data)
        
        # Create response
        api_response = ApiResponse(
            success=True,
            data={
                "summary": summary_text,
                "analysis_context": {
                    "country": country,
                    "month": month,
                    "group_type": group_type,
                    "metric": metric,
                    "records_analyzed": len(data),
                    "generated_at": datetime.utcnow().isoformat()
                }
            },
            message="AI summary generated successfully",
            timestamp=datetime.utcnow().isoformat()
        )

        response = func.HttpResponse(
            api_response.model_dump_json(),
            status_code=200,
            mimetype="application/json"
        )
        return add_cors_headers(response)

    except Exception as e:
        logging.error(f"Failed to generate AI summary: {str(e)}")
        error_response = ApiResponse(
            success=False,
            data={},
            message=f"Error generating AI summary: {str(e)}",
            timestamp=datetime.utcnow().isoformat()
        )
        
        response = func.HttpResponse(
            error_response.model_dump_json(),
            status_code=500,
            mimetype="application/json"
        )
        return add_cors_headers(response)

# OPTIONS handler for CORS preflight requests
@app.route(route="{*path}", methods=["OPTIONS"])
def handle_options(req: func.HttpRequest) -> func.HttpResponse:
    """Handle CORS preflight requests"""
    response = func.HttpResponse("", status_code=200)
    return add_cors_headers(response)

@app.route(route="chat", methods=["POST"])
def chat_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    """AI-powered chat endpoint for data quality questions with PowerPoint support"""
    logging.info('Chat endpoint called.')
    
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

        # Extract parameters
        question = req_body.get('question', '').strip()
        country = req_body.get('country', '').strip()
        month = req_body.get('month', '').strip()
        context = req_body.get('context', '')
        selected_country = req_body.get('selectedCountry', country)
        selected_date = req_body.get('selectedDate', month)
        is_powerpoint_request = req_body.get('isPowerPointRequest', False)
        
        # Validation
        if not question:
            response = func.HttpResponse(
                json.dumps({"error": "Question is required"}),
                status_code=400,
                mimetype="application/json"
            )
            return add_cors_headers(response)
            
        if not country or not month:
            response = func.HttpResponse(
                json.dumps({"error": "Country and month are required"}),
                status_code=400,
                mimetype="application/json"
            )
            return add_cors_headers(response)
        
        logging.info(f"Processing chat question: '{question}' for {country}/{month}, PowerPoint: {is_powerpoint_request}")
        
        # Fetch relevant data from database
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            metrics_data = loop.run_until_complete(fetch_country_metrics(country, month))
        finally:
            loop.close()
        
        if not metrics_data:
            # If no data available, still provide a helpful response
            ai_response = f"""I understand you're asking about "{question}" for {selected_country} in {selected_date}.

Unfortunately, I don't have specific financial data available for {country} in {month} to provide a detailed analysis. This could be due to:

• Data not yet available for this time period
• Potential data loading issues
• The country/month combination not being in our current dataset

**Suggested next steps:**
1. Verify the country code ({country}) and month format ({month}) are correct
2. Check if data has been uploaded for this period
3. Contact the data team to confirm data availability
4. Try a different month where data might be available

I'd be happy to help analyze the data once it becomes available. Is there anything else I can assist you with regarding data quality processes or general portfolio analysis?"""

            api_response = ApiResponse(
                success=True,
                data={
                    "response": ai_response,
                    "response_type": "text",
                    "question": question,
                    "country": country,
                    "month": month,
                    "context": {
                        "selected_country": selected_country,
                        "selected_date": selected_date,
                        "data_available": False,
                        "records_analyzed": 0
                    }
                },
                message="No data available response generated",
                timestamp=datetime.utcnow().isoformat()
            )
        else:
            # Check for PowerPoint request
            if is_powerpoint_request:
                logging.info(f"PowerPoint request detected via chat endpoint: {question}")
                try:
                    presentation_result = generate_powerpoint_content_react(question, country, month, metrics_data)
                    
                    api_response = ApiResponse(
                        success=True,
                        data=presentation_result,
                        message="PowerPoint presentation generated successfully via chat endpoint",
                        timestamp=datetime.utcnow().isoformat()
                    )
                    
                    response = func.HttpResponse(
                        api_response.model_dump_json(),
                        status_code=200,
                        mimetype="application/json"
                    )
                    return add_cors_headers(response)
                except Exception as e:
                    logging.error(f"PowerPoint generation failed in chat endpoint: {str(e)}")
                    # Fall through to regular chat response
            
            # Regular chat response
            ai_response_data = generate_chat_response(question, country, month, context, metrics_data)
            
            api_response = ApiResponse(
                success=True,
                data={
                    "response": ai_response_data,
                    "response_type": "structured",
                    "question": question,
                    "country": country,
                    "month": month,
                    "context": {
                        "selected_country": selected_country,
                        "selected_date": selected_date,
                        "data_available": len(metrics_data) > 0,
                        "records_analyzed": len(metrics_data)
                    }
                },
                message="Structured chat response generated successfully",
                timestamp=datetime.utcnow().isoformat()
            )

        response = func.HttpResponse(
            api_response.model_dump_json(),
            status_code=200,
            mimetype="application/json"
        )
        return add_cors_headers(response)

    except Exception as e:
        logging.error(f"Failed to process chat request: {str(e)}")
        
        error_message = f"I apologize, but I encountered an error while processing your question: {str(e)}"
        
        if "OpenAI" in str(e):
            error_message += "\n\nThis appears to be an AI service issue. Please try again in a moment."
        elif "Supabase" in str(e) or "database" in str(e).lower():
            error_message += "\n\nThis appears to be a data access issue. Please contact support if this persists."
        
        error_response = ApiResponse(
            success=False,
            data={
                "response": error_message,
                "question": req_body.get('question', ''),
                "error_type": "processing_error"
            },
            message=f"Error processing chat request: {str(e)}",
            timestamp=datetime.utcnow().isoformat()
        )
        
        response = func.HttpResponse(
            error_response.model_dump_json(),
            status_code=500,
            mimetype="application/json"
        )
        return add_cors_headers(response)

@app.route(route="generate-presentation", methods=["POST"])
def generate_presentation(req: func.HttpRequest) -> func.HttpResponse:
    """Generate PowerPoint presentation using ReAct approach"""
    logging.info('Generate presentation endpoint called.')
    
    try:
        req_body = req.get_json()
        if not req_body:
            response = func.HttpResponse(
                json.dumps({"error": "Request body required"}),
                status_code=400,
                mimetype="application/json"
            )
            return add_cors_headers(response)

        question = req_body.get('question', '').strip()
        country = req_body.get('country', '').strip()
        month = req_body.get('month', '').strip()
        
        if not all([question, country, month]):
            response = func.HttpResponse(
                json.dumps({"error": "Question, country, and month are required"}),
                status_code=400,
                mimetype="application/json"
            )
            return add_cors_headers(response)
        
        logging.info(f"Generating presentation for: '{question}' - {country}/{month}")
        
        # Fetch data
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            metrics_data = loop.run_until_complete(fetch_country_metrics(country, month))
        finally:
            loop.close()
        
        if not metrics_data:
            response = func.HttpResponse(
                json.dumps({"error": f"No data available for {country} in {month}"}),
                status_code=404,
                mimetype="application/json"
            )
            return add_cors_headers(response)
        
        # Generate presentation using ReAct
        presentation_result = generate_powerpoint_content_react(question, country, month, metrics_data)
        
        api_response = ApiResponse(
            success=True,
            data=presentation_result,
            message="PowerPoint presentation generated successfully",
            timestamp=datetime.utcnow().isoformat()
        )

        response = func.HttpResponse(
            api_response.model_dump_json(),
            status_code=200,
            mimetype="application/json"
        )
        return add_cors_headers(response)

    except Exception as e:
        logging.error(f"Failed to generate presentation: {str(e)}")
        error_response = ApiResponse(
            success=False,
            data={},
            message=f"Error generating presentation: {str(e)}",
            timestamp=datetime.utcnow().isoformat()
        )
        
        response = func.HttpResponse(
            error_response.model_dump_json(),
            status_code=500,
            mimetype="application/json"
        )
        return add_cors_headers(response)

@app.route(route="chat/health", methods=["GET"])
def chat_health_check(req: func.HttpRequest) -> func.HttpResponse:
    """Health check specifically for chat functionality"""
    logging.info('Chat health check endpoint called.')
    
    try:
        # Test OpenAI client
        client = get_openai_client()
        openai_status = "healthy" if client else "unavailable"
        
        # Test database connection with a simple query
        db_status = "healthy"
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            test_result = loop.run_until_complete(supabase_request("country_group_metrics", {"limit": "1"}))
            loop.close()
            if not test_result:
                db_status = "no_data"
        except Exception:
            db_status = "error"
        
        health_data = {
            "chat_service": "healthy",
            "openai_client": openai_status,
            "database_connection": db_status,
            "available_endpoints": ["/api/chat", "/api/generate-presentation"],
            "timestamp": datetime.utcnow().isoformat()
        }

        response = func.HttpResponse(
            json.dumps(health_data),
            status_code=200,
            mimetype="application/json"
        )
        return add_cors_headers(response)

    except Exception as e:
        logging.error(f"Chat health check failed: {str(e)}")
        response = func.HttpResponse(
            json.dumps({
                "chat_service": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }),
            status_code=500,
            mimetype="application/json"
        )
        return add_cors_headers(response)

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
            "country_metrics": "/api/country-metrics/{country}/{month}",
            "chat": "/api/chat",
            "ai_summary": "/api/ai-summary",
            "generate_presentation": "/api/generate-presentation",
            "test_supabase": "/api/test-supabase-api",
            "chat_health": "/api/chat/health"
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
            entity="Daimler Truck FS",
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