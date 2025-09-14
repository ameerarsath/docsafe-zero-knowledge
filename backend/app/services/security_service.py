"""
Security monitoring and intrusion detection service for SecureVault.

This service provides:
- Real-time threat detection and analysis
- Suspicious activity pattern matching
- Automated threat response actions
- Security event correlation
- Risk scoring and assessment
"""

import asyncio
import ipaddress
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict, deque
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from ..core.database import get_db
from ..models.security import (
    SecurityEvent, ThreatResponse, SecurityAlert, SuspiciousPattern,
    SecurityMetrics, IPBlocklist, ThreatLevel, EventStatus, ResponseAction
)
from ..models.user import User
from ..models.document import DocumentAccessLog


logger = logging.getLogger(__name__)


@dataclass
class SecurityRule:
    """Security detection rule configuration."""
    name: str
    description: str
    conditions: Dict[str, Any]
    threshold: float
    time_window_minutes: int
    risk_score: float
    threat_level: ThreatLevel
    auto_response: ResponseAction


class SecurityService:
    """Main security monitoring and response service."""
    
    def __init__(self):
        self.detection_rules = self._load_default_rules()
        self.event_cache = defaultdict(lambda: deque(maxlen=1000))  # Per-IP event cache
        self.user_sessions = defaultdict(dict)  # Track user sessions
        self.blocked_ips = set()
        self.rate_limits = defaultdict(lambda: deque(maxlen=100))  # Rate limiting
        
    def _load_default_rules(self) -> List[SecurityRule]:
        """Load default security detection rules."""
        return [
            # Failed login attempts
            SecurityRule(
                name="Brute Force Login",
                description="Multiple failed login attempts from same IP",
                conditions={
                    "event_type": "failed_login",
                    "count_threshold": 5,
                    "unique_users": True
                },
                threshold=5.0,
                time_window_minutes=15,
                risk_score=7.0,
                threat_level=ThreatLevel.HIGH,
                auto_response=ResponseAction.BLOCK_IP
            ),
            
            # Unusual download patterns
            SecurityRule(
                name="Bulk Download",
                description="Unusual volume of document downloads",
                conditions={
                    "event_type": "download",
                    "count_threshold": 20,
                    "size_threshold": 100 * 1024 * 1024  # 100MB
                },
                threshold=20.0,
                time_window_minutes=30,
                risk_score=6.0,
                threat_level=ThreatLevel.MEDIUM,
                auto_response=ResponseAction.RATE_LIMIT
            ),
            
            # Geographic anomalies
            SecurityRule(
                name="Geographic Anomaly",
                description="Login from unusual geographic location",
                conditions={
                    "event_type": "login",
                    "geographic_variance": True,
                    "distance_threshold": 1000  # km
                },
                threshold=1.0,
                time_window_minutes=60,
                risk_score=5.0,
                threat_level=ThreatLevel.MEDIUM,
                auto_response=ResponseAction.REQUIRE_MFA
            ),
            
            # Off-hours access
            SecurityRule(
                name="Off Hours Access",
                description="Access during unusual hours",
                conditions={
                    "event_type": "access",
                    "time_range": {"start": "22:00", "end": "06:00"},
                    "weekend_access": True
                },
                threshold=1.0,
                time_window_minutes=60,
                risk_score=3.0,
                threat_level=ThreatLevel.LOW,
                auto_response=ResponseAction.ALERT
            ),
            
            # Suspicious user agent
            SecurityRule(
                name="Suspicious User Agent",
                description="Known malicious or unusual user agent",
                conditions={
                    "event_type": "request",
                    "user_agent_patterns": [
                        "bot", "crawler", "scanner", "sqlmap", "nikto"
                    ]
                },
                threshold=1.0,
                time_window_minutes=5,
                risk_score=8.0,
                threat_level=ThreatLevel.HIGH,
                auto_response=ResponseAction.BLOCK_IP
            ),
            
            # Rapid API calls
            SecurityRule(
                name="API Abuse",
                description="Rapid API calls indicating automated abuse",
                conditions={
                    "event_type": "api_call",
                    "count_threshold": 100,
                    "endpoints": ["sensitive"]
                },
                threshold=100.0,
                time_window_minutes=5,
                risk_score=7.0,
                threat_level=ThreatLevel.HIGH,
                auto_response=ResponseAction.RATE_LIMIT
            )
        ]

    async def analyze_event(self, event_data: Dict[str, Any], db: Session) -> Optional[SecurityEvent]:
        """Analyze a security event and determine if it's suspicious."""
        try:
            # Extract key information
            ip_address = event_data.get("ip_address")
            user_id = event_data.get("user_id")
            event_type = event_data.get("event_type")
            timestamp = datetime.fromisoformat(event_data.get("timestamp", datetime.utcnow().isoformat()))
            
            # Skip if IP is blocked
            if ip_address and ip_address in self.blocked_ips:
                return None
                
            # Update event cache
            if ip_address:
                self.event_cache[ip_address].append({
                    "timestamp": timestamp,
                    "event_type": event_type,
                    "user_id": user_id,
                    "data": event_data
                })
            
            # Check against detection rules
            security_event = None
            for rule in self.detection_rules:
                if await self._check_rule(rule, event_data, ip_address, db):
                    security_event = await self._create_security_event(rule, event_data, db)
                    
                    # Execute automated response
                    if rule.auto_response != ResponseAction.LOG_ONLY:
                        await self._execute_response(security_event, rule.auto_response, event_data, db)
                    
                    break  # Execute only the first matching rule
            
            return security_event
            
        except Exception as e:
            logger.error(f"Error analyzing security event: {e}")
            return None

    async def _check_rule(self, rule: SecurityRule, event_data: Dict[str, Any], 
                         ip_address: str, db: Session) -> bool:
        """Check if an event matches a security rule."""
        try:
            conditions = rule.conditions
            
            # Check event type
            if conditions.get("event_type") != event_data.get("event_type"):
                return False
            
            # Time window check
            time_window = timedelta(minutes=rule.time_window_minutes)
            since_time = datetime.utcnow() - time_window
            
            # Count-based checks
            if "count_threshold" in conditions:
                count = await self._count_recent_events(
                    ip_address, 
                    conditions["event_type"], 
                    since_time, 
                    conditions.get("unique_users", False),
                    db
                )
                if count < conditions["count_threshold"]:
                    return False
            
            # Size-based checks (for downloads)
            if "size_threshold" in conditions:
                total_size = await self._calculate_download_size(
                    event_data.get("user_id"), 
                    since_time, 
                    db
                )
                if total_size < conditions["size_threshold"]:
                    return False
            
            # Geographic checks
            if conditions.get("geographic_variance"):
                if not await self._check_geographic_anomaly(
                    event_data.get("user_id"), 
                    ip_address, 
                    conditions.get("distance_threshold", 1000),
                    db
                ):
                    return False
            
            # Time-based checks
            if "time_range" in conditions:
                if not self._check_time_range(
                    datetime.utcnow(), 
                    conditions["time_range"]
                ):
                    return False
            
            # User agent checks
            if "user_agent_patterns" in conditions:
                user_agent = event_data.get("user_agent", "").lower()
                if not any(pattern in user_agent for pattern in conditions["user_agent_patterns"]):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking security rule {rule.name}: {e}")
            return False

    async def _count_recent_events(self, ip_address: str, event_type: str, 
                                 since_time: datetime, unique_users: bool, 
                                 db: Session) -> int:
        """FIXED: Count recent events with proper caching and database fallback."""
        try:
            # First check cache for quick lookup
            cache_count = 0
            if ip_address in self.event_cache:
                cache_count = sum(1 for event in self.event_cache[ip_address] 
                                if event["timestamp"] >= since_time and 
                                   event["event_type"] == event_type)
            
            # Always check database for comprehensive count
            query = db.query(DocumentAccessLog).filter(
                and_(
                    DocumentAccessLog.ip_address == ip_address,
                    DocumentAccessLog.accessed_at >= since_time,
                    DocumentAccessLog.action == event_type
                )
            )
            
            if unique_users:
                db_count = query.distinct(DocumentAccessLog.user_id).count()
            else:
                db_count = query.count()
            
            # Return the higher count (cache might miss some events)
            return max(cache_count, db_count)
            
        except Exception as e:
            logger.error(f"Error counting events: {e}")
            return 0

    async def _calculate_download_size(self, user_id: int, since_time: datetime, 
                                     db: Session) -> int:
        """Calculate total download size for a user."""
        if not user_id:
            return 0
            
        # Query recent downloads
        downloads = db.query(DocumentAccessLog).filter(
            and_(
                DocumentAccessLog.user_id == user_id,
                DocumentAccessLog.accessed_at >= since_time,
                DocumentAccessLog.action == "download"
            )
        ).all()
        
        # Sum file sizes (would need to join with documents table)
        total_size = 0
        for download in downloads:
            if download.details and "file_size" in download.details:
                total_size += download.details["file_size"]
        
        return total_size

    async def _check_geographic_anomaly(self, user_id: int, ip_address: str, 
                                      distance_threshold: int, db: Session) -> bool:
        """FIXED: Enhanced geographic anomaly detection with better IP analysis."""
        if not user_id or not ip_address:
            return False
        
        try:
            # Get user's recent login locations
            recent_logins = db.query(DocumentAccessLog).filter(
                and_(
                    DocumentAccessLog.user_id == user_id,
                    DocumentAccessLog.action == "login",
                    DocumentAccessLog.accessed_at >= datetime.utcnow() - timedelta(days=30)
                )
            ).order_by(desc(DocumentAccessLog.accessed_at)).limit(20).all()
            
            if len(recent_logins) < 3:
                return False  # Not enough data for reliable detection
            
            # Enhanced IP-based geographic check
            current_ip_parts = ip_address.split(".")
            if len(current_ip_parts) != 4:
                return True  # Invalid IP format is suspicious
            
            current_ip_prefix = ".".join(current_ip_parts[:3])  # More specific prefix
            current_subnet = ".".join(current_ip_parts[:2])     # Broader subnet
            
            recent_prefixes = set()
            recent_subnets = set()
            
            for login in recent_logins:
                if login.ip_address and "." in login.ip_address:
                    parts = login.ip_address.split(".")
                    if len(parts) == 4:
                        prefix = ".".join(parts[:3])
                        subnet = ".".join(parts[:2])
                        recent_prefixes.add(prefix)
                        recent_subnets.add(subnet)
            
            # Check for anomaly at different levels
            prefix_anomaly = current_ip_prefix not in recent_prefixes
            subnet_anomaly = current_subnet not in recent_subnets
            
            # Flag as anomaly if both prefix and subnet are new
            return prefix_anomaly and subnet_anomaly
            
        except Exception as e:
            logger.error(f"Error checking geographic anomaly: {e}")
            return False

    def _check_time_range(self, timestamp: datetime, time_range: Dict[str, str]) -> bool:
        """Check if timestamp falls within suspicious time range."""
        current_time = timestamp.time()
        start_time = datetime.strptime(time_range["start"], "%H:%M").time()
        end_time = datetime.strptime(time_range["end"], "%H:%M").time()
        
        # Handle overnight ranges (e.g., 22:00 to 06:00)
        if start_time > end_time:
            return current_time >= start_time or current_time <= end_time
        else:
            return start_time <= current_time <= end_time

    async def _create_security_event(self, rule: SecurityRule, event_data: Dict[str, Any], 
                                   db: Session) -> SecurityEvent:
        """Create a security event record."""
        # Calculate risk score with modifiers
        base_risk = rule.risk_score
        risk_modifiers = 0
        
        # Increase risk for repeat offenders
        ip_address = event_data.get("ip_address")
        if ip_address:
            recent_events = db.query(SecurityEvent).filter(
                and_(
                    SecurityEvent.source_ip == ip_address,
                    SecurityEvent.detected_at >= datetime.utcnow() - timedelta(hours=24)
                )
            ).count()
            risk_modifiers += min(recent_events * 0.5, 3.0)
        
        final_risk_score = min(base_risk + risk_modifiers, 10.0)
        
        # Create security event
        security_event = SecurityEvent(
            event_type=rule.name.lower().replace(" ", "_"),
            threat_level=rule.threat_level,
            title=f"{rule.name} Detected",
            description=f"{rule.description}. Risk score: {final_risk_score}",
            source_ip=ip_address,
            user_id=event_data.get("user_id"),
            document_id=event_data.get("document_id"),
            risk_score=final_risk_score,
            confidence=0.9,  # High confidence for rule-based detection
            detection_method="rule_based",
            detection_rule=rule.name,
            user_agent=event_data.get("user_agent"),
            session_id=event_data.get("session_id"),
            additional_data=event_data,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow()
        )
        
        db.add(security_event)
        db.commit()
        db.refresh(security_event)
        
        logger.warning(f"Security event created: {rule.name} from IP {ip_address}, risk: {final_risk_score}")
        return security_event

    async def _execute_response(self, security_event: SecurityEvent, action: ResponseAction, 
                              event_data: Dict[str, Any], db: Session):
        """Execute automated threat response."""
        try:
            target_value = None
            target_type = None
            duration_minutes = None
            success = True
            error_message = None
            
            if action == ResponseAction.BLOCK_IP:
                target_type = "ip"
                target_value = security_event.source_ip
                duration_minutes = self._get_block_duration(security_event.threat_level)
                success = await self._block_ip(target_value, security_event.event_id, duration_minutes, db)
                
            elif action == ResponseAction.DISABLE_USER:
                target_type = "user"
                target_value = str(security_event.user_id)
                success = await self._disable_user(security_event.user_id, security_event.event_id, db)
                
            elif action == ResponseAction.RATE_LIMIT:
                target_type = "ip"
                target_value = security_event.source_ip
                duration_minutes = 60  # 1 hour rate limit
                success = await self._apply_rate_limit(target_value, security_event.event_id)
                
            elif action == ResponseAction.REQUIRE_MFA:
                target_type = "user"
                target_value = str(security_event.user_id)
                success = await self._require_mfa(security_event.user_id, db)
                
            elif action == ResponseAction.ALERT:
                success = await self._send_security_alert(security_event, db)
            
            # Record the response
            if target_value:
                response = ThreatResponse(
                    event_id=security_event.event_id,
                    action=action,
                    target_type=target_type,
                    target_value=target_value,
                    duration_minutes=duration_minutes,
                    success=success,
                    error_message=error_message
                )
                
                db.add(response)
                db.commit()
                
                logger.info(f"Threat response executed: {action.value} on {target_value}")
                
        except Exception as e:
            logger.error(f"Error executing threat response: {e}")

    def _get_block_duration(self, threat_level: ThreatLevel) -> int:
        """Get block duration based on threat level."""
        duration_map = {
            ThreatLevel.LOW: 30,      # 30 minutes
            ThreatLevel.MEDIUM: 120,  # 2 hours
            ThreatLevel.HIGH: 1440,   # 24 hours
            ThreatLevel.CRITICAL: 10080  # 7 days
        }
        return duration_map.get(threat_level, 60)

    async def _block_ip(self, ip_address: str, event_id: str, duration_minutes: int, 
                       db: Session) -> bool:
        """Block an IP address."""
        try:
            # Add to blocklist
            expires_at = datetime.utcnow() + timedelta(minutes=duration_minutes)
            
            # Check if already blocked
            existing_block = db.query(IPBlocklist).filter(
                IPBlocklist.ip_address == ip_address
            ).first()
            
            if existing_block:
                # Extend the block
                if existing_block.expires_at:
                    existing_block.expires_at = max(existing_block.expires_at, expires_at)
                existing_block.block_count += 1
                existing_block.last_attempt = datetime.utcnow()
            else:
                # Create new block
                block_entry = IPBlocklist(
                    ip_address=ip_address,
                    reason=f"Automated block due to security event {event_id}",
                    blocked_by="system",
                    expires_at=expires_at,
                    event_id=event_id
                )
                db.add(block_entry)
            
            # Add to runtime blocklist
            self.blocked_ips.add(ip_address)
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error blocking IP {ip_address}: {e}")
            return False

    async def _disable_user(self, user_id: int, event_id: str, db: Session) -> bool:
        """Disable a user account."""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.is_active = False
                # Add audit trail
                db.commit()
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error disabling user {user_id}: {e}")
            return False

    async def _apply_rate_limit(self, ip_address: str, event_id: str) -> bool:
        """Apply rate limiting to an IP address."""
        try:
            # Add to rate limit cache
            current_time = time.time()
            self.rate_limits[ip_address].append(current_time)
            return True
            
        except Exception as e:
            logger.error(f"Error applying rate limit to {ip_address}: {e}")
            return False

    async def _require_mfa(self, user_id: int, db: Session) -> bool:
        """Require MFA for user's next login."""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                # Set flag to require MFA verification
                # This would need to be implemented in the authentication flow
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error requiring MFA for user {user_id}: {e}")
            return False

    async def _send_security_alert(self, security_event: SecurityEvent, db: Session) -> bool:
        """Send security alert to administrators."""
        try:
            # Create alert record
            alert = SecurityAlert(
                event_id=security_event.event_id,
                alert_type="dashboard",
                recipient="security_team",
                subject=f"Security Alert: {security_event.title}",
                message=f"A {security_event.threat_level.value} threat has been detected:\n\n"
                       f"Event: {security_event.title}\n"
                       f"Description: {security_event.description}\n"
                       f"Source IP: {security_event.source_ip}\n"
                       f"Risk Score: {security_event.risk_score}\n"
                       f"Time: {security_event.detected_at}",
                sent_at=datetime.utcnow(),
                delivery_status="sent"
            )
            
            db.add(alert)
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error sending security alert: {e}")
            return False

    def is_ip_blocked(self, ip_address: str, db: Session) -> bool:
        """Check if an IP address is currently blocked."""
        # Check runtime cache first
        if ip_address in self.blocked_ips:
            return True
        
        # Check database
        block = db.query(IPBlocklist).filter(
            and_(
                IPBlocklist.ip_address == ip_address,
                or_(
                    IPBlocklist.is_permanent == True,
                    IPBlocklist.expires_at > datetime.utcnow()
                ),
                IPBlocklist.manually_removed == False
            )
        ).first()
        
        if block:
            self.blocked_ips.add(ip_address)
            return True
        
        return False

    def is_rate_limited(self, ip_address: str, max_requests: int = 100, 
                       window_minutes: int = 5) -> bool:
        """FIXED: Enhanced rate limiting with adaptive thresholds."""
        if ip_address not in self.rate_limits:
            return False
        
        current_time = time.time()
        window_start = current_time - (window_minutes * 60)
        
        # Clean old entries
        while (self.rate_limits[ip_address] and 
               self.rate_limits[ip_address][0] < window_start):
            self.rate_limits[ip_address].popleft()
        
        request_count = len(self.rate_limits[ip_address])
        
        # Adaptive thresholds based on IP reputation
        if ip_address in self.blocked_ips:
            max_requests = max_requests // 4  # Stricter for previously blocked IPs
        elif self._is_suspicious_ip(ip_address):
            max_requests = max_requests // 2  # Stricter for suspicious IPs
        
        return request_count >= max_requests
    
    def _is_suspicious_ip(self, ip_address: str) -> bool:
        """FIXED: Check if IP has suspicious characteristics."""
        try:
            # Check if IP is in private ranges (might be suspicious for external access)
            parts = ip_address.split(".")
            if len(parts) != 4:
                return True
            
            first_octet = int(parts[0])
            second_octet = int(parts[1])
            
            # Known suspicious ranges (simplified)
            suspicious_ranges = [
                (1, 1),      # 1.1.x.x (often used by bots)
                (8, 8),      # 8.8.x.x (Google DNS, suspicious for direct access)
                (127, 0),    # 127.x.x.x (localhost)
            ]
            
            return (first_octet, second_octet) in suspicious_ranges
            
        except (ValueError, IndexError):
            return True  # Invalid IP format is suspicious

    async def correlate_events(self, db: Session):
        """Correlate related security events."""
        try:
            # Find events from the last hour that might be related
            since_time = datetime.utcnow() - timedelta(hours=1)
            recent_events = db.query(SecurityEvent).filter(
                and_(
                    SecurityEvent.detected_at >= since_time,
                    SecurityEvent.correlation_id.is_(None)
                )
            ).all()
            
            # Group by IP address
            ip_groups = defaultdict(list)
            for event in recent_events:
                if event.source_ip:
                    ip_groups[event.source_ip].append(event)
            
            # Correlate events from same IP
            for ip_address, events in ip_groups.items():
                if len(events) > 1:
                    correlation_id = f"CORR-{int(time.time())}-{ip_address.replace('.', '-')}"
                    
                    for event in events:
                        event.correlation_id = correlation_id
                        # Update related events list
                        event.related_events = [e.event_id for e in events if e != event]
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error correlating events: {e}")

    async def cleanup_expired_blocks(self, db: Session):
        """Clean up expired IP blocks."""
        try:
            # Find expired blocks
            expired_blocks = db.query(IPBlocklist).filter(
                and_(
                    IPBlocklist.expires_at <= datetime.utcnow(),
                    IPBlocklist.is_permanent == False,
                    IPBlocklist.manually_removed == False
                )
            ).all()
            
            # Remove from runtime cache
            for block in expired_blocks:
                if block.ip_address in self.blocked_ips:
                    self.blocked_ips.remove(block.ip_address)
            
            # Mark as removed in database
            for block in expired_blocks:
                block.manually_removed = True
                block.removed_at = datetime.utcnow()
                block.removal_reason = "Automatic expiration"
            
            db.commit()
            
            if expired_blocks:
                logger.info(f"Cleaned up {len(expired_blocks)} expired IP blocks")
                
        except Exception as e:
            logger.error(f"Error cleaning up expired blocks: {e}")


# Global security service instance
security_service = SecurityService()