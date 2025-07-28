"""
Security headers monitoring and CSP violation reporting API endpoints.

This module provides REST API endpoints for:
- CSP violation reporting
- Security headers status checking
- Client-side security monitoring
"""

import logging
from typing import Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ...core.database import get_db
from ...core.security import get_current_user
from ...models.user import User
from ...models.security import SecurityEvent, ThreatLevel, EventStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/security-headers", tags=["Security Headers"])


# Schemas for CSP violation reporting
class CSPViolationReport(BaseModel):
    """CSP violation report from browser."""
    document_uri: str = Field(..., description="URI of the document where violation occurred")
    referrer: str = Field(default="", description="Referrer of the document")
    violated_directive: str = Field(..., description="The directive that was violated")
    effective_directive: str = Field(..., description="The effective directive")
    original_policy: str = Field(..., description="The original CSP policy")
    blocked_uri: str = Field(..., description="URI that was blocked")
    status_code: int = Field(default=0, description="HTTP status code")
    line_number: int = Field(default=0, description="Line number where violation occurred")
    column_number: int = Field(default=0, description="Column number where violation occurred")
    source_file: str = Field(default="", description="Source file where violation occurred")


class CSPViolationReportRequest(BaseModel):
    """Complete CSP violation report request."""
    violation: CSPViolationReport
    timestamp: str
    user_agent: str
    url: str
    session_id: str = Field(default="", description="Session ID if available")


class SecurityHeadersCheck(BaseModel):
    """Security headers validation request."""
    url: str
    headers: Dict[str, str]


class SecurityHeadersResponse(BaseModel):
    """Security headers validation response."""
    secure: bool
    missing_headers: List[str]
    weak_headers: List[str]
    recommendations: List[str]
    score: int  # Security score out of 100


@router.post("/csp-violations", status_code=status.HTTP_201_CREATED)
async def report_csp_violation(
    violation_request: CSPViolationReportRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Report a Content Security Policy violation."""
    try:
        # Extract client information
        client_ip = request.client.host if request.client else "unknown"
        user_agent = violation_request.user_agent
        
        # Log the violation for immediate awareness
        logger.warning(
            f"CSP Violation: {violation_request.violation.violated_directive} "
            f"from {client_ip} - {violation_request.violation.blocked_uri}"
        )
        
        # Create security event for the violation
        security_event = SecurityEvent(
            event_type="csp_violation",
            threat_level=ThreatLevel.LOW,  # CSP violations are usually low threat but important for monitoring
            title=f"CSP Violation: {violation_request.violation.violated_directive}",
            description=(
                f"Content Security Policy violation detected. "
                f"Directive '{violation_request.violation.violated_directive}' was violated "
                f"by attempting to load '{violation_request.violation.blocked_uri}'"
            ),
            source_ip=client_ip,
            user_agent=user_agent,
            risk_score=2.0,  # Low risk but worth tracking
            confidence=0.95,
            detection_method="browser_csp",
            detection_rule="content_security_policy",
            additional_data={
                "violation": violation_request.violation.dict(),
                "document_uri": violation_request.violation.document_uri,
                "violated_directive": violation_request.violation.violated_directive,
                "blocked_uri": violation_request.violation.blocked_uri,
                "effective_directive": violation_request.violation.effective_directive,
                "original_policy": violation_request.violation.original_policy,
                "line_number": violation_request.violation.line_number,
                "column_number": violation_request.violation.column_number,
                "source_file": violation_request.violation.source_file,
                "browser_timestamp": violation_request.timestamp,
                "page_url": violation_request.url,
                "session_id": violation_request.session_id
            },
            status=EventStatus.UNREVIEWED,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        )
        
        db.add(security_event)
        db.commit()
        db.refresh(security_event)
        
        # Check if this is a pattern (multiple violations from same source)
        recent_violations = db.query(SecurityEvent).filter(
            SecurityEvent.event_type == "csp_violation",
            SecurityEvent.source_ip == client_ip,
            SecurityEvent.detected_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        ).count()
        
        if recent_violations > 10:  # More than 10 violations today from same IP
            logger.warning(f"High CSP violation frequency from {client_ip}: {recent_violations} violations today")
            
            # Could trigger additional security measures here
            # For example, temporary rate limiting or additional monitoring
        
        return {
            "message": "CSP violation reported successfully",
            "event_id": security_event.event_id,
            "timestamp": security_event.detected_at.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to process CSP violation report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process CSP violation report"
        )


@router.post("/validate-headers", response_model=SecurityHeadersResponse)
async def validate_security_headers(
    headers_check: SecurityHeadersCheck,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate security headers for a given URL and set of headers."""
    try:
        missing_headers = []
        weak_headers = []
        recommendations = []
        score = 100
        
        # Required security headers
        required_headers = {
            'strict-transport-security': {
                'name': 'HSTS',
                'description': 'HTTP Strict Transport Security',
                'weight': 20
            },
            'content-security-policy': {
                'name': 'CSP',
                'description': 'Content Security Policy',
                'weight': 25
            },
            'x-frame-options': {
                'name': 'X-Frame-Options',
                'description': 'Clickjacking Protection',
                'weight': 15
            },
            'x-content-type-options': {
                'name': 'X-Content-Type-Options',
                'description': 'MIME Sniffing Protection',
                'weight': 10
            },
            'x-xss-protection': {
                'name': 'X-XSS-Protection',
                'description': 'XSS Filter',
                'weight': 10
            },
            'referrer-policy': {
                'name': 'Referrer-Policy',
                'description': 'Referrer Information Control',
                'weight': 10
            }
        }
        
        # Check for missing headers
        for header_key, header_info in required_headers.items():
            if header_key not in headers_check.headers:
                missing_headers.append(header_info['name'])
                score -= header_info['weight']
                recommendations.append(f"Add {header_info['name']} header for {header_info['description']}")
        
        # Check for weak header values
        headers_lower = {k.lower(): v for k, v in headers_check.headers.items()}
        
        # HSTS checks
        if 'strict-transport-security' in headers_lower:
            hsts_value = headers_lower['strict-transport-security']
            if 'max-age=' not in hsts_value:
                weak_headers.append('HSTS: Missing max-age directive')
                score -= 5
            elif 'max-age=0' in hsts_value:
                weak_headers.append('HSTS: max-age is set to 0')
                score -= 10
            elif not any(age in hsts_value for age in ['31536000', '63072000']):
                weak_headers.append('HSTS: max-age should be at least 1 year')
                score -= 5
            
            if 'includeSubDomains' not in hsts_value:
                recommendations.append('HSTS: Consider adding includeSubDomains directive')
        
        # CSP checks
        if 'content-security-policy' in headers_lower:
            csp_value = headers_lower['content-security-policy']
            if "'unsafe-eval'" in csp_value:
                weak_headers.append("CSP: Contains 'unsafe-eval' which reduces security")
                score -= 5
            if "'unsafe-inline'" in csp_value:
                weak_headers.append("CSP: Contains 'unsafe-inline' which reduces security")
                score -= 3
            if 'default-src' not in csp_value:
                weak_headers.append("CSP: Missing default-src directive")
                score -= 5
        
        # X-Frame-Options checks
        if 'x-frame-options' in headers_lower:
            frame_options = headers_lower['x-frame-options'].upper()
            if frame_options not in ['DENY', 'SAMEORIGIN']:
                weak_headers.append("X-Frame-Options: Should be DENY or SAMEORIGIN")
                score -= 5
        
        # Additional recommendations
        if score < 90:
            recommendations.append("Consider implementing all recommended security headers")
        if score < 70:
            recommendations.append("Security posture needs significant improvement")
        
        # Ensure score doesn't go below 0
        score = max(0, score)
        
        # Log the security headers check
        logger.info(f"Security headers check by user {current_user.id}: score {score}/100")
        
        return SecurityHeadersResponse(
            secure=score >= 80,
            missing_headers=missing_headers,
            weak_headers=weak_headers,
            recommendations=recommendations,
            score=score
        )
        
    except Exception as e:
        logger.error(f"Failed to validate security headers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate security headers"
        )


@router.get("/csp-violations")
async def get_csp_violations(
    hours: int = 24,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent CSP violations."""
    try:
        # Calculate time range
        since_time = datetime.utcnow().replace(
            hour=datetime.utcnow().hour - hours,
            minute=0,
            second=0,
            microsecond=0
        )
        
        # Query CSP violations
        violations = db.query(SecurityEvent).filter(
            SecurityEvent.event_type == "csp_violation",
            SecurityEvent.detected_at >= since_time
        ).order_by(SecurityEvent.detected_at.desc()).limit(limit).all()
        
        # Format response
        violation_data = []
        for violation in violations:
            additional_data = violation.additional_data or {}
            violation_info = additional_data.get("violation", {})
            
            violation_data.append({
                "event_id": violation.event_id,
                "timestamp": violation.detected_at.isoformat(),
                "source_ip": violation.source_ip,
                "user_agent": violation.user_agent,
                "violated_directive": violation_info.get("violated_directive"),
                "blocked_uri": violation_info.get("blocked_uri"),
                "document_uri": violation_info.get("document_uri"),
                "line_number": violation_info.get("line_number"),
                "column_number": violation_info.get("column_number"),
                "risk_score": violation.risk_score
            })
        
        return {
            "violations": violation_data,
            "total_count": len(violation_data),
            "time_range_hours": hours
        }
        
    except Exception as e:
        logger.error(f"Failed to get CSP violations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve CSP violations"
        )


@router.get("/csp-violations/stats")
async def get_csp_violation_stats(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get CSP violation statistics."""
    try:
        # Calculate time range
        since_time = datetime.utcnow().replace(
            day=datetime.utcnow().day - days,
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )
        
        # Query all CSP violations in time range
        violations = db.query(SecurityEvent).filter(
            SecurityEvent.event_type == "csp_violation",
            SecurityEvent.detected_at >= since_time
        ).all()
        
        # Analyze violations
        by_directive = {}
        by_source_ip = {}
        by_day = {}
        
        for violation in violations:
            additional_data = violation.additional_data or {}
            violation_info = additional_data.get("violation", {})
            
            # By directive
            directive = violation_info.get("violated_directive", "unknown")
            by_directive[directive] = by_directive.get(directive, 0) + 1
            
            # By source IP
            ip = violation.source_ip or "unknown"
            by_source_ip[ip] = by_source_ip.get(ip, 0) + 1
            
            # By day
            day = violation.detected_at.date().isoformat()
            by_day[day] = by_day.get(day, 0) + 1
        
        # Sort by frequency
        top_directives = sorted(by_directive.items(), key=lambda x: x[1], reverse=True)[:10]
        top_sources = sorted(by_source_ip.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "total_violations": len(violations),
            "time_range_days": days,
            "top_violated_directives": [
                {"directive": directive, "count": count}
                for directive, count in top_directives
            ],
            "top_source_ips": [
                {"ip_address": ip, "count": count}
                for ip, count in top_sources
            ],
            "violations_by_day": by_day
        }
        
    except Exception as e:
        logger.error(f"Failed to get CSP violation stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve CSP violation statistics"
        )