"""
Security monitoring models for SecureVault.

This module defines SQLAlchemy models for:
- Security events and intrusion detection
- Threat response and automated actions
- Security alerts and notifications
- Suspicious activity tracking
- Security event correlation
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey,
    JSON, Float, Index, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from ..core.database import Base


class ThreatLevel(enum.Enum):
    """Threat severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EventStatus(enum.Enum):
    """Security event status."""
    ACTIVE = "active"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


class ResponseAction(enum.Enum):
    """Automated response actions."""
    LOG_ONLY = "log_only"
    ALERT = "alert"
    RATE_LIMIT = "rate_limit"
    BLOCK_IP = "block_ip"
    DISABLE_USER = "disable_user"
    REQUIRE_MFA = "require_mfa"


class SecurityEvent(Base):
    """Security events and incidents."""
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False, index=True)
    
    # Event classification
    event_type = Column(String(100), nullable=False, index=True)  # 'failed_login', 'suspicious_download', etc.
    threat_level = Column(Enum(ThreatLevel), nullable=False, index=True)
    status = Column(Enum(EventStatus), default=EventStatus.ACTIVE, nullable=False, index=True)
    
    # Event details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    source_ip = Column(String(45), nullable=True, index=True)  # IPv4/IPv6
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True, index=True)
    
    # Risk assessment
    risk_score = Column(Float, nullable=False, default=0.0, index=True)  # 0.0 - 10.0
    confidence = Column(Float, nullable=False, default=1.0)  # 0.0 - 1.0
    
    # Detection details
    detection_method = Column(String(100), nullable=False)  # 'rule_based', 'ml_anomaly', 'pattern_match'
    detection_rule = Column(String(255), nullable=True)
    
    # Context and metadata
    user_agent = Column(String(500), nullable=True)
    session_id = Column(String(255), nullable=True)
    additional_data = Column(JSON, nullable=True)
    
    # Correlation
    related_events = Column(JSON, nullable=True)  # List of related event IDs
    correlation_id = Column(String(36), nullable=True, index=True)
    
    # Timing
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    first_seen = Column(DateTime(timezone=True), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    
    # Resolution
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
    responses = relationship("ThreatResponse", back_populates="security_event")
    alerts = relationship("SecurityAlert", back_populates="security_event")

    # Indexes
    __table_args__ = (
        Index('idx_security_events_type_level', 'event_type', 'threat_level'),
        Index('idx_security_events_detected', 'detected_at'),
        Index('idx_security_events_user_ip', 'user_id', 'source_ip'),
        Index('idx_security_events_correlation', 'correlation_id'),
    )

    def __repr__(self):
        return f"<SecurityEvent(event_id='{self.event_id}', type='{self.event_type}', level='{self.threat_level.value}')>"


class ThreatResponse(Base):
    """Automated threat response actions."""
    __tablename__ = "threat_responses"

    id = Column(Integer, primary_key=True, index=True)
    response_id = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False, index=True)
    
    # Associated security event
    event_id = Column(String(36), ForeignKey("security_events.event_id"), nullable=False, index=True)
    
    # Response details
    action = Column(Enum(ResponseAction), nullable=False, index=True)
    target_type = Column(String(50), nullable=False)  # 'user', 'ip', 'session'
    target_value = Column(String(255), nullable=False)
    
    # Action parameters
    duration_minutes = Column(Integer, nullable=True)  # For temporary actions
    parameters = Column(JSON, nullable=True)
    
    # Execution
    executed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    executed_by = Column(String(100), nullable=False, default="system")  # 'system' or user ID
    success = Column(Boolean, nullable=False, default=True)
    error_message = Column(Text, nullable=True)
    
    # Reversal
    reversed_at = Column(DateTime(timezone=True), nullable=True)
    reversed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reversal_reason = Column(String(255), nullable=True)
    
    # Relationships
    security_event = relationship("SecurityEvent", back_populates="responses")
    reverser = relationship("User")

    # Indexes
    __table_args__ = (
        Index('idx_threat_responses_action', 'action'),
        Index('idx_threat_responses_target', 'target_type', 'target_value'),
        Index('idx_threat_responses_executed', 'executed_at'),
    )

    def __repr__(self):
        return f"<ThreatResponse(response_id='{self.response_id}', action='{self.action.value}', target='{self.target_value}')>"


class SecurityAlert(Base):
    """Security alerts and notifications."""
    __tablename__ = "security_alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False, index=True)
    
    # Associated security event
    event_id = Column(String(36), ForeignKey("security_events.event_id"), nullable=False, index=True)
    
    # Alert details
    alert_type = Column(String(100), nullable=False, index=True)  # 'email', 'sms', 'webhook', 'dashboard'
    recipient = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Delivery
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    delivery_status = Column(String(50), nullable=False, default="pending")  # 'pending', 'sent', 'delivered', 'failed'
    delivery_error = Column(Text, nullable=True)
    
    # User interaction
    viewed_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    security_event = relationship("SecurityEvent", back_populates="alerts")
    acknowledger = relationship("User")

    # Indexes
    __table_args__ = (
        Index('idx_security_alerts_type', 'alert_type'),
        Index('idx_security_alerts_status', 'delivery_status'),
        Index('idx_security_alerts_sent', 'sent_at'),
    )

    def __repr__(self):
        return f"<SecurityAlert(alert_id='{self.alert_id}', type='{self.alert_type}', recipient='{self.recipient}')>"


class SuspiciousPattern(Base):
    """Suspicious activity patterns and rules."""
    __tablename__ = "suspicious_patterns"

    id = Column(Integer, primary_key=True, index=True)
    pattern_id = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False, index=True)
    
    # Pattern definition
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    pattern_type = Column(String(100), nullable=False, index=True)  # 'frequency', 'sequence', 'anomaly'
    
    # Detection criteria
    conditions = Column(JSON, nullable=False)  # Pattern matching conditions
    threshold = Column(Float, nullable=False)
    time_window_minutes = Column(Integer, nullable=False)
    
    # Scoring
    base_risk_score = Column(Float, nullable=False, default=5.0)
    threat_level = Column(Enum(ThreatLevel), nullable=False, default=ThreatLevel.MEDIUM)
    
    # Response configuration
    auto_response = Column(Enum(ResponseAction), nullable=False, default=ResponseAction.LOG_ONLY)
    response_parameters = Column(JSON, nullable=True)
    
    # Lifecycle
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Statistics
    detection_count = Column(Integer, default=0, nullable=False)
    last_detection = Column(DateTime(timezone=True), nullable=True)
    false_positive_count = Column(Integer, default=0, nullable=False)
    
    # Relationships
    creator = relationship("User")

    # Indexes
    __table_args__ = (
        Index('idx_suspicious_patterns_type', 'pattern_type'),
        Index('idx_suspicious_patterns_active', 'is_active'),
        Index('idx_suspicious_patterns_level', 'threat_level'),
    )

    def __repr__(self):
        return f"<SuspiciousPattern(pattern_id='{self.pattern_id}', name='{self.name}', active={self.is_active})>"


class SecurityMetrics(Base):
    """Security metrics and statistics."""
    __tablename__ = "security_metrics"

    id = Column(Integer, primary_key=True, index=True)
    metric_date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Event counts
    total_events = Column(Integer, default=0, nullable=False)
    critical_events = Column(Integer, default=0, nullable=False)
    high_events = Column(Integer, default=0, nullable=False)
    medium_events = Column(Integer, default=0, nullable=False)
    low_events = Column(Integer, default=0, nullable=False)
    
    # Response counts
    automated_responses = Column(Integer, default=0, nullable=False)
    blocked_ips = Column(Integer, default=0, nullable=False)
    disabled_users = Column(Integer, default=0, nullable=False)
    
    # Performance metrics
    average_detection_time_seconds = Column(Float, nullable=True)
    average_response_time_seconds = Column(Float, nullable=True)
    false_positive_rate = Column(Float, nullable=True)
    
    # Risk metrics
    highest_risk_score = Column(Float, nullable=True)
    average_risk_score = Column(Float, nullable=True)
    unique_threat_sources = Column(Integer, default=0, nullable=False)
    
    # Additional statistics
    metrics_data = Column(JSON, nullable=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_security_metrics_date', 'metric_date'),
    )

    def __repr__(self):
        return f"<SecurityMetrics(date='{self.metric_date}', total_events={self.total_events})>"


class IPBlocklist(Base):
    """Blocked IP addresses."""
    __tablename__ = "ip_blocklist"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(45), nullable=False, unique=True, index=True)  # IPv4/IPv6
    
    # Block details
    reason = Column(String(255), nullable=False)
    blocked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    blocked_by = Column(String(100), nullable=False)  # 'system' or user ID
    
    # Duration
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    is_permanent = Column(Boolean, default=False, nullable=False)
    
    # Statistics
    block_count = Column(Integer, default=1, nullable=False)
    last_attempt = Column(DateTime(timezone=True), nullable=True)
    
    # Associated event
    event_id = Column(String(36), ForeignKey("security_events.event_id"), nullable=True)
    
    # Manual override
    manually_removed = Column(Boolean, default=False, nullable=False)
    removed_at = Column(DateTime(timezone=True), nullable=True)
    removed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    removal_reason = Column(String(255), nullable=True)
    
    # Relationships
    security_event = relationship("SecurityEvent")
    remover = relationship("User")

    # Indexes
    __table_args__ = (
        Index('idx_ip_blocklist_expires', 'expires_at'),
        Index('idx_ip_blocklist_permanent', 'is_permanent'),
    )

    def __repr__(self):
        return f"<IPBlocklist(ip='{self.ip_address}', permanent={self.is_permanent})>"