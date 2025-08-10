# GS Brand Guide

This document defines the visual identity, voice, and brand standards for GS across all digital touchpoints.

## Brand Overview

### Mission Statement
GS empowers event organizers to capture, manage, and share memorable moments through intelligent photo and content management solutions.

### Brand Values
- **Innovation**: Cutting-edge technology that simplifies complex workflows
- **Reliability**: Dependable solutions that work when it matters most
- **Accessibility**: Easy-to-use tools for users of all technical levels
- **Quality**: Premium experiences that exceed expectations
- **Community**: Building connections through shared experiences

### Brand Personality
- **Professional yet approachable**: Sophisticated without being intimidating
- **Innovative**: Forward-thinking and technology-driven
- **Trustworthy**: Reliable partner for important events
- **Efficient**: Streamlined solutions that save time
- **Celebratory**: Embracing the joy of memorable moments

## Visual Identity

### Logo Usage
- **Primary logo**: Full wordmark for main brand applications
- **Icon mark**: Simplified version for small spaces and favicons
- **Horizontal layout**: For wide format applications
- **Stacked layout**: For square or vertical applications

#### Logo Guidelines
- Maintain clear space equal to the height of the "S" in GS
- Never stretch, rotate, or modify the logo proportions
- Use approved color variations only
- Ensure sufficient contrast against backgrounds

### Color Palette

#### Primary Colors
```css
/* Brand Primary */
--gs-primary: #2563eb;        /* Vibrant blue - main brand color */
--gs-primary-hover: #1d4ed8;  /* Darker blue for hover states */
--gs-primary-light: #dbeafe;  /* Light blue for backgrounds */

/* Brand Secondary */
--gs-secondary: #7c3aed;      /* Purple accent */
--gs-secondary-hover: #6d28d9; /* Darker purple for hover */
--gs-secondary-light: #ede9fe; /* Light purple for backgrounds */
```

#### Supporting Colors
```css
/* Success */
--gs-success: #059669;        /* Green for success states */
--gs-success-light: #d1fae5;  /* Light green background */

/* Warning */
--gs-warning: #d97706;        /* Orange for warnings */
--gs-warning-light: #fed7aa;  /* Light orange background */

/* Error */
--gs-error: #dc2626;          /* Red for errors */
--gs-error-light: #fecaca;    /* Light red background */

/* Info */
--gs-info: #0891b2;           /* Cyan for info */
--gs-info-light: #cffafe;     /* Light cyan background */
```

#### Neutral Colors
```css
/* Text Colors */
--gs-text-primary: #111827;    /* Primary text */
--gs-text-secondary: #6b7280;  /* Secondary text */
--gs-text-tertiary: #9ca3af;   /* Tertiary text */
--gs-text-inverse: #ffffff;    /* Text on dark backgrounds */

/* Background Colors */
--gs-bg-primary: #ffffff;      /* Primary background */
--gs-bg-secondary: #f9fafb;    /* Secondary background */
--gs-bg-tertiary: #f3f4f6;     /* Tertiary background */
--gs-bg-inverse: #111827;      /* Dark background */

/* Border Colors */
--gs-border-light: #e5e7eb;    /* Light borders */
--gs-border-medium: #d1d5db;   /* Medium borders */
--gs-border-dark: #9ca3af;     /* Dark borders */
```

### Typography

#### Font Stack
```css
/* Primary Font - Inter */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace Font */
font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
```

#### Typography Scale
```css
/* Display Headings */
--text-display-xl: 4.5rem;   /* 72px - Hero headings */
--text-display-lg: 3.75rem;  /* 60px - Large headings */
--text-display-md: 3rem;     /* 48px - Section headings */
--text-display-sm: 2.25rem;  /* 36px - Sub-section headings */

/* Headings */
--text-xl: 1.875rem;         /* 30px - H1 */
--text-lg: 1.5rem;           /* 24px - H2 */
--text-md: 1.25rem;          /* 20px - H3 */
--text-sm: 1.125rem;         /* 18px - H4 */

/* Body Text */
--text-base: 1rem;           /* 16px - Base body text */
--text-sm: 0.875rem;         /* 14px - Small text */
--text-xs: 0.75rem;          /* 12px - Caption text */
```

#### Font Weights
- **Light (300)**: Rarely used, only for large display text
- **Regular (400)**: Body text, descriptions
- **Medium (500)**: Emphasized body text, navigation
- **Semibold (600)**: Headings, important labels
- **Bold (700)**: Strong emphasis, primary CTAs only

### Iconography

#### Icon Style
- Use Lucide React icon library for consistency
- 24px default size for UI icons
- 16px for inline icons within text
- 32px+ for feature icons and illustrations
- Maintain 2px stroke width for custom icons

#### Icon Usage
- **Navigation**: Consistent icons for common actions (home, settings, user)
- **Status**: Clear visual indicators (check, warning, error, info)
- **Actions**: Intuitive icons for buttons and controls (save, delete, edit)
- **Content**: Relevant icons that enhance understanding

### Spacing and Layout

#### Grid System
- **Base unit**: 8px (0.5rem)
- **Common spacing**: 8px, 16px, 24px, 32px, 48px, 64px
- **Container max-width**: 1280px
- **Content max-width**: 768px for reading

#### Component Spacing
```css
/* Internal spacing */
--spacing-xs: 0.25rem;    /* 4px */
--spacing-sm: 0.5rem;     /* 8px */
--spacing-md: 1rem;       /* 16px */
--spacing-lg: 1.5rem;     /* 24px */
--spacing-xl: 2rem;       /* 32px */
--spacing-2xl: 3rem;      /* 48px */
--spacing-3xl: 4rem;      /* 64px */
```

## Voice and Tone

### Brand Voice Characteristics
- **Clear and Direct**: Communicate without jargon or confusion
- **Knowledgeable**: Demonstrate expertise without being condescending  
- **Supportive**: Help users succeed and overcome challenges
- **Professional**: Maintain credibility and trustworthiness
- **Encouraging**: Motivate users to explore and engage

### Tone Variations by Context

#### Dashboard/Interface
- **Tone**: Professional, efficient, helpful
- **Language**: Action-oriented, clear instructions
- **Example**: "Upload photos to get started" vs "Please select files to upload"

#### Error Messages
- **Tone**: Empathetic, solution-focused
- **Language**: Explain what happened and how to fix it
- **Example**: "Photo upload failed - please check your connection and try again"

#### Success Messages
- **Tone**: Celebratory but not overwhelming
- **Language**: Acknowledge accomplishment, suggest next steps
- **Example**: "Photos uploaded successfully! Ready to review and organize?"

#### Help Documentation
- **Tone**: Patient, thorough, encouraging
- **Language**: Step-by-step guidance with context
- **Example**: "Let's walk through setting up your first event"

### Writing Guidelines

#### Do's
- Use active voice ("Upload your photos" not "Photos can be uploaded")
- Write scannable content with headings and bullet points
- Use "you" to address users directly
- Keep sentences concise and focused
- Provide context for technical terms

#### Don'ts
- Use internal jargon or technical abbreviations
- Write in passive voice unnecessarily
- Create walls of text without breaks
- Assume users know company-specific processes
- Use placeholder text in production

## UI Component Standards

### Buttons
```css
/* Primary Button */
background: var(--gs-primary);
color: var(--gs-text-inverse);
border-radius: 6px;
padding: 12px 24px;
font-weight: 500;

/* Secondary Button */
background: transparent;
color: var(--gs-primary);
border: 1px solid var(--gs-primary);
```

### Cards
```css
background: var(--gs-bg-primary);
border: 1px solid var(--gs-border-light);
border-radius: 8px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
padding: 24px;
```

### Form Elements
```css
/* Input Fields */
border: 1px solid var(--gs-border-medium);
border-radius: 6px;
padding: 12px 16px;
font-size: 1rem;

/* Focus State */
border-color: var(--gs-primary);
box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
```

## Brand Applications

### Dashboard Interface
- Clean, minimal design emphasizing content
- Consistent navigation patterns
- Clear visual hierarchy
- Generous white space
- Purposeful use of color for status and actions

### Marketing Materials
- Hero sections with clear value propositions
- Feature callouts with supporting visuals
- Customer testimonials and social proof
- Clear calls-to-action using brand colors

### Email Communications
- Clean, scannable layouts
- Consistent header with logo
- Brand colors for important information
- Clear unsubscribe and contact information

## Brand Compliance

### Quality Checklist
- [ ] Logo used in approved format and colors
- [ ] Colors match brand palette specifications
- [ ] Typography follows established hierarchy
- [ ] Voice and tone appropriate for context
- [ ] Accessibility standards met (WCAG AA+)
- [ ] Consistent with other brand touchpoints

### Common Mistakes to Avoid
- Using unapproved logo variations or colors
- Inconsistent typography sizing or weights
- Mixing different icon styles
- Writing in overly casual or overly formal tone
- Poor color contrast ratios
- Ignoring responsive design principles

---

This brand guide ensures consistent, professional presentation of the GS brand across all digital experiences while maintaining flexibility for different contexts and user needs.