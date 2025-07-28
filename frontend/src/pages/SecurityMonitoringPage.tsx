/**
 * Security Monitoring Page
 * 
 * Real-time security event monitoring, threat analysis,
 * and incident response management.
 */

import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useSecurity } from '../hooks/useSecurity';
import { 
  Activity, 
  AlertTriangle, 
  Shield, 
  Eye,
  TrendingUp,
  Clock,
  Globe,
  Ban,
  RefreshCw,
  Filter,
  Download,
  Play,
  Pause,
  Settings
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  timestamp: Date;
  details?: any;
}

export default function SecurityMonitoringPage() {
  const security = useSecurity();
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);
  const [eventFilter, setEventFilter] = useState<'all' | 'high' | 'critical'>('all');
  const [mockEvents, setMockEvents] = useState<SecurityEvent[]>([]);

  // Generate mock security events for demonstration
  useEffect(() => {
    const generateMockEvent = (): SecurityEvent => {
      const types = ['failed_login', 'suspicious_access', 'brute_force', 'csp_violation', 'api_abuse'];
      const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
      const sources = ['192.168.1.100', '10.0.0.45', '172.16.0.23', '203.0.113.45', '198.51.100.78'];
      
      const type = types[Math.floor(Math.random() * types.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      
      const messages = {
        failed_login: `Failed login attempt detected from ${source}`,
        suspicious_access: `Suspicious access pattern detected from ${source}`,
        brute_force: `Brute force attack detected from ${source}`,
        csp_violation: `Content Security Policy violation from ${source}`,
        api_abuse: `API abuse detected from ${source}`
      };
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        type,
        severity,
        message: messages[type as keyof typeof messages],
        source,
        timestamp: new Date(),
        details: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          endpoint: '/api/v1/auth/login',
          riskScore: Math.floor(Math.random() * 10) + 1
        }
      };
    };

    // Add initial events
    const initialEvents = Array.from({ length: 15 }, generateMockEvent);
    setMockEvents(initialEvents);

    // Simulate real-time events
    const interval = setInterval(() => {
      if (isRealTimeActive && Math.random() > 0.7) { // 30% chance every 3 seconds
        setMockEvents(prev => [generateMockEvent(), ...prev.slice(0, 49)]); // Keep last 50 events
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isRealTimeActive]);

  const filteredEvents = mockEvents.filter(event => {
    if (eventFilter === 'all') return true;
    return event.severity === eventFilter;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'medium': return <Eye className="w-4 h-4 text-yellow-600" />;
      case 'low': return <Activity className="w-4 h-4 text-blue-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  // Calculate statistics
  const stats = {
    total: mockEvents.length,
    critical: mockEvents.filter(e => e.severity === 'critical').length,
    high: mockEvents.filter(e => e.severity === 'high').length,
    medium: mockEvents.filter(e => e.severity === 'medium').length,
    low: mockEvents.filter(e => e.severity === 'low').length,
  };

  return (
    <AppLayout 
      title="Security Monitoring" 
      subtitle="Real-time security event monitoring and threat analysis"
    >
      <div className="space-y-6">
        {/* Control Panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsRealTimeActive(!isRealTimeActive)}
                  className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isRealTimeActive 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {isRealTimeActive ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Monitoring
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Monitoring
                    </>
                  )}
                </button>
                
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  isRealTimeActive ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isRealTimeActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm text-gray-700">
                    {isRealTimeActive ? 'Live' : 'Paused'}
                  </span>
                </div>
              </div>

              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Events</option>
                <option value="critical">Critical Only</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filter
              </button>
              
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>

              <button className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Events</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.critical}</div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.high}</div>
                <div className="text-sm text-gray-600">High</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Eye className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.medium}</div>
                <div className="text-sm text-gray-600">Medium</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.low}</div>
                <div className="text-sm text-gray-600">Low</div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Events Feed */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Security Events</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
                <RefreshCw className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No security events match the current filter.</p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getSeverityIcon(event.severity)}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(event.severity)}`}>
                            {event.severity.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">{event.type.replace('_', ' ').toUpperCase()}</span>
                        </div>
                        
                        <p className="text-sm text-gray-900 mb-2">{event.message}</p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Globe className="w-3 h-3 mr-1" />
                            {event.source}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {event.timestamp.toLocaleTimeString()}
                          </span>
                          {event.details?.riskScore && (
                            <span className="flex items-center">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Risk: {event.details.riskScore}/10
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-red-400 hover:text-red-600">
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Additional Security Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Threat Sources */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Threat Sources</h3>
            <div className="space-y-3">
              {Array.from(new Set(mockEvents.slice(0, 10).map(e => e.source))).slice(0, 5).map((source, index) => {
                const count = mockEvents.filter(e => e.source === source).length;
                return (
                  <div key={source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-red-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{source}</div>
                        <div className="text-sm text-gray-500">{count} events</div>
                      </div>
                    </div>
                    <button className="p-1 text-red-400 hover:text-red-600">
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Real-time Monitoring</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isRealTimeActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {isRealTimeActive ? 'Active' : 'Paused'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Threat Detection</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Enabled
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto-Response</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Enabled
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Event Correlation</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Enabled
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}