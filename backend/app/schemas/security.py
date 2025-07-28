"""
Security API schemas for SecureVault.

This module defines Pydantic schemas for security operations including:
- Security event management (create, update, list responses)
- Threat response and automated actions
- Security alerts and notifications
- IP blocklist management
- Security metrics and dashboard data
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator, IPvAnyAddress
from enum import Enum

from ..models.security import ThreatLevel, EventStatus, ResponseAction


# Request Schemas

class CreateSecurityEventRequest(BaseModel):
    """Schema for creating a security event."""
    event_type: str = Field(..., description="Type of security event")
    source_ip: Optional[str] = Field(None, description="Source IP address")
    user_id: Optional[int] = Field(None, description="Associated user ID")
    user_agent: Optional[str] = Field(None, description="User agent string")
    session_id: Optional[str] = Field(None, description="Session ID")
    timestamp: Optional[datetime] = Field(None, description="Event timestamp")
    additional_data: Optional[Dict[str, Any]] = Field(None, description="Additional event data")


class UpdateSecurityEventRequest(BaseModel):
    """Schema for updating a security event."""
    status: Optional[EventStatus] = Field(None, description="New event status")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")


class IPBlockRequest(BaseModel):
    """Schema for blocking an IP address."""
    ip_address: str = Field(..., description="IP address to block")
    reason: str = Field(..., description="Reason for blocking")
    expires_at: Optional[datetime] = Field(None, description="Block expiration time")
    is_permanent: bool = Field(False, description="Whether block is permanent")
    
    @validator('ip_address')
    def validate_ip_address(cls, v):
        """Validate IP address format."""
        try:
            IPvAnyAddress(v)
            return v
        except ValueError:
            raise ValueError('Invalid IP address format')


# Response Schemas

class SecurityEventResponse(BaseModel):
    """Schema for security event response."""
    id: int = Field(..., description="Event database ID")
    event_id: str = Field(..., description="Unique event identifier")
    event_type: str = Field(..., description="Type of security event")
    threat_level: ThreatLevel = Field(..., description="Threat severity level")
    status: EventStatus = Field(..., description="Event status")
    title: str = Field(..., description="Event title")
    description: str = Field(..., description="Event description")
    source_ip: Optional[str] = Field(None, description="Source IP address")
    user_id: Optional[int] = Field(None, description="Associated user ID")
    document_id: Optional[int] = Field(None, description="Associated document ID")
    risk_score: float = Field(..., description="Risk score (0-10)")
    confidence: float = Field(..., description="Detection confidence (0-1)")
    detection_method: str = Field(..., description="Detection method used")
    detection_rule: Optional[str] = Field(None, description="Detection rule name")
    detected_at: datetime = Field(..., description="Detection timestamp")
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    additional_data: Dict[str, Any] = Field(..., description="Additional event data")

    class Config:
        from_attributes = True


class SecurityEventListResponse(BaseModel):
    """Schema for paginated security event list response."""
    events: List[SecurityEventResponse] = Field(..., description="List of security events")
    total: int = Field(..., description="Total number of events")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    has_next: bool = Field(..., description="Whether there are more pages")


class ThreatResponseResponse(BaseModel):
    """Schema for threat response data."""
    id: int = Field(..., description="Response database ID")
    response_id: str = Field(..., description="Unique response identifier")
    event_id: str = Field(..., description="Associated event ID")
    action: ResponseAction = Field(..., description="Response action taken")
    target_type: str = Field(..., description="Target type (ip, user, session)")
    target_value: str = Field(..., description="Target value")
    duration_minutes: Optional[int] = Field(None, description="Action duration in minutes")
    executed_at: datetime = Field(..., description="Execution timestamp")
    executed_by: str = Field(..., description="Who executed the response")
    success: bool = Field(..., description="Whether response was successful")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    reversed_at: Optional[datetime] = Field(None, description="Reversal timestamp")

    class Config:
        from_attributes = True


class SecurityAlertResponse(BaseModel):
    """Schema for security alert data."""
    id: int = Field(..., description="Alert database ID")
    alert_id: str = Field(..., description="Unique alert identifier")
    event_id: str = Field(..., description="Associated event ID")
    alert_type: str = Field(..., description="Alert type (email, sms, webhook)")
    recipient: str = Field(..., description="Alert recipient")
    subject: str = Field(..., description="Alert subject")
    message: str = Field(..., description="Alert message")
    sent_at: Optional[datetime] = Field(None, description="Send timestamp")
    delivered_at: Optional[datetime] = Field(None, description="Delivery timestamp")
    delivery_status: str = Field(..., description="Delivery status")
    viewed_at: Optional[datetime] = Field(None, description="View timestamp")
    acknowledged_at: Optional[datetime] = Field(None, description="Acknowledgment timestamp")

    class Config:
        from_attributes = True


class IPBlocklistResponse(BaseModel):
    """Schema for IP blocklist entry."""
    id: int = Field(..., description="Block entry ID")
    ip_address: str = Field(..., description="Blocked IP address")
    reason: str = Field(..., description="Block reason")
    blocked_at: datetime = Field(..., description="Block timestamp")
    blocked_by: str = Field(..., description="Who blocked the IP")
    expires_at: Optional[datetime] = Field(None, description="Block expiration")
    is_permanent: bool = Field(..., description="Whether block is permanent")
    block_count: int = Field(..., description="Number of times blocked")
    is_active: bool = Field(..., description="Whether block is currently active")

    class Config:
        from_attributes = True


class SecurityMetricsResponse(BaseModel):
    """Schema for security metrics and statistics."""
    period_days: int = Field(..., description="Period covered in days")
    total_events: int = Field(..., description="Total security events")
    resolved_events: int = Field(..., description="Number of resolved events")
    resolution_rate: float = Field(..., description="Event resolution rate (0-1)")
    total_responses: int = Field(..., description="Total threat responses")
    successful_responses: int = Field(..., description="Successful responses")
    response_success_rate: float = Field(..., description="Response success rate (0-1)")
    average_risk_score: float = Field(..., description="Average risk score")
    highest_risk_score: float = Field(..., description="Highest risk score")
    threat_level_distribution: Dict[str, int] = Field(..., description="Events by threat level")


class SecurityDashboardResponse(BaseModel):
    """Schema for security dashboard data."""
    period_hours: int = Field(..., description="Period covered in hours")
    event_counts: Dict[str, int] = Field(..., description="Event counts by threat level")
    active_threats: int = Field(..., description="Number of active threats")
    blocked_ips: int = Field(..., description="Number of blocked IPs")
    recent_events: List[Dict[str, Any]] = Field(..., description="Recent high-priority events")
    top_threat_sources: List[Dict[str, Any]] = Field(..., description="Top threat source IPs")


class ThreatIntelligenceResponse(BaseModel):
    """Schema for threat intelligence data."""
    ip_address: str = Field(..., description="IP address")
    reputation_score: float = Field(..., description="Reputation score (0-10)")
    threat_types: List[str] = Field(..., description="Associated threat types")
    first_seen: datetime = Field(..., description="First time seen")
    last_seen: datetime = Field(..., description="Last time seen")
    geographic_info: Optional[Dict[str, str]] = Field(None, description="Geographic information")
    intelligence_sources: List[str] = Field(..., description="Intelligence sources")


class SuspiciousPatternResponse(BaseModel):
    """Schema for suspicious pattern configuration."""
    id: int = Field(..., description="Pattern ID")
    pattern_id: str = Field(..., description="Unique pattern identifier")
    name: str = Field(..., description="Pattern name")
    description: str = Field(..., description="Pattern description")
    pattern_type: str = Field(..., description="Pattern type")
    conditions: Dict[str, Any] = Field(..., description="Pattern conditions")
    threshold: float = Field(..., description="Detection threshold")
    time_window_minutes: int = Field(..., description="Time window in minutes")
    base_risk_score: float = Field(..., description="Base risk score")
    threat_level: ThreatLevel = Field(..., description="Threat level")
    auto_response: ResponseAction = Field(..., description="Automated response")
    is_active: bool = Field(..., description="Whether pattern is active")
    created_at: datetime = Field(..., description="Creation timestamp")
    detection_count: int = Field(..., description="Number of detections")
    last_detection: Optional[datetime] = Field(None, description="Last detection time")
    false_positive_count: int = Field(..., description="False positive count")

    class Config:
        from_attributes = True


class CreateSuspiciousPatternRequest(BaseModel):
    """Schema for creating a suspicious pattern."""
    name: str = Field(..., min_length=3, max_length=255, description="Pattern name")
    description: str = Field(..., min_length=10, description="Pattern description")
    pattern_type: str = Field(..., description="Pattern type")
    conditions: Dict[str, Any] = Field(..., description="Pattern conditions")
    threshold: float = Field(..., ge=0, description="Detection threshold")
    time_window_minutes: int = Field(..., ge=1, le=10080, description="Time window in minutes")
    base_risk_score: float = Field(..., ge=0, le=10, description="Base risk score")
    threat_level: ThreatLevel = Field(..., description="Threat level")
    auto_response: ResponseAction = Field(..., description="Automated response")
    response_parameters: Optional[Dict[str, Any]] = Field(None, description="Response parameters")


class UpdateSuspiciousPatternRequest(BaseModel):
    """Schema for updating a suspicious pattern."""
    name: Optional[str] = Field(None, min_length=3, max_length=255, description="Pattern name")
    description: Optional[str] = Field(None, min_length=10, description="Pattern description")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Pattern conditions")
    threshold: Optional[float] = Field(None, ge=0, description="Detection threshold")
    time_window_minutes: Optional[int] = Field(None, ge=1, le=10080, description="Time window")
    base_risk_score: Optional[float] = Field(None, ge=0, le=10, description="Base risk score")
    threat_level: Optional[ThreatLevel] = Field(None, description="Threat level")
    auto_response: Optional[ResponseAction] = Field(None, description="Automated response")
    is_active: Optional[bool] = Field(None, description="Whether pattern is active")


class SecurityConfigurationResponse(BaseModel):
    """Schema for security configuration data."""
    detection_rules_count: int = Field(..., description="Number of detection rules")
    active_patterns: int = Field(..., description="Number of active patterns")
    auto_response_enabled: bool = Field(..., description="Whether auto-response is enabled")
    rate_limiting_enabled: bool = Field(..., description="Whether rate limiting is enabled")
    ip_blocking_enabled: bool = Field(..., description="Whether IP blocking is enabled")
    alert_thresholds: Dict[str, float] = Field(..., description="Alert thresholds by threat level")
    monitoring_settings: Dict[str, Any] = Field(..., description="Monitoring configuration")


class SecurityAnalysisRequest(BaseModel):
    """Schema for requesting security analysis."""
    analysis_type: str = Field(..., description="Type of analysis to perform")
    target: str = Field(..., description="Analysis target (IP, user, etc.)")
    time_range_hours: int = Field(24, ge=1, le=168, description="Time range for analysis")
    include_historical: bool = Field(False, description="Include historical data")
    detailed_report: bool = Field(False, description="Generate detailed report")


class SecurityAnalysisResponse(BaseModel):
    """Schema for security analysis results."""
    analysis_id: str = Field(..., description="Analysis identifier")
    analysis_type: str = Field(..., description="Type of analysis performed")
    target: str = Field(..., description="Analysis target")
    performed_at: datetime = Field(..., description="Analysis timestamp")
    risk_assessment: Dict[str, Any] = Field(..., description="Risk assessment results")
    findings: List[Dict[str, Any]] = Field(..., description="Analysis findings")
    recommendations: List[str] = Field(..., description="Security recommendations")
    confidence_score: float = Field(..., description="Analysis confidence (0-1)")


# Error Response Schema
class SecurityErrorResponse(BaseModel):
    """Schema for security API error responses."""
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code")
    event_id: Optional[str] = Field(None, description="Related event ID if applicable")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")


# Success Response Schema
class SecuritySuccessResponse(BaseModel):
    """Schema for security API success responses."""
    message: str = Field(..., description="Success message")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data")
    event_id: Optional[str] = Field(None, description="Related event ID if applicable")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")