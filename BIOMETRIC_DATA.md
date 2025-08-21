# Biometric Data API Documentation

## Overview

The Biometric Data API provides comprehensive functionality for capturing, storing, and managing biometric information for visa applications. This includes fingerprint data (442 format), photo captures, and integration with the verification workflow.

## Data Models

### User Model Updates

The User model now includes a `ninVerified` field to track NIN verification status:

- **ninVerified**: Boolean field that indicates whether the user has successfully verified their NIN
- **Default value**: `false`
- **Updated automatically**: Set to `true` when NIN verification is completed successfully

### BiometricData

- **id**: Unique identifier
- **userId**: Reference to the user account
- **submissionId**: Reference to the form submission (optional)
- **photoUrl**: URL to the captured photo
- **photoHash**: Hash for photo integrity verification
- **encryptionKeyRef**: Reference to encryption key (not the actual key)
- **verificationStatus**: Current verification status
- **verificationNotes**: Notes from verification officers
- **lastModifiedBy**: ID of the last person who modified the record
- **fingerprintFingers**: Array of individual finger data (442 structure)

### FingerprintData

- **id**: Unique identifier
- **biometricDataId**: Reference to the parent biometric record
- **fingerPosition**: Position of the finger (LEFT_THUMB, LEFT_INDEX, etc.)
- **templateData**: Encrypted fingerprint template
- **templateFormat**: Format of the template (ISO_19794_2, ANSI_378, etc.)
- **qualityScore**: Quality score of the captured template
- **captureDate**: When the fingerprint was captured

## NIN Verification Workflow

### Overview

The NIN verification process follows this workflow:

1. **Initial Verification**: User submits NIN and date of birth for verification
2. **Temporary Storage**: Verification data is stored in `TempNINData` table
3. **Confirmation**: User confirms the verification data
4. **Permanent Storage**: Data is moved to `NinVerification` table and `ninVerified` is set to `true`

### API Endpoints

#### 1. Verify NIN

**POST** `/api/v1/auth/verify-nin`

Initiates NIN verification process.

**Request Body:**

```json
{
  "nin": "12345678901",
  "dateOfBirth": "1990-01-15"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tempNinId": "temp-nin-uuid",
    "data": {
      "nin": "12345678901",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "dateOfBirth": "1990-01-15",
      "gender": "MALE",
      "phoneNumber": "+2349012345678",
      "photo": "base64-encoded-photo",
      "address": {
        "line1": "123 Main Street",
        "city": "Lagos",
        "state": "Lagos",
        "lga": "Ikeja"
      }
    }
  }
}
```

#### 2. Confirm NIN

**POST** `/api/v1/auth/confirm-nin`

Confirms NIN verification and updates user profile.

**Request Body:**

```json
{
  "tempNinId": "temp-nin-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "message": "NIN verified and linked to user successfully"
}
```

**What happens:**

- User's `nin` field is updated with the verified NIN
- User's `ninVerified` field is set to `true`
- User's profile data (firstName, lastName, dateOfBirth, etc.) is updated
- Verification data is permanently stored in `NinVerification` table
- Temporary data is deleted from `TempNINData` table

### User Profile Response

When fetching user data (e.g., `/api/v1/users/me`), the response now includes:

```json
{
  "id": "user-uuid",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "nin": "12345678901",
  "ninVerified": true,
  "isVerified": true,
  "currentNinVerification": {
    "id": "nin-verification-uuid",
    "nin": "12345678901",
    "firstName": "John",
    "lastName": "Doe",
    "verificationStatus": "VERIFIED",
    "verificationDate": "2025-01-15T10:30:00Z"
  }
}
```

## API Endpoints

### 1. Create Biometric Data Record

**POST** `/api/v1/biometric-data`

Creates a new biometric data record for a user.

**Request Body:**

```json
{
  "userId": "user-uuid",
  "submissionId": "submission-uuid",
  "photoUrl": "https://example.com/photo.jpg",
  "photoHash": "sha256-hash",
  "verificationStatus": "PENDING",
  "verificationNotes": "Initial capture"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "biometric-uuid",
    "userId": "user-uuid",
    "submissionId": "submission-uuid",
    "photoUrl": "https://example.com/photo.jpg",
    "verificationStatus": "PENDING",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### 2. Create 442 Fingerprint Data

**POST** `/api/v1/biometric-data/:id/fingerprints`

Creates or updates fingerprint data for all 10 fingers (442 format).

**Request Body:**

```json
{
  "fingerprints": [
    {
      "fingerPosition": "LEFT_THUMB",
      "templateData": "base64-encoded-template",
      "templateFormat": "ISO_19794_2",
      "qualityScore": 85
    },
    {
      "fingerPosition": "LEFT_INDEX",
      "templateData": "base64-encoded-template",
      "templateFormat": "ISO_19794_2",
      "qualityScore": 90
    }
    // ... all 10 fingers
  ]
}
```

**Notes:**

- Uses upsert logic to prevent duplicates
- Supports ISO-19794-2, ANSI-378, and proprietary formats
- Automatically handles 442 structure (4 left, 4 right, 2 thumbs)

### 3. Submit by Reference Number

**POST** `/api/v1/biometric-data/by-reference/:referenceNumber`

Submit biometric data using application reference number instead of direct IDs.

**Request Body:**

```json
{
  "photoUrl": "https://example.com/photo.jpg",
  "photoHash": "sha256-hash",
  "fingerprints": [
    // ... fingerprint data
  ]
}
```

### 4. Photo Upload

**POST** `/api/v1/biometric-data/by-reference/:referenceNumber/photo`

Upload a photo for an applicant using multipart form data.

**Request:**

- **Content-Type**: `multipart/form-data`
- **Body**: Form with `photo` file field

**Response:**

```json
{
  "success": true,
  "data": {
    "photoUrl": "https://example.com/uploads/photo.jpg",
    "photoHash": "sha256-hash"
  }
}
```

## Verification Officer Actions

The verification officer dashboard provides three distinct actions for processing applications:

### 1. Flag Application

**POST** `/api/v1/dashboard/verification/applications/:submissionId/flag`

Flags an application for security review by a specific department.

**Request Body:**

```json
{
  "targetDepartment": "SECURITY_OFFICER",
  "flagReason": "Additional security screening required",
  "notes": "Applicant has travel history to restricted countries"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Application flagged and sent to SECURITY_OFFICER successfully",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### 2. Query Application

**POST** `/api/v1/dashboard/verification/applications/:submissionId/query`

Requests additional information or documents from the applicant.

**Request Body:**

```json
{
  "queryMessage": "Please provide additional proof of employment",
  "requiredDocuments": [
    "Employment letter from current employer",
    "Recent payslips (last 3 months)",
    "Bank statements showing salary deposits"
  ],
  "notes": "Employment verification incomplete"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Application queried and notification sent to applicant",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Email Notification:**

- Applicant receives an email with query details
- Includes required documents list
- Provides direct link to update and resubmit application

### 3. Process Application

**POST** `/api/v1/dashboard/verification/applications/:submissionId/process`

Sends verified application to embassy for final processing.

**Request Body:**

```json
{
  "processingNotes": "All documents verified and biometrics completed",
  "priority": "NORMAL"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Application verified and sent to embassy for processing (Priority: NORMAL)",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Applicant Update and Resubmission

When an application is queried, applicants can update and resubmit their applications:

### 1. View Queried Applications

**GET** `/api/v1/submissions/queried`

Get all applications that need additional information or documents.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "submission-uuid",
      "referenceNumber": "SA25000001",
      "status": "QUERIED",
      "queryMessage": "Please provide additional proof of employment",
      "requiredDocuments": ["Employment letter", "Payslips"],
      "queriedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### 2. Update and Resubmit

**PUT** `/api/v1/submissions/:id/resubmit`

Update a queried application and resubmit it for review.

**Request Body:**

```json
{
  "responses": [
    {
      "fieldId": "field-uuid",
      "fieldName": "employment_letter",
      "value": "Updated employment information",
      "fileUrls": ["https://example.com/employment_letter.pdf"]
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "submission-uuid",
    "status": "SUBMITTED",
    "isQueried": false,
    "queryResponse": "Application updated and resubmitted on 2025-01-15T10:30:00Z",
    "submittedAt": "2025-01-15T10:30:00Z"
  }
}
```

## Verification Dashboard

### Get Applications for Review

**GET** `/api/v1/dashboard/verification/applications\*\*

Retrieves applications ready for verification officer review.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status

**Response:**

```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "submission-uuid",
        "referenceNumber": "SA25000001",
        "status": "UNDER_REVIEW",
        "applicant": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com"
        },
        "formResponses": {
          "sections": [
            {
              "sectionName": "Personal Information",
              "groups": [
                {
                  "groupName": "Basic Details",
                  "fields": [
                    {
                      "fieldName": "first_name",
                      "value": "John",
                      "isCompleted": true,
                      "validationStatus": "valid"
                    }
                  ]
                }
              ]
            }
          ],
          "summary": {
            "totalFields": 25,
            "completedFields": 23,
            "completionPercentage": 92
          }
        },
        "biometricData": {
          "verificationStatus": "PENDING",
          "photoUrl": "https://example.com/photo.jpg"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### Get Verification Statistics

**GET** `/api/v1/dashboard/verification/stats`

Retrieves verification statistics for the dashboard.

**Response:**

```json
{
  "success": true,
  "data": {
    "pendingReview": 15,
    "flaggedToday": 3,
    "queriedToday": 5,
    "processingToday": 8,
    "averageVerificationTime": 45
  }
}
```

## Security and Best Practices

### Data Encryption

- Fingerprint templates are encrypted before storage
- Encryption keys are managed separately from the application
- Photo hashes ensure data integrity

### Access Control

- Biometric officers can only access their assigned applications
- Verification officers have read-only access to form data
- Applicants can only update their own queried applications

### Audit Trail

- All status changes are logged with timestamps
- User actions are tracked for compliance
- Complete history of verification decisions

### Data Retention

- Biometric data is retained according to regulatory requirements
- Temporary data is automatically cleaned up
- Archive policies are configurable

## Error Handling

### Common Error Responses

**400 Bad Request:**

```json
{
  "success": false,
  "message": "Invalid fingerprint data format",
  "error": "VALIDATION_ERROR"
}
```

**404 Not Found:**

```json
{
  "success": false,
  "message": "Application not found",
  "error": "NOT_FOUND"
}
```

**403 Forbidden:**

```json
{
  "success": false,
  "message": "Access denied to this application",
  "error": "FORBIDDEN"
}
```

## Integration Notes

### Frontend Considerations

- Form responses are structured hierarchically for easy rendering
- Completion status and validation information is included
- File uploads are handled through dedicated endpoints

### Email Notifications

- Automatic notifications for queried applications
- Configurable email templates
- Support for multiple email providers

### Status Workflow

- DRAFT → SUBMITTED → UNDER_REVIEW → QUERIED → SUBMITTED → PROCESSING
- FLAGGED applications go to security review
- PROCESSING applications are sent to embassy

## Support

For technical support or questions about the Biometric Data API, please contact the development team or refer to the internal documentation.
