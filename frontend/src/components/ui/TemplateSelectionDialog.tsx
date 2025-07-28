/**
 * Template Selection Dialog Component
 * 
 * Comprehensive interface for selecting and applying project templates with:
 * - Template browsing by category
 * - Template preview with variable resolution
 * - Variable input and customization
 * - Template application with options
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  Eye,
  Play,
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Calendar,
  Building,
  Code,
  Megaphone,
  UserPlus,
  DollarSign,
  BookOpen,
  Star,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings
} from 'lucide-react';
import { ProjectTemplate, TemplatePreview, TemplateVariables, TemplateApplicationRequest, templatesApi } from '../../services/api/templates';

interface TemplateSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateApplied: (result: any) => void;
  parentFolderId?: number | null;
  targetFolderId?: number | null; // Apply template to existing folder instead of creating new one
  className?: string;
}

interface TemplateSelectionState {
  templates: ProjectTemplate[];
  categories: string[];
  selectedCategory: string | null;
  selectedTemplate: ProjectTemplate | null;
  preview: TemplatePreview | null;
  variables: TemplateVariables;
  searchQuery: string;
  isLoading: boolean;
  isLoadingPreview: boolean;
  isApplying: boolean;
  error: string | null;
  step: 'browse' | 'preview' | 'customize';
  showAdvanced: boolean;
  applicationOptions: {
    applyPermissions: boolean;
    applyTags: boolean;
    createDocuments: boolean;
    customName: string;
  };
}

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  business: Building,
  legal: Star,
  development: Code,
  marketing: Megaphone,
  hr: UserPlus,
  finance: DollarSign,
  research: BookOpen,
  event: Calendar,
  general: Folder
};

const CATEGORY_COLORS: Record<string, string> = {
  business: 'blue',
  legal: 'purple',
  development: 'green',
  marketing: 'pink',
  hr: 'orange',
  finance: 'yellow',
  research: 'indigo',
  event: 'red',
  general: 'gray'
};

export const TemplateSelectionDialog: React.FC<TemplateSelectionDialogProps> = ({
  isOpen,
  onClose,
  onTemplateApplied,
  parentFolderId = null,
  targetFolderId = null,
  className = ''
}) => {
  const [state, setState] = useState<TemplateSelectionState>({
    templates: [],
    categories: [],
    selectedCategory: null,
    selectedTemplate: null,
    preview: null,
    variables: { custom_vars: {} },
    searchQuery: '',
    isLoading: true,
    isLoadingPreview: false,
    isApplying: false,
    error: null,
    step: 'browse',
    showAdvanced: false,
    applicationOptions: {
      applyPermissions: true,
      applyTags: true,
      createDocuments: false,
      customName: ''
    }
  });

  const updateState = useCallback((updates: Partial<TemplateSelectionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Load templates and categories
   */
  const loadTemplates = useCallback(async () => {
    updateState({ isLoading: true, error: null });

    try {
      const response = await templatesApi.listTemplates(state.selectedCategory || undefined);
      updateState({
        templates: response.templates,
        categories: response.categories,
        isLoading: false
      });
    } catch (error) {
      // Failed to load templates
      updateState({
        error: error instanceof Error ? error.message : 'Failed to load templates',
        isLoading: false
      });
    }
  }, [state.selectedCategory, updateState]);

  /**
   * Load template preview
   */
  const loadPreview = useCallback(async (template: ProjectTemplate) => {
    updateState({ isLoadingPreview: true, error: null });

    try {
      // Set default variables
      const defaultVariables: TemplateVariables = {
        project_name: state.applicationOptions.customName || template.name,
        date: new Date().toISOString().split('T')[0],
        year: new Date().getFullYear().toString(),
        month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
        department: '',
        custom_vars: {}
      };

      const preview = await templatesApi.previewTemplate(template.id!, defaultVariables);
      updateState({
        preview,
        variables: defaultVariables,
        isLoadingPreview: false,
        step: 'preview'
      });
    } catch (error) {
      // Failed to load preview
      updateState({
        error: error instanceof Error ? error.message : 'Failed to load preview',
        isLoadingPreview: false
      });
    }
  }, [state.applicationOptions.customName, updateState]);

  /**
   * Apply template
   */
  const applyTemplate = useCallback(async () => {
    if (!state.selectedTemplate) return;

    updateState({ isApplying: true, error: null });

    try {
      const request: TemplateApplicationRequest = {
        template_id: state.selectedTemplate.id!,
        parent_folder_id: targetFolderId ? undefined : parentFolderId,
        target_folder_id: targetFolderId,
        variables: state.variables,
        custom_name: targetFolderId ? undefined : (state.applicationOptions.customName || undefined),
        apply_permissions: state.applicationOptions.applyPermissions,
        apply_tags: state.applicationOptions.applyTags,
        create_documents: state.applicationOptions.createDocuments
      };

      const result = await templatesApi.applyTemplate(request);
      
      if (result.success) {
        onTemplateApplied(result);
        onClose();
      } else {
        updateState({
          error: `Template application failed: ${result.errors.join(', ')}`,
          isApplying: false
        });
      }
    } catch (error) {
      // Failed to apply template
      updateState({
        error: error instanceof Error ? error.message : 'Failed to apply template',
        isApplying: false
      });
    }
  }, [state.selectedTemplate, state.variables, state.applicationOptions, parentFolderId, onTemplateApplied, onClose, updateState]);

  // Load templates on mount and category change
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, loadTemplates]);

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    return state.templates.filter(template =>
      template.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      template.default_tags.some(tag => tag.toLowerCase().includes(state.searchQuery.toLowerCase()))
    );
  }, [state.templates, state.searchQuery]);

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const grouped: Record<string, ProjectTemplate[]> = {};
    filteredTemplates.forEach(template => {
      const category = template.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(template);
    });
    return grouped;
  }, [filteredTemplates]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-6xl w-full max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {state.step === 'browse' && 'Select Project Template'}
              {state.step === 'preview' && 'Template Preview'}
              {state.step === 'customize' && 'Customize Template'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {state.step === 'browse' && 'Choose a template to organize your project'}
              {state.step === 'preview' && `Preview: ${state.selectedTemplate?.name}`}
              {state.step === 'customize' && 'Configure template settings'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={state.isApplying}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-140px)]">
          {/* Step 1: Browse Templates */}
          {state.step === 'browse' && (
            <div className="flex-1 flex">
              {/* Sidebar - Categories */}
              <div className="w-64 border-r border-gray-200 bg-gray-50">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => updateState({ selectedCategory: null })}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        !state.selectedCategory
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      All Templates ({state.templates.length})
                    </button>
                    {state.categories.map(category => {
                      const IconComponent = CATEGORY_ICONS[category] || Folder;
                      const count = state.templates.filter(t => t.category === category).length;
                      return (
                        <button
                          key={category}
                          onClick={() => updateState({ selectedCategory: category })}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center ${
                            state.selectedCategory === category
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <IconComponent className="w-4 h-4 mr-2" />
                          {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Main Content - Templates */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {/* Search */}
                  <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={state.searchQuery}
                      onChange={(e) => updateState({ searchQuery: e.target.value })}
                      placeholder="Search templates..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Loading State */}
                  {state.isLoading && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Loading templates...</span>
                    </div>
                  )}

                  {/* Error State */}
                  {state.error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-red-800">{state.error}</span>
                    </div>
                  )}

                  {/* Templates Grid */}
                  {!state.isLoading && !state.error && (
                    <div className="space-y-6">
                      {Object.entries(groupedTemplates).map(([category, templates]) => (
                        <div key={category}>
                          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                            {React.createElement(CATEGORY_ICONS[category] || Folder, { className: "w-5 h-5 mr-2" })}
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map(template => (
                              <div
                                key={template.id}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => {
                                  updateState({ selectedTemplate: template });
                                  loadPreview(template);
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                                  {template.is_system_template && (
                                    <Star className="w-4 h-4 text-yellow-500" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {template.description}
                                </p>
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-wrap gap-1">
                                    {template.default_tags.slice(0, 2).map(tag => (
                                      <span
                                        key={tag}
                                        className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                    {template.default_tags.length > 2 && (
                                      <span className="text-xs text-gray-500">
                                        +{template.default_tags.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                    Use Template
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {filteredTemplates.length === 0 && !state.isLoading && (
                        <div className="text-center py-12">
                          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                          <p className="text-gray-500">
                            {state.searchQuery
                              ? 'Try adjusting your search terms'
                              : 'No templates available in this category'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview Template */}
          {state.step === 'preview' && state.selectedTemplate && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* Template Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {state.selectedTemplate.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {state.selectedTemplate.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {state.selectedTemplate.default_tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => updateState({ step: 'browse', selectedTemplate: null, preview: null })}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Loading Preview */}
                {state.isLoadingPreview && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading preview...</span>
                  </div>
                )}

                {/* Preview Content */}
                {state.preview && !state.isLoadingPreview && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Folder className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-semibold text-blue-900">
                          {state.preview.estimated_folders}
                        </div>
                        <div className="text-sm text-blue-600">Folders</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-semibold text-green-900">
                          {state.preview.estimated_documents}
                        </div>
                        <div className="text-sm text-green-600">Documents</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <Settings className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <div className="text-2xl font-semibold text-purple-900">
                          {Object.keys(state.preview.resolved_variables).length}
                        </div>
                        <div className="text-sm text-purple-600">Variables</div>
                      </div>
                    </div>

                    {/* Folder Structure Preview */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Folder Structure</h4>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <StructurePreview items={state.preview.preview_structure} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => updateState({ step: 'browse', selectedTemplate: null, preview: null })}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    ← Back to Templates
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => updateState({ step: 'customize' })}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Customize
                    </button>
                    <button
                      onClick={applyTemplate}
                      disabled={state.isApplying}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                    >
                      {state.isApplying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Apply Template
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Customize Template */}
          {state.step === 'customize' && state.selectedTemplate && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="space-y-6">
                  {/* Basic Settings */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Basic Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={state.applicationOptions.customName}
                          onChange={(e) => updateState({
                            applicationOptions: { ...state.applicationOptions, customName: e.target.value }
                          })}
                          placeholder={state.selectedTemplate.name}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Variables */}
                  {state.selectedTemplate.variables.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Template Variables</h4>
                      <div className="space-y-4">
                        {state.selectedTemplate.variables.includes('project_name') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Project Name
                            </label>
                            <input
                              type="text"
                              value={state.variables.project_name || ''}
                              onChange={(e) => updateState({
                                variables: { ...state.variables, project_name: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        )}
                        {state.selectedTemplate.variables.includes('department') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Department
                            </label>
                            <input
                              type="text"
                              value={state.variables.department || ''}
                              onChange={(e) => updateState({
                                variables: { ...state.variables, department: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        )}
                        {/* Add more variable inputs as needed */}
                      </div>
                    </div>
                  )}

                  {/* Application Options */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Application Options</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={state.applicationOptions.applyTags}
                          onChange={(e) => updateState({
                            applicationOptions: { ...state.applicationOptions, applyTags: e.target.checked }
                          })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Apply template tags to folders</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={state.applicationOptions.applyPermissions}
                          onChange={(e) => updateState({
                            applicationOptions: { ...state.applicationOptions, applyPermissions: e.target.checked }
                          })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Apply template permissions</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={state.applicationOptions.createDocuments}
                          onChange={(e) => updateState({
                            applicationOptions: { ...state.applicationOptions, createDocuments: e.target.checked }
                          })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Create placeholder documents</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => updateState({ step: 'preview' })}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    ← Back to Preview
                  </button>
                  <button
                    onClick={applyTemplate}
                    disabled={state.isApplying}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                  >
                    {state.isApplying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Applying Template...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Apply Template
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for structure preview
const StructurePreview: React.FC<{ items: any[], level?: number }> = ({ items, level = 0 }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className={level > 0 ? 'ml-4' : ''}>
      {items.map((item, index) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.has(item.name);
        const Icon = item.type === 'folder' ? Folder : FileText;

        return (
          <div key={index} className="mb-2">
            <div className="flex items-center py-1">
              {hasChildren && (
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className="mr-1 text-gray-400 hover:text-gray-600"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-5" />}
              <Icon className={`w-4 h-4 mr-2 ${item.type === 'folder' ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className="text-sm font-medium text-gray-900">{item.name}</span>
              {item.description && (
                <span className="ml-2 text-xs text-gray-500">- {item.description}</span>
              )}
            </div>
            {hasChildren && isExpanded && (
              <StructurePreview items={item.children} level={level + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TemplateSelectionDialog;