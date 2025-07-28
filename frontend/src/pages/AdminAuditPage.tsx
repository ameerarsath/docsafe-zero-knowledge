/**
 * Admin Audit and Compliance Page Component for SecureVault
 * 
 * Comprehensive audit and compliance management page providing:
 * - Activity log viewing with advanced filtering
 * - Compliance report generation and export
 * - Audit trail analysis and search
 * - Compliance dashboard and metrics
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import { AuditComplianceInterface } from '../components/admin';
import { FileText, BarChart3 } from 'lucide-react';

export default function AdminAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'logs');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'logs') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams);
  };

  const tabs = [
    { id: 'logs', name: 'Audit Logs', icon: FileText, description: 'View system activity logs' },
    { id: 'reports', name: 'Security Reports', icon: BarChart3, description: 'Generate compliance reports' }
  ];

  return (
    <RequireAuth>
      <AppLayout>
        <div className="container mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Audit & Compliance
            </h1>
            <p className="text-gray-600">
              Monitor system activity and generate compliance reports
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`mr-2 h-5 w-5 ${
                      activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {activeTab === 'logs' && (
              <AuditComplianceInterface 
                refreshInterval={30000}
                defaultFilters={{}}
                showReportsSection={false}
              />
            )}
            {activeTab === 'reports' && (
              <AuditComplianceInterface 
                refreshInterval={30000}
                defaultFilters={{}}
                showReportsSection={true}
              />
            )}
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}