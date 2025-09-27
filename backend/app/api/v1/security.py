"""
Security monitoring API endpoints for SecureVault.

This module provides REST API endpoints for:
- Security event monitoring and management
- Intrusion detection configuration
- Threat response management
- Security alerts and notifications
- IP blocklist management
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func, text

from ...core.database import get_db
from ...core.security import get_current_user
from ...core.rbac import require_permission
from ...models.user import User
from ...models.security import (
    SecurityEvent, ThreatResponse, SecurityAlert, SuspiciousPattern,
    SecurityMetrics, IPBlocklist, ThreatLevel, EventStatus, ResponseAction
)
from ...services.security_service import security_service
from ...schemas.security import (
    SecurityEventResponse, SecurityEventListResponse, ThreatResponseResponse,
    SecurityAlertResponse, SecurityMetricsResponse, IPBlocklistResponse,
    CreateSecurityEventRequest, UpdateSecurityEventRequest, IPBlockRequest,
    SecurityDashboardResponse, ThreatIntelligenceResponse
)

router = APIRouter(prefix="/security", tags=["Security"])


# 6.3.1.3: Security Monitoring Endpoints

@router.get("/events", response_model=SecurityEventListResponse)
@require_permission("security:read")
async def get_security_events(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=200, description="Page size"),
    threat_level: Optional[ThreatLevel] = Query(None, description="Filter by threat level"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    status: Optional[EventStatus] = Query(None, description="Filter by status"),
    source_ip: Optional[str] = Query(None, description="Filter by source IP"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get security events with filtering and pagination."""
    try:
        query = db.query(SecurityEvent)
        
        # Apply filters
        if threat_level:
            query = query.filter(SecurityEvent.threat_level == threat_level)
        if event_type:
            query = query.filter(SecurityEvent.event_type == event_type)
        if status:
            query = query.filter(SecurityEvent.status == status)
        if source_ip:
            query = query.filter(SecurityEvent.source_ip == source_ip)
        if start_date:
            query = query.filter(SecurityEvent.detected_at >= start_date)
        if end_date:
            query = query.filter(SecurityEvent.detected_at <= end_date)
            
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        offset = (page - 1) * size
        events = query.order_by(desc(SecurityEvent.detected_at)).offset(offset).limit(size).all()
        
        # Convert to response format
        event_responses = []
        for event in events:
            event_dict = {
                "id": event.id,
                "event_id": event.event_id,
                "event_type": event.event_type,
                "threat_level": event.threat_level,
                "status": event.status,
                "title": event.title,
                "description": event.description,
                "source_ip": event.source_ip,
                "user_id": event.user_id,
                "document_id": event.document_id,
                "risk_score": event.risk_score,
                "confidence": event.confidence,
                "detection_method": event.detection_method,
                "detection_rule": event.detection_rule,
                "detected_at": event.detected_at,
                "resolved_at": event.resolved_at,
                "additional_data": event.additional_data or {}
            }
            event_responses.append(SecurityEventResponse(**event_dict))
        
        return SecurityEventListResponse(
            events=event_responses,
            total=total,
            page=page,
            size=size,
            has_next=offset + size < total
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get security events: {str(e)}"
        )


@router.get("/events/{event_id}", response_model=SecurityEventResponse)
@require_permission("security:read")
async def get_security_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific security event by ID."""
    event = db.query(SecurityEvent).filter(SecurityEvent.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Security event not found"
        )
    
    return SecurityEventResponse(
        id=event.id,
        event_id=event.event_id,
        event_type=event.event_type,
        threat_level=event.threat_level,
        status=event.status,
        title=event.title,
        description=event.description,
        source_ip=event.source_ip,
        user_id=event.user_id,
        document_id=event.document_id,
        risk_score=event.risk_score,
        confidence=event.confidence,
        detection_method=event.detection_method,
        detection_rule=event.detection_rule,
        detected_at=event.detected_at,
        resolved_at=event.resolved_at,
        additional_data=event.additional_data or {}
    )


@router.put("/events/{event_id}", response_model=SecurityEventResponse)
@require_permission("security:update")
async def update_security_event(
    event_id: str,
    update_data: UpdateSecurityEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a security event (e.g., change status, add resolution notes)."""
    event = db.query(SecurityEvent).filter(SecurityEvent.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Security event not found"
        )
    
    try:
        # Update fields
        if update_data.status is not None:
            event.status = update_data.status
            if update_data.status == EventStatus.RESOLVED:
                event.resolved_at = datetime.utcnow()
                event.resolved_by = current_user.id
        
        if update_data.resolution_notes is not None:
            event.resolution_notes = update_data.resolution_notes
            
        db.commit()
        db.refresh(event)
        
        return SecurityEventResponse(
            id=event.id,
            event_id=event.event_id,
            event_type=event.event_type,
            threat_level=event.threat_level,
            status=event.status,
            title=event.title,
            description=event.description,
            source_ip=event.source_ip,
            user_id=event.user_id,
            document_id=event.document_id,
            risk_score=event.risk_score,
            confidence=event.confidence,
            detection_method=event.detection_method,
            detection_rule=event.detection_rule,
            detected_at=event.detected_at,
            resolved_at=event.resolved_at,
            additional_data=event.additional_data or {}
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update security event: {str(e)}"
        )


@router.post("/events/analyze")
@require_permission("security:create")
async def analyze_security_event(
    event_data: CreateSecurityEventRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze a potential security event."""
    try:
        # Convert request to dict
        event_dict = {
            "event_type": event_data.event_type,
            "ip_address": event_data.source_ip,
            "user_id": event_data.user_id,
            "user_agent": event_data.user_agent,
            "session_id": event_data.session_id,
            "timestamp": event_data.timestamp.isoformat() if event_data.timestamp else datetime.utcnow().isoformat(),
            "additional_data": event_data.additional_data or {}
        }
        
        # Analyze the event
        security_event = await security_service.analyze_event(event_dict, db)
        
        if security_event:
            return {
                "analyzed": True,
                "event_created": True,
                "event_id": security_event.event_id,
                "threat_level": security_event.threat_level.value,
                "risk_score": security_event.risk_score
            }
        else:
            return {
                "analyzed": True,
                "event_created": False,
                "message": "Event analyzed but no security threat detected"
            }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze security event: {str(e)}"
        )


@router.get("/dashboard", response_model=SecurityDashboardResponse)
@require_permission("security:read")
async def get_security_dashboard(
    hours: int = Query(24, ge=1, le=168, description="Hours of data to include"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """FIXED: Get comprehensive security dashboard with sessions and audit logs."""
    try:
        since_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Get active sessions from security events (approximation)
        active_sessions = db.query(func.count(func.distinct(SecurityEvent.session_id))).filter(
            and_(
                SecurityEvent.detected_at >= datetime.utcnow() - timedelta(minutes=30),
                SecurityEvent.session_id.isnot(None)
            )
        ).scalar() or 0
        
        # Get recent user activity from security events
        last_logins = db.query(
            SecurityEvent.user_id,
            func.max(SecurityEvent.detected_at).label('last_activity')
        ).filter(
            and_(
                SecurityEvent.event_type.in_(['login_success', 'document_access']),
                SecurityEvent.detected_at >= since_time,
                SecurityEvent.user_id.isnot(None)
            )
        ).group_by(SecurityEvent.user_id).all()
        
        # Get security-related operations count
        key_operations = db.query(func.count(SecurityEvent.id)).filter(
            and_(
                SecurityEvent.event_type.in_(['key_rotation', 'encryption_event', 'decryption_event']),
                SecurityEvent.detected_at >= since_time
            )
        ).scalar() or 0
        
        # Event counts by threat level
        event_counts = {
            "critical": db.query(SecurityEvent).filter(
                and_(SecurityEvent.threat_level == ThreatLevel.CRITICAL,
                     SecurityEvent.detected_at >= since_time)
            ).count(),
            "high": db.query(SecurityEvent).filter(
                and_(SecurityEvent.threat_level == ThreatLevel.HIGH,
                     SecurityEvent.detected_at >= since_time)
            ).count(),
            "medium": db.query(SecurityEvent).filter(
                and_(SecurityEvent.threat_level == ThreatLevel.MEDIUM,
                     SecurityEvent.detected_at >= since_time)
            ).count(),
            "low": db.query(SecurityEvent).filter(
                and_(SecurityEvent.threat_level == ThreatLevel.LOW,
                     SecurityEvent.detected_at >= since_time)
            ).count(),
        }
        
        # Active threats
        active_threats = db.query(SecurityEvent).filter(
            and_(SecurityEvent.status == EventStatus.ACTIVE,
                 SecurityEvent.detected_at >= since_time)
        ).count()
        
        # Blocked IPs
        blocked_ips = db.query(IPBlocklist).filter(
            or_(IPBlocklist.is_permanent == True,
                IPBlocklist.expires_at > datetime.utcnow())
        ).count()
        
        # Recent high-priority events
        recent_events = db.query(SecurityEvent).filter(
            and_(SecurityEvent.detected_at >= since_time,
                 SecurityEvent.threat_level.in_([ThreatLevel.HIGH, ThreatLevel.CRITICAL]))
        ).order_by(desc(SecurityEvent.detected_at)).limit(10).all()
        
        # Top threat sources
        threat_sources = db.query(
            SecurityEvent.source_ip,
            func.count(SecurityEvent.id).label('event_count'),
            func.max(SecurityEvent.risk_score).label('max_risk')
        ).filter(
            SecurityEvent.detected_at >= since_time
        ).group_by(SecurityEvent.source_ip).order_by(
            desc(func.count(SecurityEvent.id))
        ).limit(10).all()
        
        # FIXED: Enhanced dashboard response with sessions and audit data
        return {
            "period_hours": hours,
            "event_counts": event_counts,
            "active_threats": active_threats,
            "blocked_ips": blocked_ips,
            "active_sessions": active_sessions,
            "key_operations": key_operations,
            "total_users_active": len(last_logins),
            "recent_events": [
                {
                    "event_id": event.event_id,
                    "title": event.title,
                    "threat_level": event.threat_level.value,
                    "source_ip": event.source_ip,
                    "detected_at": event.detected_at.isoformat(),
                    "risk_score": event.risk_score
                }
                for event in recent_events
            ],
            "top_threat_sources": [
                {
                    "ip_address": source.source_ip,
                    "event_count": source.event_count,
                    "max_risk_score": source.max_risk
                }
                for source in threat_sources if source.source_ip
            ],
            "last_logins": [
                {
                    "user_id": login.user_id,
                    "last_activity": login.last_activity.isoformat()
                }
                for login in last_logins[:10]  # Top 10 recent activities
            ],
            "audit_summary": {
                "total_events": db.query(SecurityEvent).filter(
                    SecurityEvent.detected_at >= since_time
                ).count(),
                "unique_users": db.query(func.count(func.distinct(SecurityEvent.user_id))).filter(
                    and_(
                        SecurityEvent.detected_at >= since_time,
                        SecurityEvent.user_id.isnot(None)
                    )
                ).scalar() or 0,
                "unique_ips": db.query(func.count(func.distinct(SecurityEvent.source_ip))).filter(
                    and_(
                        SecurityEvent.detected_at >= since_time,
                        SecurityEvent.source_ip.isnot(None)
                    )
                ).scalar() or 0
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get security dashboard: {str(e)}"
        )


# IP Blocklist Management

@router.get("/blocklist", response_model=List[IPBlocklistResponse])
@require_permission("security:read")
async def get_ip_blocklist(
    active_only: bool = Query(True, description="Show only active blocks"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get IP blocklist."""
    try:
        query = db.query(IPBlocklist)
        
        if active_only:
            query = query.filter(
                and_(
                    or_(IPBlocklist.is_permanent == True,
                        IPBlocklist.expires_at > datetime.utcnow()),
                    IPBlocklist.manually_removed == False
                )
            )
        
        blocks = query.order_by(desc(IPBlocklist.blocked_at)).all()
        
        return [
            IPBlocklistResponse(
                id=block.id,
                ip_address=block.ip_address,
                reason=block.reason,
                blocked_at=block.blocked_at,
                blocked_by=block.blocked_by,
                expires_at=block.expires_at,
                is_permanent=block.is_permanent,
                block_count=block.block_count,
                is_active=not block.manually_removed and (
                    block.is_permanent or 
                    (block.expires_at and block.expires_at > datetime.utcnow())
                )
            )
            for block in blocks
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get IP blocklist: {str(e)}"
        )


@router.post("/blocklist", response_model=IPBlocklistResponse)
@require_permission("security:create")
async def block_ip_address(
    block_data: IPBlockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually block an IP address."""
    try:
        # Check if already blocked
        existing_block = db.query(IPBlocklist).filter(
            IPBlocklist.ip_address == block_data.ip_address
        ).first()
        
        if existing_block and not existing_block.manually_removed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="IP address is already blocked"
            )
        
        # Create new block
        block_entry = IPBlocklist(
            ip_address=block_data.ip_address,
            reason=block_data.reason,
            blocked_by=f"user_{current_user.id}",
            expires_at=block_data.expires_at,
            is_permanent=block_data.is_permanent
        )
        
        db.add(block_entry)
        db.commit()
        db.refresh(block_entry)
        
        # Add to runtime blocklist
        security_service.blocked_ips.add(block_data.ip_address)
        
        return IPBlocklistResponse(
            id=block_entry.id,
            ip_address=block_entry.ip_address,
            reason=block_entry.reason,
            blocked_at=block_entry.blocked_at,
            blocked_by=block_entry.blocked_by,
            expires_at=block_entry.expires_at,
            is_permanent=block_entry.is_permanent,
            block_count=block_entry.block_count,
            is_active=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to block IP address: {str(e)}"
        )


@router.delete("/blocklist/{ip_address}")
@require_permission("security:update")
async def unblock_ip_address(
    ip_address: str,
    reason: str = Query(..., description="Reason for unblocking"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually unblock an IP address."""
    try:
        block_entry = db.query(IPBlocklist).filter(
            IPBlocklist.ip_address == ip_address
        ).first()
        
        if not block_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="IP address not found in blocklist"
            )
        
        # Mark as manually removed
        block_entry.manually_removed = True
        block_entry.removed_at = datetime.utcnow()
        block_entry.removed_by = current_user.id
        block_entry.removal_reason = reason
        
        # Remove from runtime blocklist
        if ip_address in security_service.blocked_ips:
            security_service.blocked_ips.remove(ip_address)
        
        db.commit()
        
        return {"message": f"IP address {ip_address} has been unblocked"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unblock IP address: {str(e)}"
        )


@router.get("/metrics", response_model=SecurityMetricsResponse)
@require_permission("security:read")
async def get_security_metrics(
    days: int = Query(7, ge=1, le=90, description="Days of metrics to retrieve"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get security metrics and statistics."""
    try:
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # Overall statistics
        total_events = db.query(SecurityEvent).filter(
            SecurityEvent.detected_at >= since_date
        ).count()
        
        resolved_events = db.query(SecurityEvent).filter(
            and_(SecurityEvent.detected_at >= since_date,
                 SecurityEvent.status == EventStatus.RESOLVED)
        ).count()
        
        # Threat response statistics
        total_responses = db.query(ThreatResponse).filter(
            ThreatResponse.executed_at >= since_date
        ).count()
        
        successful_responses = db.query(ThreatResponse).filter(
            and_(ThreatResponse.executed_at >= since_date,
                 ThreatResponse.success == True)
        ).count()
        
        # Risk score statistics
        risk_stats = db.query(
            func.avg(SecurityEvent.risk_score).label('avg_risk'),
            func.max(SecurityEvent.risk_score).label('max_risk'),
            func.min(SecurityEvent.risk_score).label('min_risk')
        ).filter(
            SecurityEvent.detected_at >= since_date
        ).first()
        
        return SecurityMetricsResponse(
            period_days=days,
            total_events=total_events,
            resolved_events=resolved_events,
            resolution_rate=resolved_events / total_events if total_events > 0 else 0,
            total_responses=total_responses,
            successful_responses=successful_responses,
            response_success_rate=successful_responses / total_responses if total_responses > 0 else 0,
            average_risk_score=float(risk_stats.avg_risk) if risk_stats.avg_risk else 0,
            highest_risk_score=float(risk_stats.max_risk) if risk_stats.max_risk else 0,
            threat_level_distribution={
                "critical": db.query(SecurityEvent).filter(
                    and_(SecurityEvent.detected_at >= since_date,
                         SecurityEvent.threat_level == ThreatLevel.CRITICAL)
                ).count(),
                "high": db.query(SecurityEvent).filter(
                    and_(SecurityEvent.detected_at >= since_date,
                         SecurityEvent.threat_level == ThreatLevel.HIGH)
                ).count(),
                "medium": db.query(SecurityEvent).filter(
                    and_(SecurityEvent.detected_at >= since_date,
                         SecurityEvent.threat_level == ThreatLevel.MEDIUM)
                ).count(),
                "low": db.query(SecurityEvent).filter(
                    and_(SecurityEvent.detected_at >= since_date,
                         SecurityEvent.threat_level == ThreatLevel.LOW)
                ).count(),
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get security metrics: {str(e)}"
        )


# Background tasks for security monitoring

@router.post("/tasks/correlate-events")
@require_permission("security:update")
async def trigger_event_correlation(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger manual event correlation."""
    background_tasks.add_task(security_service.correlate_events, db)
    return {"message": "Event correlation task started"}


@router.post("/tasks/cleanup-blocks")
@require_permission("security:update")
async def trigger_block_cleanup(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger cleanup of expired IP blocks."""
    background_tasks.add_task(security_service.cleanup_expired_blocks, db)
    return {"message": "Block cleanup task started"}