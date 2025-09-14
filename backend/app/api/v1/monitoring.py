"""
FIXED: System monitoring endpoint with CPU, memory, storage tracking
"""

import psutil
import asyncio
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from ...core.database import get_db
from ...core.security import get_current_user
from ...core.rbac import require_permission
from ...models.user import User
from ...models.security import SecurityEvent
from ...models.document import DocumentAccessLog

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

@router.get("/system")
@require_permission("security:read")
async def get_system_metrics(current_user: User = Depends(get_current_user)):
    """Get real-time system metrics."""
    try:
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        
        # Network metrics
        network = psutil.net_io_counters()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu": {
                "usage_percent": cpu_percent,
                "core_count": cpu_count,
                "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
            },
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "usage_percent": memory.percent
            },
            "storage": {
                "total_gb": round(disk.total / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "usage_percent": round((disk.used / disk.total) * 100, 2)
            },
            "network": {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system metrics: {str(e)}")

@router.get("/user-activity")
@require_permission("security:read")
async def get_user_activity(
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user activity logs with suspicious behavior detection."""
    try:
        since_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Get recent user activities
        activities = db.query(DocumentAccessLog).filter(
            DocumentAccessLog.accessed_at >= since_time
        ).order_by(desc(DocumentAccessLog.accessed_at)).limit(limit).all()
        
        # Analyze for suspicious patterns
        ip_activity = {}
        user_activity = {}
        
        for activity in activities:
            # Track by IP
            ip = activity.ip_address or "unknown"
            if ip not in ip_activity:
                ip_activity[ip] = {"count": 0, "users": set(), "actions": []}
            ip_activity[ip]["count"] += 1
            if activity.user_id:
                ip_activity[ip]["users"].add(activity.user_id)
            ip_activity[ip]["actions"].append(activity.action)
            
            # Track by user
            if activity.user_id:
                if activity.user_id not in user_activity:
                    user_activity[activity.user_id] = {"count": 0, "ips": set(), "actions": []}
                user_activity[activity.user_id]["count"] += 1
                user_activity[activity.user_id]["ips"].add(ip)
                user_activity[activity.user_id]["actions"].append(activity.action)
        
        # Detect anomalies
        suspicious_ips = []
        suspicious_users = []
        
        for ip, data in ip_activity.items():
            if data["count"] > 100 or len(data["users"]) > 5:  # High activity or multiple users
                suspicious_ips.append({
                    "ip": ip,
                    "activity_count": data["count"],
                    "unique_users": len(data["users"]),
                    "reason": "high_activity" if data["count"] > 100 else "multiple_users"
                })
        
        for user_id, data in user_activity.items():
            if len(data["ips"]) > 3:  # Multiple IPs
                suspicious_users.append({
                    "user_id": user_id,
                    "activity_count": data["count"],
                    "unique_ips": len(data["ips"]),
                    "reason": "multiple_locations"
                })
        
        return {
            "period_hours": hours,
            "total_activities": len(activities),
            "activities": [
                {
                    "id": activity.id,
                    "user_id": activity.user_id,
                    "action": activity.action,
                    "document_id": activity.document_id,
                    "ip_address": activity.ip_address,
                    "user_agent": activity.user_agent,
                    "accessed_at": activity.accessed_at.isoformat(),
                    "details": activity.details
                }
                for activity in activities[:50]  # Limit response size
            ],
            "suspicious_activity": {
                "suspicious_ips": suspicious_ips,
                "suspicious_users": suspicious_users
            },
            "summary": {
                "unique_ips": len(ip_activity),
                "unique_users": len(user_activity),
                "most_active_ip": max(ip_activity.items(), key=lambda x: x[1]["count"])[0] if ip_activity else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user activity: {str(e)}")

@router.get("/alerts")
@require_permission("security:read")
async def get_security_alerts(
    severity: str = Query("all", regex="^(all|low|medium|high|critical)$"),
    hours: int = Query(24, ge=1, le=168),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get security alerts with real-time threat detection."""
    try:
        since_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Get security events
        query = db.query(SecurityEvent).filter(SecurityEvent.detected_at >= since_time)
        
        if severity != "all":
            query = query.filter(SecurityEvent.threat_level == severity.upper())
        
        events = query.order_by(desc(SecurityEvent.detected_at)).limit(100).all()
        
        # Generate alerts
        alerts = []
        for event in events:
            alert = {
                "id": event.id,
                "event_id": event.event_id,
                "title": event.title,
                "description": event.description,
                "severity": event.threat_level.value.lower(),
                "risk_score": event.risk_score,
                "source_ip": event.source_ip,
                "user_id": event.user_id,
                "detected_at": event.detected_at.isoformat(),
                "status": event.status.value.lower(),
                "auto_resolved": event.resolved_at is not None
            }
            alerts.append(alert)
        
        # System health alerts
        system_alerts = await _check_system_health()
        
        return {
            "period_hours": hours,
            "security_alerts": alerts,
            "system_alerts": system_alerts,
            "summary": {
                "total_alerts": len(alerts),
                "critical_count": len([a for a in alerts if a["severity"] == "critical"]),
                "high_count": len([a for a in alerts if a["severity"] == "high"]),
                "unresolved_count": len([a for a in alerts if not a["auto_resolved"]])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")

async def _check_system_health():
    """Check system health and generate alerts."""
    alerts = []
    
    try:
        # CPU check
        cpu_percent = psutil.cpu_percent(interval=1)
        if cpu_percent > 90:
            alerts.append({
                "type": "system",
                "severity": "high",
                "message": f"High CPU usage: {cpu_percent}%",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Memory check
        memory = psutil.virtual_memory()
        if memory.percent > 85:
            alerts.append({
                "type": "system",
                "severity": "medium",
                "message": f"High memory usage: {memory.percent}%",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Disk check
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        if disk_percent > 90:
            alerts.append({
                "type": "system",
                "severity": "high",
                "message": f"Low disk space: {disk_percent:.1f}% used",
                "timestamp": datetime.utcnow().isoformat()
            })
    except Exception as e:
        alerts.append({
            "type": "system",
            "severity": "critical",
            "message": f"System monitoring error: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    return alerts