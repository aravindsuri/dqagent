from pydantic import BaseModel
from typing import List, Optional, Any

class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None
    timestamp: str

class Country(BaseModel):
    code: str
    name: str
    entity_id: str
    entity_name: str
    active: bool
    region: str

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    country: str
    role: str  # 'market_team' | 'risk_analyst' | 'admin'
    permissions: List[str]

class HealthCheck(BaseModel):
    status: str
    services: dict
    timestamp: str