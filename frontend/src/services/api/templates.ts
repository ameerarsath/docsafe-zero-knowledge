/**
 * Template API Service for SecureVault
 * 
 * Provides API methods for project template management including:
 * - Template listing and filtering
 * - Template preview and application
 * - Custom template management
 */

import { apiRequest } from '../api';

export interface TemplateCategory {
  BUSINESS: 'business';
  LEGAL: 'legal';
  DEVELOPMENT: 'development';
  MARKETING: 'marketing';
  HR: 'hr';
  FINANCE: 'finance';
  RESEARCH: 'research';
  EVENT: 'event';
  GENERAL: 'general';
}

export interface FolderStructureItem {
  name: string;
  type: 'folder' | 'document';
  description?: string;
  tags: string[];
  children: FolderStructureItem[];
  document_template?: string;
  permissions?: Record<string, any>;
  metadata: Record<string, any>;
}

export interface ProjectTemplate {
  id?: string;
  name: string;
  description: string;
  category: keyof TemplateCategory;
  icon?: string;
  color?: string;
  structure: FolderStructureItem[];
  default_tags: string[];
  default_permissions?: Record<string, any>;
  default_metadata: Record<string, any>;
  variables: string[];
  allow_customization: boolean;
  is_system_template: boolean;
  created_by?: number;
  created_at?: string;
  updated_by?: number;
  updated_at?: string;
  version: number;
  usage_count: number;
  last_used?: string;
}

export interface TemplateVariables {
  project_name?: string;
  date?: string;
  year?: string;
  month?: string;
  department?: string;
  custom_vars: Record<string, string>;
}

export interface TemplateApplicationRequest {
  template_id: string;
  parent_folder_id?: number | null;
  target_folder_id?: number | null; // Apply template to existing folder
  variables: TemplateVariables;
  custom_name?: string; // For creating new folder (ignored if target_folder_id is provided)
  apply_permissions: boolean;
  apply_tags: boolean;
  create_documents: boolean;
}

export interface TemplateApplicationResult {
  success: boolean;
  root_folder_id?: number;
  created_folders: number[];
  created_documents: number[];
  errors: string[];
  warnings: string[];
}

export interface TemplateListResponse {
  templates: ProjectTemplate[];
  total: number;
  categories: string[];
}

export interface TemplatePreview {
  template: ProjectTemplate;
  preview_structure: any[];
  estimated_folders: number;
  estimated_documents: number;
  resolved_variables: Record<string, string>;
}

export class TemplatesApiService {
  /**
   * List all available templates
   */
  async listTemplates(category?: string, includeCustom: boolean = true): Promise<TemplateListResponse> {
    const params = new URLSearchParams();
    if (category) {
      params.append('category', category);
    }
    params.append('include_custom', includeCustom.toString());

    const response = await apiRequest<TemplateListResponse>('GET', `/api/v1/templates/?${params}`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to load templates');
    }
    
    return response.data!;
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<ProjectTemplate> {
    const response = await apiRequest<ProjectTemplate>('GET', `/api/v1/templates/${templateId}`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to get template');
    }
    
    return response.data!;
  }

  /**
   * Preview what a template will create
   */
  async previewTemplate(templateId: string, variables: TemplateVariables): Promise<TemplatePreview> {
    const response = await apiRequest<TemplatePreview>('POST', `/api/v1/templates/${templateId}/preview`, variables);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to preview template');
    }
    
    return response.data!;
  }

  /**
   * Apply a template to create folder structure
   */
  async applyTemplate(request: TemplateApplicationRequest): Promise<TemplateApplicationResult> {
    const response = await apiRequest<TemplateApplicationResult>(
      'POST', 
      `/api/v1/templates/${request.template_id}/apply`, 
      request
    );
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to apply template');
    }
    
    return response.data!;
  }

  /**
   * Get all template categories
   */
  async getTemplateCategories(): Promise<string[]> {
    const response = await apiRequest<string[]>('GET', '/api/v1/templates/categories/');
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to get categories');
    }
    
    return response.data!;
  }

  /**
   * Create a new custom template
   */
  async createTemplate(templateData: Omit<ProjectTemplate, 'id' | 'created_by' | 'created_at' | 'updated_by' | 'updated_at' | 'version' | 'usage_count' | 'last_used'>): Promise<ProjectTemplate> {
    const response = await apiRequest<ProjectTemplate>('POST', '/api/v1/templates/', templateData);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to create template');
    }
    
    return response.data!;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: string, templateData: Partial<ProjectTemplate>): Promise<ProjectTemplate> {
    const response = await apiRequest<ProjectTemplate>('PUT', `/api/v1/templates/${templateId}`, templateData);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to update template');
    }
    
    return response.data!;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const response = await apiRequest<void>('DELETE', `/api/v1/templates/${templateId}`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to delete template');
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStats(templateId: string): Promise<{
    template_id: string;
    template_name: string;
    usage_count: number;
    last_used?: string;
    created_at?: string;
    version: number;
  }> {
    const response = await apiRequest<any>('GET', `/api/v1/templates/${templateId}/usage-stats`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to get template statistics');
    }
    
    return response.data!;
  }
}

export const templatesApi = new TemplatesApiService();