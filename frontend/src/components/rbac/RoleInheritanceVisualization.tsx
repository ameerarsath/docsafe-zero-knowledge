/**
 * Role Inheritance Visualization Component
 * 
 * Visual representation of role hierarchy and permission inheritance
 * using interactive diagrams and flow charts.
 */

import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ArrowDown,
  Eye,
  Info,
  ShieldCheck,
  User,
  Key
} from 'lucide-react';

import { rbacService } from '../../services/rbacService';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { Role, Permission, SystemPermissionMatrix } from '../../types/rbac';

interface RoleInheritanceVisualizationProps {
  interactive?: boolean;
  showPermissions?: boolean;
  highlightRole?: string;
  onRoleClick?: (role: Role) => void;
}

interface RoleNode {
  role: Role;
  permissions: string[];
  inheritedPermissions: string[];
  children: RoleNode[];
  isExpanded: boolean;
}

const RoleInheritanceVisualization: React.FC<RoleInheritanceVisualizationProps> = ({
  interactive = true,
  showPermissions = true,
  highlightRole,
  onRoleClick
}) => {
  const [matrixData, setMatrixData] = useState<SystemPermissionMatrix | null>(null);
  const [hierarchyTree, setHierarchyTree] = useState<RoleNode[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(highlightRole || null);
  const [viewMode, setViewMode] = useState<'tree' | 'flow' | 'matrix'>('tree');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Load permission matrix data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await rbacService.getPermissionMatrix();
        setMatrixData(data);
        buildHierarchyTree(data);
      } catch (err: any) {
        let errorMessage = 'Failed to load role hierarchy data';
        
        if (err?.status === 403) {
          errorMessage = 'Access denied. You do not have permission to view role hierarchy.';
        } else if (err?.status === 404) {
          errorMessage = 'Role hierarchy API not found. Please contact your administrator.';
        } else if (err?.status === 500) {
          errorMessage = 'Server error occurred while loading role hierarchy. Please try again later.';
        } else if (err?.message?.includes('Network Error')) {
          errorMessage = 'Network connection failed. Please check your connection and try again.';
        }
        
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Build hierarchy tree structure
  const buildHierarchyTree = (data: SystemPermissionMatrix) => {
    const rolesByLevel = data.roles.reduce((acc, role) => {
      if (!acc[role.hierarchy_level]) {
        acc[role.hierarchy_level] = [];
      }
      acc[role.hierarchy_level].push(role);
      return acc;
    }, {} as Record<number, Role[]>);

    const buildNodes = (level: number): RoleNode[] => {
      const rolesAtLevel = rolesByLevel[level] || [];
      return rolesAtLevel.map(role => {
        const directPermissions = data.matrix[role.name] || [];
        const inheritedPermissions = getInheritedPermissions(role, data);
        
        return {
          role,
          permissions: directPermissions,
          inheritedPermissions,
          children: level > 1 ? buildNodes(level - 1) : [],
          isExpanded: true
        };
      });
    };

    // Start from highest level (5) and work down
    const tree = buildNodes(5);
    setHierarchyTree(tree);
  };

  // Get inherited permissions for a role
  const getInheritedPermissions = (role: Role, data: SystemPermissionMatrix): string[] => {
    const inherited = new Set<string>();
    
    // Get permissions from all lower-level roles
    Object.entries(data.hierarchy).forEach(([roleName, level]) => {
      if (level < role.hierarchy_level) {
        const rolePermissions = data.matrix[roleName] || [];
        rolePermissions.forEach(perm => inherited.add(perm));
      }
    });

    return Array.from(inherited);
  };

  // Toggle node expansion
  const toggleExpansion = (roleName: string) => {
    const updateTree = (nodes: RoleNode[]): RoleNode[] => {
      return nodes.map(node => {
        if (node.role.name === roleName) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        return { ...node, children: updateTree(node.children) };
      });
    };
    setHierarchyTree(updateTree(hierarchyTree));
  };

  // Handle role selection
  const handleRoleClick = (role: Role) => {
    setSelectedRole(selectedRole === role.name ? null : role.name);
    if (interactive && onRoleClick) {
      onRoleClick(role);
    }
  };

  // Render tree view
  const renderTreeNode = (node: RoleNode, depth: number = 0) => {
    const isSelected = selectedRole === node.role.name;
    const hasChildren = node.children.length > 0;
    
    return (
      <div key={node.role.name} className="relative">
        {/* Connection Lines */}
        {depth > 0 && (
          <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-b-2 border-gray-300" />
        )}
        
        {/* Role Node */}
        <div
          className={`flex items-center p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${
            isSelected 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          style={{ marginLeft: `${depth * 2}rem` }}
          onClick={() => handleRoleClick(node.role)}
        >
          {/* Expansion Toggle */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpansion(node.role.name);
              }}
              className="mr-2 p-1 rounded hover:bg-gray-100"
            >
              {node.isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          {/* Role Badge */}
          <div className="flex items-center flex-1">
            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium mr-3 ${rbacService.getRoleColor(node.role.hierarchy_level)}`}>
              {node.role.hierarchy_level}
            </span>
            
            <div className="flex-1">
              <div className="flex items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {node.role.display_name}
                </h3>
                {node.role.is_system && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    System
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{node.role.description}</p>
              
              {showPermissions && (
                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Key className="w-3 h-3 mr-1" />
                    {node.permissions.length} direct
                  </span>
                  <span className="flex items-center">
                    <ArrowDown className="w-3 h-3 mr-1" />
                    {node.inheritedPermissions.length} inherited
                  </span>
                  <span className="flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {node.permissions.length + node.inheritedPermissions.length} total
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {interactive && (
            <Eye className="w-5 h-5 text-gray-400" />
          )}
        </div>
        
        {/* Permission Details (if selected) */}
        {isSelected && showPermissions && (
          <div className="ml-8 mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Direct Permissions */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Direct Permissions ({node.permissions.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {node.permissions.map(permission => (
                    <div key={permission} className="text-xs text-gray-600 flex items-center">
                      <Key className="w-3 h-3 mr-1 text-green-500" />
                      {rbacService.formatPermissionName(permission)}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Inherited Permissions */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Inherited Permissions ({node.inheritedPermissions.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {node.inheritedPermissions.map(permission => (
                    <div key={permission} className="text-xs text-gray-600 flex items-center">
                      <ArrowDown className="w-3 h-3 mr-1 text-blue-500" />
                      {rbacService.formatPermissionName(permission)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Child Nodes */}
        {hasChildren && node.isExpanded && (
          <div className="ml-4">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render flow diagram
  const renderFlowDiagram = () => {
    if (!matrixData) return null;
    
    const sortedRoles = matrixData.roles.sort((a, b) => b.hierarchy_level - a.hierarchy_level);
    
    return (
      <div className="space-y-8">
        {sortedRoles.map((role, index) => (
          <div key={role.name} className="flex flex-col items-center">
            {/* Role Card */}
            <div
              className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedRole === role.name 
                  ? 'border-blue-500 shadow-lg' 
                  : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
              }`}
              onClick={() => handleRoleClick(role)}
            >
              <div className="flex items-center">
                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium mr-3 ${rbacService.getRoleColor(role.hierarchy_level)}`}>
                  {role.hierarchy_level}
                </span>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{role.display_name}</h3>
                  <p className="text-sm text-gray-600">{role.description}</p>
                  {showPermissions && (
                    <p className="text-xs text-gray-500 mt-1">
                      {matrixData.matrix[role.name]?.length || 0} permissions
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Inheritance Arrow */}
            {index < sortedRoles.length - 1 && (
              <div className="flex flex-col items-center my-4">
                <ArrowDown className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">inherits from</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">Loading role hierarchy...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Info className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Data</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Inheritance Hierarchy</h1>
          <p className="text-gray-600">Visual representation of role relationships and permission inheritance</p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1 text-sm rounded-md ${
              viewMode === 'tree' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tree View
          </button>
          <button
            onClick={() => setViewMode('flow')}
            className={`px-3 py-1 text-sm rounded-md ${
              viewMode === 'flow' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Flow Diagram
          </button>
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-white shadow rounded-lg p-6">
        {viewMode === 'tree' && (
          <div className="space-y-4">
            {hierarchyTree.map(node => renderTreeNode(node))}
          </div>
        )}
        
        {viewMode === 'flow' && (
          <div className="flex justify-center">
            {renderFlowDiagram()}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Legend</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center">
            <Key className="w-4 h-4 text-green-500 mr-2" />
            <span>Direct permissions</span>
          </div>
          <div className="flex items-center">
            <ArrowDown className="w-4 h-4 text-blue-500 mr-2" />
            <span>Inherited permissions</span>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium bg-red-100 text-red-800 mr-2">5</span>
            <span>Hierarchy level</span>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">System</span>
            <span>System role</span>
          </div>
        </div>
      </div>

      {/* Inheritance Rules */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Inheritance Rules</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Higher-level roles inherit all permissions from lower-level roles</li>
                <li>Direct permissions are explicitly assigned to a role</li>
                <li>Inherited permissions are automatically granted through hierarchy</li>
                <li>System roles cannot be modified or deleted</li>
                <li>Role hierarchy levels: 1 (Viewer) → 2 (User) → 3 (Manager) → 4 (Admin) → 5 (Super Admin)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleInheritanceVisualization;