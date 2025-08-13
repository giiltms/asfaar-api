# Dynamic Forms API Demo Guide

## Overview

This guide demonstrates the complete dynamic forms system implemented in the NestJS boilerplate. The system supports:

- **Form Template Creation**: Build complex forms with sections, groups, and various field types
- **Public Form Access**: Allow unauthenticated users to view and fill forms
- **Form Submissions**: Handle form responses with validation, file uploads, and draft auto-save
- **Admin Management**: Review, approve, reject, and analyze form submissions
- **Advanced Features**: Conditional fields, calculations, file uploads, digital signatures

## Prerequisites

1. Server running on `http://localhost:3000`
2. User authentication token (for authenticated endpoints)
3. Admin access (for admin endpoints)

## Demo Flow

### 1. Create a Form Template

First, let's create a tourist visa application form using our sample template:

```bash
# Create form template (requires authentication)
curl -X POST "http://localhost:3000/api/v1/forms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d @sample-visa-form.json
```

Required/important fields in the request body:

```json
{
  "name": "Tourist Visa Application Form",
  "description": "Complete tourist visa application form",
  "applicationType": "TOURIST", // Application Type CODE
  "countryId": "<UUID>", // Optional: link to a country
  "sections": [
    {
      "title": "Documents",
      "order": 1,
      "groups": [
        {
          "order": 1,
          "fields": [
            {
              "label": "Passport Copy",
              "name": "passport_copy",
              "type": "FILE",
              "required": true,
              "fileTypes": {
                "accept": ["image/*", "application/pdf"],
                "maxSize": "5MB",
                "multiple": false
              },
              "order": 1
            }
          ]
        }
      ]
    }
  ]
}
```

Notes:

- `applicationType` must be an existing Application Type code (e.g., `TOURIST`, `BUSINESS`).
- FILE fields should use `fileTypes` (accept, maxSize, multiple) instead of legacy `config.acceptedTypes`.
- You can still pass `countryId` to associate the form with a country.

Response:

```json
{
  "success": true,
  "data": {
    "id": "form-123-456",
    "name": "Tourist Visa Application Form",
    "description": "Complete tourist visa application form",
    "applicationType": { "code": "TOURIST", "name": "Tourist" },
    "sections": [...],
    "serviceFees": []
  }
}
```

### 2. Public Form Access (No Authentication)

Anyone can view available forms and get form templates for filling:

```bash
# Get available forms
curl "http://localhost:3000/api/v1/public/forms"

# Get specific form template
curl "http://localhost:3000/api/v1/public/forms/form-123-456"

# Get form preview with metadata
curl "http://localhost:3000/api/v1/public/forms/form-123-456/preview"
```

Preview Response:

```json
{
  "success": true,
  "data": {
    "id": "form-123-456",
    "name": "Tourist Visa Application Form",
    "estimatedTime": 15,
    "totalFields": 18,
    "requiredFields": 12,
    "sectionsCount": 3,
    "sections": [
      {
        "title": "Personal Information",
        "fieldsCount": 8
      }
    ]
  }
}
```

### 3. Form Submission Workflow

#### Step 1: Save Draft (Auto-save functionality)

```bash
# Save partial form data as draft
curl -X POST "http://localhost:3000/api/v1/submissions/draft" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "formId": "form-123-456",
    "responses": [
      {
        "fieldId": "field-first-name",
        "fieldName": "first_name",
        "value": "John"
      },
      {
        "fieldId": "field-email",
        "fieldName": "email",
        "value": "john@example.com"
      }
    ],
    "metadata": {
      "progress": 20,
      "currentSection": 1
    }
  }'
```

#### Step 2: Upload Files (for file fields)

```bash
# Upload passport copy
curl -X POST "http://localhost:3000/api/v1/submissions/upload/single" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -F "file=@passport.pdf" \
  -F "fieldId=field-passport-copy"
```

Response:

```json
{
  "success": true,
  "data": {
    "fileUrl": "https://storage.example.com/uploads/passport-1234.pdf",
    "fileName": "passport.pdf",
    "fileSize": 1048576
  }
}
```

#### Step 3: Submit Complete Form

```bash
# Submit completed form for review
curl -X POST "http://localhost:3000/api/v1/submissions/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "formId": "form-123-456",
    "responses": [
      {
        "fieldId": "field-first-name",
        "fieldName": "first_name",
        "value": "John"
      },
      {
        "fieldId": "field-last-name",
        "fieldName": "last_name",
        "value": "Doe"
      },
      {
        "fieldId": "field-email",
        "fieldName": "email",
        "value": "john@example.com"
      },
      {
        "fieldId": "field-passport-copy",
        "fieldName": "passport_copy",
        "fileUrls": ["https://storage.example.com/uploads/passport-1234.pdf"]
      },
      {
        "fieldId": "field-declaration",
        "fieldName": "declaration_truth",
        "value": true
      }
    ],
    "metadata": {
      "submitLocation": {
        "lat": 6.5244,
        "lng": 3.3792
      },
      "userAgent": "Mozilla/5.0...",
      "completedAt": "2024-01-15T10:30:00Z"
    }
  }'
```

### 4. User Submission Management

Users can manage their own submissions:

```bash
# Get my submissions
curl "http://localhost:3000/api/v1/submissions/my?status=SUBMITTED&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Get specific submission
curl "http://localhost:3000/api/v1/submissions/submission-789" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Update draft submission
curl -X PUT "http://localhost:3000/api/v1/submissions/submission-789" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "responses": [...]
  }'
```

### 5. Admin Submission Management

Admins can review and manage all submissions:

```bash
# Get all submissions with filtering
curl "http://localhost:3000/api/v1/admin/submissions?status=SUBMITTED&formId=form-123-456&page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Get submission analytics
curl "http://localhost:3000/api/v1/admin/submissions/analytics" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Review (approve/reject) submission
curl -X PUT "http://localhost:3000/api/v1/admin/submissions/submission-789/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "status": "APPROVED",
    "reviewNotes": "All documents are valid and complete."
  }'

# Get form statistics
curl "http://localhost:3000/api/v1/admin/submissions/form/form-123-456/stats" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 6. Form Builder APIs

Dynamically modify form templates:

```bash
# Add new section to form
curl -X POST "http://localhost:3000/api/v1/forms/form-123-456/sections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "title": "Additional Documents",
    "description": "Upload any additional supporting documents",
    "order": 4
  }'

# Add field to group
curl -X POST "http://localhost:3000/api/v1/forms/groups/group-456/fields" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "label": "Emergency Contact Phone",
    "name": "emergency_phone",
    "type": "TEXT",
    "required": true,
    "validation": {
      "pattern": "^\\+?[1-9]\\d{6,14}$"
    },
    "order": 5
  }'
```

#### Update a Form's Application Type

```bash
curl -X PUT "http://localhost:3000/api/v1/forms/<FORM_ID>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{ "applicationType": "BUSINESS" }'
```

#### Manage Application Types

```bash
# Create
auth POST /api/v1/application-types { code, name, description?, isActive? }

# List
auth GET  /api/v1/application-types?isActive=true&search=tour

# Get by code
auth GET  /api/v1/application-types/TOURIST

# Update by code
auth PUT  /api/v1/application-types/TOURIST { name?, description?, isActive?, code? }

# Delete by code
auth DELETE /api/v1/application-types/TOURIST
```

## Advanced Features

### Conditional Logic

Forms support conditional field visibility:

```json
{
  "label": "Spouse Details",
  "name": "spouse_details",
  "type": "TEXTAREA",
  "required": false,
  "visibilityCondition": {
    "field": "marital_status",
    "operator": "equals",
    "value": "married"
  }
}
```

### Calculated Fields

Fields can automatically calculate values:

```json
{
  "label": "Duration of Stay (days)",
  "name": "duration_days",
  "type": "NUMBER",
  "calculation": {
    "expression": "DATEDIFF(${departure_date}, ${arrival_date})",
    "dependencies": ["arrival_date", "departure_date"]
  }
}
```

### Field Types Supported

- `TEXT` - Single line text input
- `TEXTAREA` - Multi-line text input
- `NUMBER` - Numeric input with validation
- `DATE` - Date picker with constraints
- `SELECT` - Single selection dropdown
- `MULTISELECT` - Multiple selection
- `BOOLEAN` - Checkbox/toggle
- `FILE` - File upload with type/size restrictions
- `SIGNATURE` - Digital signature capture
- `GEOLOCATION` - Location coordinates

### Validation Features

- **Required Fields**: Mark fields as mandatory
- **Pattern Matching**: Regex validation for formats
- **Range Validation**: Min/max for numbers and dates
- **File Validation**: Type, size, and count restrictions
- **Cross-field Dependencies**: Validate against other field values

## Analytics & Reporting

The system provides comprehensive analytics:

```bash
# Overall submission analytics
curl "http://localhost:3000/api/v1/admin/submissions/analytics" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Response includes:

- Total submissions by status
- Submission trends over time
- Form-wise breakdown
- Completion rates
- Average completion time

## Error Handling

The API provides detailed error responses:

```json
{
  "success": false,
  "error": {
    "code": "400012",
    "message": "Field 'Full Name' is required",
    "details": {
      "field": "full_name",
      "type": "validation_error"
    }
  }
}
```

## Performance Features

- **Pagination**: All list endpoints support pagination
- **Filtering**: Advanced filtering options for submissions
- **Caching**: Form templates are efficiently cached
- **File Handling**: Secure file upload with size limits
- **Auto-save**: Real-time draft saving prevents data loss

## Security Features

- **Authentication**: JWT-based user authentication
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive input sanitization
- **File Security**: Safe file upload with type restrictions
- **Audit Trail**: Complete submission history tracking

This dynamic forms system provides a complete solution for creating, managing, and processing complex forms with enterprise-grade features and security.
