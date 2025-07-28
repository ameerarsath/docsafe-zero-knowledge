"""
Template Service for SecureVault

Handles project template management, predefined templates, and template application.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import uuid
import re
from sqlalchemy.orm import Session

from ..schemas.templates import (
    ProjectTemplate, FolderStructureItem, TemplateCategory, 
    TemplateApplicationRequest, TemplateApplicationResult,
    TemplateVariables, TemplatePreview
)
from ..schemas.document import DocumentCreate
from ..models.document import Document


class TemplateService:
    """Service for managing project templates"""

    def __init__(self):
        self.system_templates = self._create_system_templates()
        self.custom_templates: Dict[str, ProjectTemplate] = {}

    def _create_system_templates(self) -> Dict[str, ProjectTemplate]:
        """Create predefined system templates"""
        templates = {}

        # Business Project Template
        templates["business_project"] = ProjectTemplate(
            id="business_project",
            name="Business Project",
            description="Comprehensive folder structure for business projects including planning, execution, and reporting",
            category=TemplateCategory.BUSINESS,
            icon="briefcase",
            color="blue",
            structure=[
                FolderStructureItem(
                    name="01_Planning",
                    type="folder",
                    description="Project planning and initiation documents",
                    tags=["planning", "initiation"],
                    children=[
                        FolderStructureItem(
                            name="Project Charter.md",
                            type="document",
                            description="Project charter and objectives",
                            tags=["charter", "objectives"],
                            document_template="# Project Charter: {project_name}\n\n## Project Overview\n\n## Objectives\n\n## Success Criteria\n\n## Stakeholders\n\n## Timeline\n\n## Budget"
                        ),
                        FolderStructureItem(
                            name="Requirements",
                            type="folder",
                            description="Business requirements and specifications",
                            tags=["requirements"],
                            children=[
                                FolderStructureItem(
                                    name="Business Requirements.md",
                                    type="document",
                                    tags=["requirements", "business"],
                                    document_template="# Business Requirements\n\n## Functional Requirements\n\n## Non-Functional Requirements\n\n## Constraints"
                                ),
                                FolderStructureItem(
                                    name="User Stories.md",
                                    type="document",
                                    tags=["requirements", "user-stories"],
                                    document_template="# User Stories\n\n## Epic 1\n\n### Story 1\n**As a** [user type]\n**I want** [functionality]\n**So that** [benefit]"
                                )
                            ]
                        ),
                        FolderStructureItem(
                            name="Risk Assessment.md",
                            type="document",
                            tags=["risk", "assessment"],
                            document_template="# Risk Assessment\n\n## Risk Matrix\n\n| Risk | Probability | Impact | Mitigation |\n|------|-------------|--------|-----------|\n|      |             |        |           |"
                        )
                    ]
                ),
                FolderStructureItem(
                    name="02_Execution",
                    type="folder",
                    description="Project execution and development materials",
                    tags=["execution", "development"],
                    children=[
                        FolderStructureItem(name="Design", type="folder", description="Design documents and mockups", tags=["design"]),
                        FolderStructureItem(name="Development", type="folder", description="Development artifacts", tags=["development"]),
                        FolderStructureItem(name="Testing", type="folder", description="Testing plans and results", tags=["testing"]),
                        FolderStructureItem(name="Documentation", type="folder", description="Technical documentation", tags=["documentation"])
                    ]
                ),
                FolderStructureItem(
                    name="03_Communication",
                    type="folder",
                    description="Project communication and stakeholder updates",
                    tags=["communication", "stakeholders"],
                    children=[
                        FolderStructureItem(name="Meeting Notes", type="folder", description="Meeting notes and minutes", tags=["meetings"]),
                        FolderStructureItem(name="Status Reports", type="folder", description="Regular status updates", tags=["status", "reports"]),
                        FolderStructureItem(name="Presentations", type="folder", description="Stakeholder presentations", tags=["presentations"])
                    ]
                ),
                FolderStructureItem(
                    name="04_Delivery",
                    type="folder",
                    description="Project delivery and closure documents",
                    tags=["delivery", "closure"],
                    children=[
                        FolderStructureItem(name="Final Deliverables", type="folder", description="Final project outputs", tags=["deliverables", "final"]),
                        FolderStructureItem(name="Handover", type="folder", description="Project handover materials", tags=["handover"]),
                        FolderStructureItem(name="Lessons Learned.md", type="document", tags=["lessons", "retrospective"], 
                                          document_template="# Lessons Learned: {project_name}\n\n## What Went Well\n\n## What Could Be Improved\n\n## Recommendations for Future Projects")
                    ]
                )
            ],
            default_tags=["project", "business"],
            variables=["project_name", "date", "department"],
            is_system_template=True
        )

        # Legal Case Management Template
        templates["legal_case"] = ProjectTemplate(
            id="legal_case",
            name="Legal Case Management",
            description="Comprehensive folder structure for legal case management and documentation",
            category=TemplateCategory.LEGAL,
            icon="scale",
            color="purple",
            structure=[
                FolderStructureItem(
                    name="01_Case_Information",
                    type="folder",
                    description="Basic case information and intake documents",
                    tags=["case-info", "intake"],
                    children=[
                        FolderStructureItem(
                            name="Case Summary.md",
                            type="document",
                            description="Case overview and summary",
                            tags=["summary", "overview"],
                            document_template="# Case Summary: {project_name}\n\n## Case Details\n- Case Number:\n- Client:\n- Opposing Party:\n- Court:\n- Judge:\n\n## Case Overview\n\n## Key Issues\n\n## Timeline"
                        ),
                        FolderStructureItem(name="Client Information", type="folder", description="Client details and contact information", tags=["client"]),
                        FolderStructureItem(name="Retainer Agreement", type="folder", description="Retainer and fee agreements", tags=["retainer", "fees"])
                    ]
                ),
                FolderStructureItem(
                    name="02_Pleadings",
                    type="folder",
                    description="Court pleadings and legal documents",
                    tags=["pleadings", "court-documents"],
                    children=[
                        FolderStructureItem(name="Complaints", type="folder", description="Initial complaints and petitions", tags=["complaints"]),
                        FolderStructureItem(name="Answers", type="folder", description="Responses and answers", tags=["answers"]),
                        FolderStructureItem(name="Motions", type="folder", description="Court motions and applications", tags=["motions"]),
                        FolderStructureItem(name="Orders", type="folder", description="Court orders and judgments", tags=["orders"])
                    ]
                ),
                FolderStructureItem(
                    name="03_Discovery",
                    type="folder",
                    description="Discovery materials and evidence",
                    tags=["discovery", "evidence"],
                    children=[
                        FolderStructureItem(name="Interrogatories", type="folder", description="Written questions and answers", tags=["interrogatories"]),
                        FolderStructureItem(name="Depositions", type="folder", description="Deposition transcripts and exhibits", tags=["depositions"]),
                        FolderStructureItem(name="Document Requests", type="folder", description="Document production requests", tags=["document-requests"]),
                        FolderStructureItem(name="Evidence", type="folder", description="Physical and documentary evidence", tags=["evidence"])
                    ]
                ),
                FolderStructureItem(
                    name="04_Correspondence",
                    type="folder",
                    description="All case correspondence",
                    tags=["correspondence", "communication"],
                    children=[
                        FolderStructureItem(name="Client Communication", type="folder", description="Communications with client", tags=["client", "communication"]),
                        FolderStructureItem(name="Opposing Counsel", type="folder", description="Communications with opposing counsel", tags=["opposing-counsel"]),
                        FolderStructureItem(name="Court Communications", type="folder", description="Communications with court", tags=["court"])
                    ]
                ),
                FolderStructureItem(
                    name="05_Research",
                    type="folder",
                    description="Legal research and analysis",
                    tags=["research", "legal-analysis"],
                    children=[
                        FolderStructureItem(name="Case Law", type="folder", description="Relevant case law and precedents", tags=["case-law"]),
                        FolderStructureItem(name="Statutes", type="folder", description="Relevant statutes and regulations", tags=["statutes"]),
                        FolderStructureItem(name="Legal Memoranda", type="folder", description="Internal legal memos", tags=["memos"])
                    ]
                ),
                FolderStructureItem(
                    name="06_Trial_Preparation",
                    type="folder",
                    description="Trial preparation materials",
                    tags=["trial", "preparation"],
                    children=[
                        FolderStructureItem(name="Witness Lists", type="folder", description="Witness information and lists", tags=["witnesses"]),
                        FolderStructureItem(name="Exhibit Lists", type="folder", description="Trial exhibits and lists", tags=["exhibits"]),
                        FolderStructureItem(name="Trial Briefs", type="folder", description="Trial briefs and arguments", tags=["briefs"])
                    ]
                )
            ],
            default_tags=["legal", "case", "confidential"],
            variables=["project_name", "client_name", "case_number", "date"],
            is_system_template=True
        )

        # Software Development Template
        templates["software_development"] = ProjectTemplate(
            id="software_development",
            name="Software Development Project",
            description="Complete folder structure for software development projects following modern development practices",
            category=TemplateCategory.DEVELOPMENT,
            icon="code",
            color="green",
            structure=[
                FolderStructureItem(
                    name="01_Requirements",
                    type="folder",
                    description="Project requirements and specifications",
                    tags=["requirements", "planning"],
                    children=[
                        FolderStructureItem(
                            name="Product Requirements.md",
                            type="document",
                            tags=["requirements", "product"],
                            document_template="# Product Requirements: {project_name}\n\n## Overview\n\n## User Personas\n\n## Features\n\n## Acceptance Criteria"
                        ),
                        FolderStructureItem(
                            name="Technical Requirements.md",
                            type="document",
                            tags=["requirements", "technical"],
                            document_template="# Technical Requirements\n\n## Architecture\n\n## Technology Stack\n\n## Performance Requirements\n\n## Security Requirements"
                        ),
                        FolderStructureItem(name="User Stories", type="folder", description="User stories and epics", tags=["user-stories"])
                    ]
                ),
                FolderStructureItem(
                    name="02_Architecture",
                    type="folder",
                    description="System architecture and design documents",
                    tags=["architecture", "design"],
                    children=[
                        FolderStructureItem(name="System Architecture.md", type="document", tags=["architecture"], 
                                          document_template="# System Architecture\n\n## High-Level Architecture\n\n## Components\n\n## Data Flow\n\n## Technology Decisions"),
                        FolderStructureItem(name="Database Design", type="folder", description="Database schemas and ERDs", tags=["database"]),
                        FolderStructureItem(name="API Design", type="folder", description="API specifications and documentation", tags=["api"]),
                        FolderStructureItem(name="UI-UX Design", type="folder", description="User interface designs and mockups", tags=["ui", "ux"])
                    ]
                ),
                FolderStructureItem(
                    name="03_Development",
                    type="folder",
                    description="Development artifacts and code documentation",
                    tags=["development", "code"],
                    children=[
                        FolderStructureItem(name="Code Reviews", type="folder", description="Code review documentation", tags=["code-review"]),
                        FolderStructureItem(name="Development Notes", type="folder", description="Development notes and decisions", tags=["notes"]),
                        FolderStructureItem(name="Configuration", type="folder", description="Configuration files and environment setup", tags=["configuration"])
                    ]
                ),
                FolderStructureItem(
                    name="04_Testing",
                    type="folder",
                    description="Testing documentation and results",
                    tags=["testing", "qa"],
                    children=[
                        FolderStructureItem(name="Test Plans", type="folder", description="Test planning documents", tags=["test-plans"]),
                        FolderStructureItem(name="Test Cases", type="folder", description="Individual test cases", tags=["test-cases"]),
                        FolderStructureItem(name="Test Results", type="folder", description="Test execution results", tags=["test-results"]),
                        FolderStructureItem(name="Bug Reports", type="folder", description="Bug tracking and reports", tags=["bugs"])
                    ]
                ),
                FolderStructureItem(
                    name="05_Deployment",
                    type="folder",
                    description="Deployment and operations documentation",
                    tags=["deployment", "devops"],
                    children=[
                        FolderStructureItem(name="Deployment Scripts", type="folder", description="Deployment automation scripts", tags=["deployment", "scripts"]),
                        FolderStructureItem(name="Infrastructure", type="folder", description="Infrastructure as code", tags=["infrastructure"]),
                        FolderStructureItem(name="Monitoring", type="folder", description="Monitoring and alerting setup", tags=["monitoring"])
                    ]
                ),
                FolderStructureItem(
                    name="06_Documentation",
                    type="folder",
                    description="Project documentation and guides",
                    tags=["documentation"],
                    children=[
                        FolderStructureItem(name="User Documentation", type="folder", description="End-user guides and manuals", tags=["user-docs"]),
                        FolderStructureItem(name="Developer Documentation", type="folder", description="Developer guides and API docs", tags=["dev-docs"]),
                        FolderStructureItem(name="Operations Manual", type="folder", description="Operations and maintenance guides", tags=["ops-docs"])
                    ]
                )
            ],
            default_tags=["project", "development", "software"],
            variables=["project_name", "version", "date", "team"],
            is_system_template=True
        )

        # Marketing Campaign Template
        templates["marketing_campaign"] = ProjectTemplate(
            id="marketing_campaign",
            name="Marketing Campaign",
            description="Organized structure for marketing campaign planning, execution, and analysis",
            category=TemplateCategory.MARKETING,
            icon="megaphone",
            color="pink",
            structure=[
                FolderStructureItem(
                    name="01_Strategy",
                    type="folder",
                    description="Campaign strategy and planning",
                    tags=["strategy", "planning"],
                    children=[
                        FolderStructureItem(
                            name="Campaign Brief.md",
                            type="document",
                            tags=["brief", "strategy"],
                            document_template="# Campaign Brief: {project_name}\n\n## Objectives\n\n## Target Audience\n\n## Key Messages\n\n## Success Metrics\n\n## Budget\n\n## Timeline"
                        ),
                        FolderStructureItem(name="Market Research", type="folder", description="Market analysis and research", tags=["research"]),
                        FolderStructureItem(name="Competitor Analysis", type="folder", description="Competitive landscape analysis", tags=["competitors"])
                    ]
                ),
                FolderStructureItem(
                    name="02_Creative",
                    type="folder",
                    description="Creative assets and materials",
                    tags=["creative", "assets"],
                    children=[
                        FolderStructureItem(name="Brand Guidelines", type="folder", description="Brand guidelines and style guides", tags=["brand"]),
                        FolderStructureItem(name="Copy", type="folder", description="Marketing copy and content", tags=["copy"]),
                        FolderStructureItem(name="Design Assets", type="folder", description="Visual design assets", tags=["design"]),
                        FolderStructureItem(name="Video Content", type="folder", description="Video materials and scripts", tags=["video"])
                    ]
                ),
                FolderStructureItem(
                    name="03_Channels",
                    type="folder",
                    description="Channel-specific materials and plans",
                    tags=["channels", "distribution"],
                    children=[
                        FolderStructureItem(name="Social Media", type="folder", description="Social media content and schedules", tags=["social-media"]),
                        FolderStructureItem(name="Email Marketing", type="folder", description="Email campaigns and templates", tags=["email"]),
                        FolderStructureItem(name="Paid Advertising", type="folder", description="Paid ad campaigns and creatives", tags=["paid-ads"]),
                        FolderStructureItem(name="Content Marketing", type="folder", description="Blog posts and content pieces", tags=["content"])
                    ]
                ),
                FolderStructureItem(
                    name="04_Analytics",
                    type="folder",
                    description="Campaign tracking and analysis",
                    tags=["analytics", "reporting"],
                    children=[
                        FolderStructureItem(name="Performance Reports", type="folder", description="Regular performance reports", tags=["reports"]),
                        FolderStructureItem(name="A/B Tests", type="folder", description="A/B testing results and analysis", tags=["testing"]),
                        FolderStructureItem(name="ROI Analysis", type="folder", description="Return on investment analysis", tags=["roi"])
                    ]
                )
            ],
            default_tags=["marketing", "campaign"],
            variables=["project_name", "campaign_type", "date", "budget"],
            is_system_template=True
        )

        # HR Onboarding Template
        templates["hr_onboarding"] = ProjectTemplate(
            id="hr_onboarding",
            name="Employee Onboarding",
            description="Comprehensive employee onboarding process and documentation",
            category=TemplateCategory.HR,
            icon="user-plus",
            color="orange",
            structure=[
                FolderStructureItem(
                    name="01_Pre_Boarding",
                    type="folder",
                    description="Pre-boarding preparation and documentation",
                    tags=["pre-boarding", "preparation"],
                    children=[
                        FolderStructureItem(name="Offer Letter", type="folder", description="Job offer and acceptance documents", tags=["offer"]),
                        FolderStructureItem(name="Background Check", type="folder", description="Background verification documents", tags=["background"]),
                        FolderStructureItem(name="Equipment Request", type="folder", description="IT equipment and workspace setup", tags=["equipment"])
                    ]
                ),
                FolderStructureItem(
                    name="02_First_Day",
                    type="folder",
                    description="First day orientation materials",
                    tags=["first-day", "orientation"],
                    children=[
                        FolderStructureItem(
                            name="Welcome Package.md",
                            type="document",
                            tags=["welcome", "orientation"],
                            document_template="# Welcome to the Team!\n\n## Your First Day Schedule\n\n## Key Contacts\n\n## Important Information\n\n## Next Steps"
                        ),
                        FolderStructureItem(name="HR Paperwork", type="folder", description="Required HR forms and documents", tags=["paperwork"]),
                        FolderStructureItem(name="Company Handbook", type="folder", description="Employee handbook and policies", tags=["handbook"])
                    ]
                ),
                FolderStructureItem(
                    name="03_Training",
                    type="folder",
                    description="Training materials and progress tracking",
                    tags=["training", "development"],
                    children=[
                        FolderStructureItem(name="Role-Specific Training", type="folder", description="Job-specific training materials", tags=["role-training"]),
                        FolderStructureItem(name="Company Training", type="folder", description="General company training modules", tags=["company-training"]),
                        FolderStructureItem(name="Compliance Training", type="folder", description="Required compliance training", tags=["compliance"])
                    ]
                ),
                FolderStructureItem(
                    name="04_Integration",
                    type="folder",
                    description="Team integration and relationship building",
                    tags=["integration", "team"],
                    children=[
                        FolderStructureItem(name="Team Introductions", type="folder", description="Team meeting notes and introductions", tags=["team"]),
                        FolderStructureItem(name="30-60-90 Goals", type="folder", description="Performance goals and check-ins", tags=["goals"]),
                        FolderStructureItem(name="Feedback Sessions", type="folder", description="Regular feedback and adjustments", tags=["feedback"])
                    ]
                )
            ],
            default_tags=["hr", "onboarding", "confidential"],
            variables=["employee_name", "position", "department", "start_date"],
            is_system_template=True
        )

        # Financial Project Template
        templates["financial_project"] = ProjectTemplate(
            id="financial_project",
            name="Financial Project",
            description="Financial planning, budgeting, and reporting project structure",
            category=TemplateCategory.FINANCE,
            icon="dollar-sign",
            color="yellow",
            structure=[
                FolderStructureItem(
                    name="01_Planning",
                    type="folder",
                    description="Financial planning and analysis",
                    tags=["planning", "analysis"],
                    children=[
                        FolderStructureItem(name="Budget Planning", type="folder", description="Budget development and planning", tags=["budget"]),
                        FolderStructureItem(name="Financial Models", type="folder", description="Financial modeling and projections", tags=["models"]),
                        FolderStructureItem(name="Risk Assessment", type="folder", description="Financial risk analysis", tags=["risk"])
                    ]
                ),
                FolderStructureItem(
                    name="02_Documentation",
                    type="folder",
                    description="Financial documentation and compliance",
                    tags=["documentation", "compliance"],
                    children=[
                        FolderStructureItem(name="Contracts", type="folder", description="Financial contracts and agreements", tags=["contracts"]),
                        FolderStructureItem(name="Invoices", type="folder", description="Invoice processing and tracking", tags=["invoices"]),
                        FolderStructureItem(name="Receipts", type="folder", description="Expense receipts and documentation", tags=["receipts"])
                    ]
                ),
                FolderStructureItem(
                    name="03_Reporting",
                    type="folder",
                    description="Financial reporting and analysis",
                    tags=["reporting", "analysis"],
                    children=[
                        FolderStructureItem(name="Monthly Reports", type="folder", description="Monthly financial reports", tags=["monthly"]),
                        FolderStructureItem(name="Quarterly Reports", type="folder", description="Quarterly financial analysis", tags=["quarterly"]),
                        FolderStructureItem(name="Annual Reports", type="folder", description="Annual financial statements", tags=["annual"])
                    ]
                ),
                FolderStructureItem(
                    name="04_Audit",
                    type="folder",
                    description="Audit preparation and documentation",
                    tags=["audit", "compliance"],
                    children=[
                        FolderStructureItem(name="Audit Trail", type="folder", description="Transaction audit trails", tags=["audit-trail"]),
                        FolderStructureItem(name="Supporting Documents", type="folder", description="Audit supporting documentation", tags=["supporting-docs"]),
                        FolderStructureItem(name="Audit Reports", type="folder", description="Audit findings and reports", tags=["audit-reports"])
                    ]
                )
            ],
            default_tags=["finance", "project", "confidential"],
            variables=["project_name", "fiscal_year", "budget", "date"],
            is_system_template=True
        )

        return templates

    def get_all_templates(self, user_id: Optional[int] = None) -> List[ProjectTemplate]:
        """Get all available templates (system + custom)"""
        templates = list(self.system_templates.values())
        
        # Add user's custom templates
        if user_id:
            user_templates = [t for t in self.custom_templates.values() 
                            if t.created_by == user_id or not t.created_by]
            templates.extend(user_templates)
        
        # Sort by category and name
        templates.sort(key=lambda t: (t.category.value, t.name))
        return templates

    def get_template_by_id(self, template_id: str) -> Optional[ProjectTemplate]:
        """Get a specific template by ID"""
        if template_id in self.system_templates:
            return self.system_templates[template_id]
        return self.custom_templates.get(template_id)

    def get_templates_by_category(self, category: TemplateCategory) -> List[ProjectTemplate]:
        """Get templates filtered by category"""
        all_templates = self.get_all_templates()
        return [t for t in all_templates if t.category == category]

    def create_custom_template(self, template_data: Dict[str, Any], user_id: int) -> ProjectTemplate:
        """Create a new custom template"""
        template_id = str(uuid.uuid4())
        template = ProjectTemplate(
            id=template_id,
            created_by=user_id,
            created_at=datetime.utcnow(),
            **template_data
        )
        self.custom_templates[template_id] = template
        return template

    def resolve_variables(self, text: str, variables: TemplateVariables) -> str:
        """Resolve template variables in text"""
        if not text:
            return text
            
        resolved = text
        
        # Standard variables
        if variables.project_name:
            resolved = resolved.replace("{project_name}", variables.project_name)
        if variables.date:
            resolved = resolved.replace("{date}", variables.date)
        if variables.year:
            resolved = resolved.replace("{year}", variables.year)
        if variables.month:
            resolved = resolved.replace("{month}", variables.month)
        if variables.department:
            resolved = resolved.replace("{department}", variables.department)
            
        # Custom variables
        for key, value in variables.custom_vars.items():
            resolved = resolved.replace(f"{{{key}}}", value)
            
        return resolved

    def apply_template(self, 
                      db: Session, 
                      request: TemplateApplicationRequest, 
                      user_id: int) -> TemplateApplicationResult:
        """Apply a template to create folder structure"""
        
        # Get the template
        template = self.get_template_by_id(request.template_id)
        if not template:
            return TemplateApplicationResult(
                success=False,
                errors=[f"Template {request.template_id} not found"]
            )

        try:
            # Prepare variables with defaults
            variables = request.variables
            if not variables.date:
                variables.date = datetime.now().strftime("%Y-%m-%d")
            if not variables.year:
                variables.year = datetime.now().strftime("%Y")
            if not variables.month:
                variables.month = datetime.now().strftime("%m")

            # Handle root folder - either use existing or create new
            if request.target_folder_id:
                # Apply template to existing folder
                root_folder = db.query(Document).filter(Document.id == request.target_folder_id).first()
                if not root_folder:
                    return TemplateApplicationResult(
                        success=False,
                        errors=[f"Target folder with ID {request.target_folder_id} not found"]
                    )
                
                # Verify ownership
                if root_folder.owner_id != user_id:
                    return TemplateApplicationResult(
                        success=False,
                        errors=["You don't have permission to apply template to this folder"]
                    )
                
                # Update folder metadata to indicate template was applied
                if not root_folder.doc_metadata:
                    root_folder.doc_metadata = {}
                root_folder.doc_metadata.update({
                    "template_id": template.id,
                    "template_name": template.name,
                    "created_from_template": True,
                    "template_version": template.version,
                    "template_applied_at": datetime.utcnow().isoformat()
                })
                
                # Apply tags if requested
                if request.apply_tags and template.default_tags:
                    existing_tags = set(root_folder.tags or [])
                    new_tags = set(template.default_tags)
                    root_folder.tags = list(existing_tags.union(new_tags))
                
                db.commit()
                db.refresh(root_folder)
                
                # Track created items (existing folder is not counted as created)
                created_folders = []
            else:
                # Create new root folder
                root_name = request.custom_name or self.resolve_variables(template.name, variables)
                
                root_folder = Document(
                    name=root_name,
                    description=f"Created from template: {template.name}",
                    document_type="folder",
                    parent_id=request.parent_folder_id,
                    owner_id=user_id,
                    created_by=user_id,
                    tags=template.default_tags if request.apply_tags else [],
                    doc_metadata={
                        "template_id": template.id,
                        "template_name": template.name,
                        "created_from_template": True,
                        "template_version": template.version
                    }
                )
                
                db.add(root_folder)
                db.commit()
                db.refresh(root_folder)
                
                # Track created items
                created_folders = [root_folder.id]
            created_documents = []
            errors = []
            warnings = []
            
            # Recursively create structure
            for item in template.structure:
                try:
                    self._create_structure_item(
                        db, item, root_folder.id, variables,
                        request, user_id, created_folders, created_documents
                    )
                except Exception as e:
                    errors.append(f"Failed to create {item.name}: {str(e)}")

            # Update template usage statistics
            template.usage_count += 1
            template.last_used = datetime.utcnow()

            return TemplateApplicationResult(
                success=len(errors) == 0,
                root_folder_id=root_folder.id,
                created_folders=created_folders,
                created_documents=created_documents,
                errors=errors,
                warnings=warnings
            )

        except Exception as e:
            return TemplateApplicationResult(
                success=False,
                errors=[f"Template application failed: {str(e)}"]
            )

    def _create_structure_item(self, 
                             db: Session,
                             item: FolderStructureItem,
                             parent_id: int,
                             variables: TemplateVariables,
                             request: TemplateApplicationRequest,
                             user_id: int,
                             created_folders: List[int],
                             created_documents: List[int]):
        """Recursively create folder structure items"""
        
        # Resolve variables in item name and description
        resolved_name = self.resolve_variables(item.name, variables)
        resolved_description = self.resolve_variables(item.description or "", variables)
        
        # Prepare item tags
        item_tags = item.tags if request.apply_tags else []
        
        # Prepare metadata
        metadata = item.metadata.copy()
        metadata.update({
            "created_from_template": True,
            "template_item_type": item.type,
            "original_name": item.name
        })
        
        if item.type == "folder":
            # Create folder directly
            folder = Document(
                name=resolved_name,
                description=resolved_description,
                document_type="folder",
                parent_id=parent_id,
                owner_id=user_id,
                created_by=user_id,
                tags=item_tags,
                doc_metadata=metadata
            )
            
            db.add(folder)
            db.commit()
            db.refresh(folder)
            created_folders.append(folder.id)
            
            # Recursively create children
            for child in item.children:
                self._create_structure_item(
                    db, child, folder.id, variables,
                    request, user_id, created_folders, created_documents
                )
                
        elif item.type == "document" and request.create_documents:
            # Create document placeholder (if requested)
            doc_content = ""
            if item.document_template:
                doc_content = self.resolve_variables(item.document_template, variables)
            
            # For now, we'll create a metadata entry - actual document creation 
            # would require file handling which is more complex
            doc_data = DocumentCreate(
                name=resolved_name,
                description=resolved_description,
                document_type="document",
                parent_id=parent_id,
                tags=item_tags,
                doc_metadata={
                    **metadata,
                    "document_template": doc_content,
                    "is_template_placeholder": True
                }
            )
            
            # Note: This would create a document entry but without actual file content
            # In a real implementation, you might want to create actual files
            # For now, we'll skip document creation to avoid complexity
            pass

    def preview_template(self, 
                        template_id: str, 
                        variables: TemplateVariables) -> Optional[TemplatePreview]:
        """Preview what a template will create"""
        template = self.get_template_by_id(template_id)
        if not template:
            return None
            
        # Count items and resolve variables for preview
        folder_count = 0
        document_count = 0
        preview_structure = []
        
        def count_and_preview_items(items: List[FolderStructureItem], level: int = 0):
            nonlocal folder_count, document_count
            result = []
            
            for item in items:
                if item.type == "folder":
                    folder_count += 1
                elif item.type == "document":
                    document_count += 1
                    
                resolved_name = self.resolve_variables(item.name, variables)
                resolved_desc = self.resolve_variables(item.description or "", variables)
                
                preview_item = {
                    "name": resolved_name,
                    "original_name": item.name,
                    "type": item.type,
                    "description": resolved_desc,
                    "level": level,
                    "tags": item.tags,
                    "children": count_and_preview_items(item.children, level + 1) if item.children else []
                }
                result.append(preview_item)
                
            return result
        
        preview_structure = count_and_preview_items(template.structure)
        
        # Prepare resolved variables for display
        resolved_vars = {}
        if variables.project_name:
            resolved_vars["project_name"] = variables.project_name
        if variables.date:
            resolved_vars["date"] = variables.date
        if variables.year:
            resolved_vars["year"] = variables.year
        if variables.month:
            resolved_vars["month"] = variables.month
        if variables.department:
            resolved_vars["department"] = variables.department
        resolved_vars.update(variables.custom_vars)
        
        return TemplatePreview(
            template=template,
            preview_structure=preview_structure,
            estimated_folders=folder_count,
            estimated_documents=document_count,
            resolved_variables=resolved_vars
        )