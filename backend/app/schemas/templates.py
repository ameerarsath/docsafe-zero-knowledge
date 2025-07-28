"""
Template Schemas for SecureVault

Handles project template definitions, folder structures, and template management.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum


class TemplateCategory(str, Enum):
    """Template categories for organization"""
    BUSINESS = "business"
    LEGAL = "legal"
    DEVELOPMENT = "development"
    MARKETING = "marketing"
    HR = "hr"
    FINANCE = "finance"
    RESEARCH = "research"
    EVENT = "event"
    GENERAL = "general"


class FolderStructureItem(BaseModel):
    """Individual folder or document in template structure"""
    name: str = Field(..., description="Name of the folder/document")
    type: str = Field(..., description="'folder' or 'document'")
    description: Optional[str] = Field(None, description="Description of this item")
    tags: List[str] = Field(default_factory=list, description="Default tags for this item")
    children: List['FolderStructureItem'] = Field(default_factory=list, description="Nested items")
    document_template: Optional[str] = Field(None, description="Template content for documents")
    permissions: Optional[Dict[str, Any]] = Field(None, description="Default permissions")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Requirements",
                "type": "folder",
                "description": "Project requirements and specifications",
                "tags": ["requirements", "planning"],
                "children": [
                    {
                        "name": "Business Requirements.md",
                        "type": "document",
                        "description": "Business requirements document",
                        "tags": ["requirements", "business"],
                        "document_template": "# Business Requirements\n\n## Overview\n\n## Stakeholders\n\n## Requirements"
                    }
                ]
            }
        }

# Fix forward reference
FolderStructureItem.model_rebuild()


class TemplateVariables(BaseModel):
    """Variables that can be used in template names and content"""
    project_name: Optional[str] = Field(None, description="Project/client name")
    date: Optional[str] = Field(None, description="Current date")
    year: Optional[str] = Field(None, description="Current year")
    month: Optional[str] = Field(None, description="Current month")
    department: Optional[str] = Field(None, description="Department name")
    custom_vars: Dict[str, str] = Field(default_factory=dict, description="Custom variables")


class ProjectTemplate(BaseModel):
    """Project template definition"""
    id: Optional[str] = Field(None, description="Template ID")
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    category: TemplateCategory = Field(..., description="Template category")
    icon: Optional[str] = Field(None, description="Icon name for UI")
    color: Optional[str] = Field(None, description="Color theme for UI")
    
    # Template structure
    structure: List[FolderStructureItem] = Field(..., description="Folder structure definition")
    
    # Default settings
    default_tags: List[str] = Field(default_factory=list, description="Default tags applied to root folder")
    default_permissions: Optional[Dict[str, Any]] = Field(None, description="Default permissions")
    default_metadata: Dict[str, Any] = Field(default_factory=dict, description="Default metadata")
    
    # Template configuration
    variables: List[str] = Field(default_factory=list, description="Available variables for this template")
    allow_customization: bool = Field(True, description="Allow users to modify structure")
    is_system_template: bool = Field(False, description="System-provided template (non-editable)")
    
    # Audit fields
    created_by: Optional[int] = Field(None, description="User ID who created template")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_by: Optional[int] = Field(None, description="User ID who last updated")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    version: int = Field(1, description="Template version")
    
    # Usage statistics
    usage_count: int = Field(0, description="Number of times template has been used")
    last_used: Optional[datetime] = Field(None, description="Last time template was used")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Software Development Project",
                "description": "Complete folder structure for software development projects",
                "category": "development",
                "icon": "code",
                "color": "blue",
                "structure": [
                    {
                        "name": "Requirements",
                        "type": "folder",
                        "description": "Project requirements and specifications",
                        "tags": ["requirements", "planning"],
                        "children": [
                            {
                                "name": "Business Requirements.md",
                                "type": "document",
                                "tags": ["requirements", "business"]
                            }
                        ]
                    },
                    {
                        "name": "Design",
                        "type": "folder",
                        "description": "System design and architecture",
                        "tags": ["design", "architecture"]
                    }
                ],
                "default_tags": ["project", "development"],
                "variables": ["project_name", "date", "department"]
            }
        }


class TemplateCreateRequest(BaseModel):
    """Request to create a new template"""
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    category: TemplateCategory = Field(..., description="Template category")
    icon: Optional[str] = Field(None, description="Icon name")
    color: Optional[str] = Field(None, description="Color theme")
    structure: List[FolderStructureItem] = Field(..., description="Folder structure")
    default_tags: List[str] = Field(default_factory=list)
    default_permissions: Optional[Dict[str, Any]] = Field(None)
    default_metadata: Dict[str, Any] = Field(default_factory=dict)
    variables: List[str] = Field(default_factory=list)
    allow_customization: bool = Field(True)


class TemplateUpdateRequest(BaseModel):
    """Request to update an existing template"""
    name: Optional[str] = Field(None, description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    category: Optional[TemplateCategory] = Field(None, description="Template category")
    icon: Optional[str] = Field(None, description="Icon name")
    color: Optional[str] = Field(None, description="Color theme")
    structure: Optional[List[FolderStructureItem]] = Field(None, description="Folder structure")
    default_tags: Optional[List[str]] = Field(None)
    default_permissions: Optional[Dict[str, Any]] = Field(None)
    default_metadata: Optional[Dict[str, Any]] = Field(None)
    variables: Optional[List[str]] = Field(None)
    allow_customization: Optional[bool] = Field(None)


class TemplateApplicationRequest(BaseModel):
    """Request to apply a template to create folder structure"""
    template_id: str = Field(..., description="Template ID to apply")
    parent_folder_id: Optional[int] = Field(None, description="Parent folder ID (null for root)")
    target_folder_id: Optional[int] = Field(None, description="Apply template to existing folder (alternative to creating new folder)")
    variables: TemplateVariables = Field(default_factory=TemplateVariables, description="Variable values")
    custom_name: Optional[str] = Field(None, description="Custom name for root folder (ignored if target_folder_id is provided)")
    apply_permissions: bool = Field(True, description="Apply template permissions")
    apply_tags: bool = Field(True, description="Apply template tags")
    create_documents: bool = Field(False, description="Create placeholder documents")


class TemplateApplicationResult(BaseModel):
    """Result of template application"""
    success: bool = Field(..., description="Whether application succeeded")
    root_folder_id: Optional[int] = Field(None, description="ID of created root folder")
    created_folders: List[int] = Field(default_factory=list, description="IDs of all created folders")
    created_documents: List[int] = Field(default_factory=list, description="IDs of any created documents")
    errors: List[str] = Field(default_factory=list, description="Any errors encountered")
    warnings: List[str] = Field(default_factory=list, description="Any warnings")


class TemplateListResponse(BaseModel):
    """Response for template listing"""
    templates: List[ProjectTemplate] = Field(..., description="List of templates")
    total: int = Field(..., description="Total number of templates")
    categories: List[str] = Field(..., description="Available categories")


class TemplatePreview(BaseModel):
    """Preview of what a template will create"""
    template: ProjectTemplate = Field(..., description="Template being previewed")
    preview_structure: List[Dict[str, Any]] = Field(..., description="Preview of folder structure with resolved variables")
    estimated_folders: int = Field(..., description="Number of folders that will be created")
    estimated_documents: int = Field(..., description="Number of documents that will be created")
    resolved_variables: Dict[str, str] = Field(..., description="Variable values that will be used")