"""
Template API Endpoints for SecureVault

Provides REST API access to project template functionality.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.security import require_role, get_current_user
from ...models.user import User
from ...schemas.templates import (
    ProjectTemplate, TemplateCategory, TemplateCreateRequest, 
    TemplateUpdateRequest, TemplateApplicationRequest, 
    TemplateApplicationResult, TemplateListResponse, 
    TemplatePreview, TemplateVariables
)
from ...services.template_service import TemplateService

router = APIRouter()
template_service = TemplateService()


@router.get("/", response_model=TemplateListResponse)
async def list_templates(
    category: Optional[TemplateCategory] = Query(None, description="Filter by category"),
    include_custom: bool = Query(True, description="Include user's custom templates"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all available project templates
    
    Returns both system templates and user's custom templates.
    Can be filtered by category.
    """
    try:
        if category:
            templates = template_service.get_templates_by_category(category)
        else:
            user_id = current_user.id if include_custom else None
            templates = template_service.get_all_templates(user_id)
        
        # Get unique categories from all templates
        all_templates = template_service.get_all_templates()
        categories = list(set(t.category.value for t in all_templates))
        categories.sort()
        
        return TemplateListResponse(
            templates=templates,
            total=len(templates),
            categories=categories
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list templates: {str(e)}"
        )


@router.get("/{template_id}", response_model=ProjectTemplate)
async def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific template by ID
    
    Returns the complete template definition including structure.
    """
    template = template_service.get_template_by_id(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    # Check if user has access to this template
    if (template.created_by and 
        template.created_by != current_user.id and 
        not template.is_system_template):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this template"
        )
    
    return template


@router.post("/", response_model=ProjectTemplate)
async def create_template(
    template_data: TemplateCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "template_creator"]))
):
    """
    Create a new custom template
    
    Allows users with appropriate permissions to create custom templates.
    System templates cannot be created through this endpoint.
    """
    try:
        template = template_service.create_custom_template(
            template_data.dict(), 
            current_user.id
        )
        return template
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template: {str(e)}"
        )


@router.put("/{template_id}", response_model=ProjectTemplate)
async def update_template(
    template_id: str,
    template_data: TemplateUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "template_creator"]))
):
    """
    Update an existing custom template
    
    Only custom templates can be updated. System templates are read-only.
    Users can only update their own templates unless they are admins.
    """
    template = template_service.get_template_by_id(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    if template.is_system_template:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System templates cannot be modified"
        )
    
    # Check ownership (admins can modify any template)
    if (template.created_by != current_user.id and 
        not any(role.name == "admin" for role in current_user.roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own templates"
        )
    
    try:
        # Update template (simplified - in real implementation would update database)
        update_data = template_data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(template, key, value)
        
        template.updated_by = current_user.id
        template.updated_at = datetime.utcnow()
        template.version += 1
        
        return template
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update template: {str(e)}"
        )


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "template_creator"]))
):
    """
    Delete a custom template
    
    Only custom templates can be deleted. System templates cannot be deleted.
    Users can only delete their own templates unless they are admins.
    """
    template = template_service.get_template_by_id(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    if template.is_system_template:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System templates cannot be deleted"
        )
    
    # Check ownership (admins can delete any template)
    if (template.created_by != current_user.id and 
        not any(role.name == "admin" for role in current_user.roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own templates"
        )
    
    try:
        # Remove from custom templates
        if template_id in template_service.custom_templates:
            del template_service.custom_templates[template_id]
        
        return {"message": f"Template {template_id} deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete template: {str(e)}"
        )


@router.post("/{template_id}/preview", response_model=TemplatePreview)
async def preview_template(
    template_id: str,
    variables: TemplateVariables,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview what a template will create
    
    Shows the resolved folder structure with variable substitutions
    without actually creating anything.
    """
    template = template_service.get_template_by_id(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    # Check access
    if (template.created_by and 
        template.created_by != current_user.id and 
        not template.is_system_template):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this template"
        )
    
    try:
        preview = template_service.preview_template(template_id, variables)
        if not preview:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate template preview"
            )
        
        return preview
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preview template: {str(e)}"
        )


@router.post("/{template_id}/apply", response_model=TemplateApplicationResult)
async def apply_template(
    template_id: str,
    request: TemplateApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Apply a template to create folder structure
    
    Creates the complete folder hierarchy defined in the template
    with variable substitutions and optional permissions/tags.
    """
    template = template_service.get_template_by_id(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    # Check access
    if (template.created_by and 
        template.created_by != current_user.id and 
        not template.is_system_template):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this template"
        )
    
    # Validate parent folder access if specified
    if request.parent_folder_id:
        # In a real implementation, you'd verify the user has write access
        # to the parent folder here
        pass
    
    try:
        # Set the template_id in the request
        request.template_id = template_id
        
        result = template_service.apply_template(db, request, current_user.id)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template application failed: {'; '.join(result.errors)}"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply template: {str(e)}"
        )


@router.get("/categories/", response_model=List[str])
async def get_template_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all available template categories
    
    Returns a list of all template categories for filtering purposes.
    """
    try:
        categories = [category.value for category in TemplateCategory]
        return sorted(categories)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get categories: {str(e)}"
        )


@router.get("/{template_id}/usage-stats")
async def get_template_usage_stats(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "template_creator"]))
):
    """
    Get usage statistics for a template
    
    Returns usage count, last used date, and other statistics.
    Only available to admins and template creators.
    """
    template = template_service.get_template_by_id(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    # Check access (admins can see all stats, creators can see their own)
    if (template.created_by and 
        template.created_by != current_user.id and 
        not any(role.name == "admin" for role in current_user.roles)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to template statistics"
        )
    
    return {
        "template_id": template.id,
        "template_name": template.name,
        "usage_count": template.usage_count,
        "last_used": template.last_used,
        "created_at": template.created_at,
        "version": template.version
    }


# Add missing import
from datetime import datetime