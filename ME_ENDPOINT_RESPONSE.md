# `/api/v1/users/me` Endpoint Response Structure

## For Travel Agents

When a travel agent calls `GET /api/v1/users/me`, they receive the following response structure:

```json
{
  "success": true,
  "data": {
    // Basic User Information
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "agent@example.com",
    "phone": "+2349012345678",
    "firstName": "John",
    "middleName": "Michael",
    "lastName": "Doe",
    "username": "johndoe",
    "fullName": "John Doe",
    "gender": "MALE",
    "dateOfBirth": "1990-01-15T00:00:00.000Z",
    "avatar": "https://example.com/avatar.jpg",
    "bio": "Travel agent bio",
    "website": "https://example.com",
    
    // NIN Information
    "nin": "12345678901",
    "ninVerified": true,
    "currentNinVerification": {
      "id": "nin-verification-uuid",
      "nin": "12345678901",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15T00:00:00.000Z",
      "gender": "MALE",
      "phoneNumber": "+2349012345678",
      "verificationStatus": "VERIFIED",
      "verificationDate": "2024-01-15T10:30:00.000Z",
      "city": "Lagos",
      "state": "Lagos",
      "country": "Nigeria",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    
    // Location
    "state": "Lagos",
    "lga": "Ikeja",
    "timezone": "Africa/Lagos",
    "locale": "en",
    
    // User Status
    "roles": ["AGENCY"],
    "status": "ACTIVE",
    "isVerified": true,
    "isActive": true,
    "onboardingPaid": true,
    "lastLoginAt": "2025-01-20T10:30:00.000Z",
    
    // Timestamps
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-20T10:30:00.000Z",
    "countryId": "country-uuid",
    
    // Addresses
    "addresses": [
      {
        "id": "address-uuid",
        "type": "HOME",
        "addressLine1": "123 Main Street",
        "addressLine2": "Suite 100",
        "city": "Lagos",
        "state": "Lagos",
        "postalCode": "100001",
        "country": "Nigeria",
        "isDefault": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "defaultAddress": {
      "id": "address-uuid",
      "type": "HOME",
      "addressLine1": "123 Main Street",
      "city": "Lagos",
      "isDefault": true
    },
    
    // Departments (if assigned)
    "departments": [
      {
        "id": "dept-uuid",
        "name": "Travel Services",
        "agency": "ASFAAR",
        "description": "Travel agent department",
        "logoUrl": "https://example.com/logo.png"
      }
    ],
    
    // Country (if assigned as embassy officer)
    "country": {
      "id": "country-uuid",
      "name": "Nigeria",
      "isoCode2": "NG",
      "isoCode3": "NGA",
      "flag": "https://example.com/flag.png",
      "logoUrl": "https://example.com/logo.png"
    },
    
    // Biometric Centers (if assigned)
    "biometricCenters": [
      {
        "id": "center-uuid",
        "name": "ASFAAR-ABUJA HQ",
        "code": "ASFAAR-ABJ-HQ",
        "address": "123 Main Street, Abuja",
        "city": "Abuja",
        "state": "FCT",
        "isActive": true
      }
    ],
    
    // ===== TRAVEL AGENT SPECIFIC DATA =====
    
    // Travel Agent Profile (Normalized Company Data)
    "travelAgentProfile": {
      "id": "profile-uuid",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "sourceApplicationId": "application-uuid",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z",
      
      // Company Information
      "company": {
        "id": "company-uuid",
        "profileId": "profile-uuid",
        "companyName": "ABC Travel Agency Ltd",
        "companyEmail": "info@abctravel.com",
        "companyPhone": "+2349012345678",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2025-01-20T10:30:00.000Z"
      },
      
      // Registration Information
      "registration": {
        "id": "registration-uuid",
        "profileId": "profile-uuid",
        "cacNumber": "RC123456",
        "cacDocumentUrl": "https://example.com/cac-document.pdf",
        "tinNumber": "12345678-0001",
        "taxClearanceDocumentUrl": "https://example.com/tax-clearance.pdf",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2025-01-20T10:30:00.000Z"
      },
      
      // Compliance Information
      "compliance": {
        "id": "compliance-uuid",
        "profileId": "profile-uuid",
        "nahconLicenseNumber": "NAHCON-2024-001",
        "nahconDocumentUrl": "https://example.com/nahcon-license.pdf",
        "dssClearanceNumber": "DSS-2024-001",
        "dssDocumentUrl": "https://example.com/dss-clearance.pdf",
        "efccScumlNumber": "EFCC-2024-001",
        "efccScumlDocumentUrl": "https://example.com/efcc-scuml.pdf",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2025-01-20T10:30:00.000Z"
      },
      
      // Certifications (IATA, NANTA)
      "certifications": {
        "id": "certifications-uuid",
        "profileId": "profile-uuid",
        "iataAccreditationNumber": "IATA-2024-001",
        "iataDocumentUrl": "https://example.com/iata-certificate.pdf",
        "nantaMembershipNumber": "NANTA-2024-001",
        "nantaDocumentUrl": "https://example.com/nanta-membership.pdf",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2025-01-20T10:30:00.000Z"
      },
      
      // Bank Account Information
      "bankAccount": {
        "id": "bank-account-uuid",
        "profileId": "profile-uuid",
        "bankName": "Access Bank",
        "bankCode": "044",
        "accountNumber": "1234567890",
        "accountName": "ABC Travel Agency Ltd",
        "isVerified": true,
        "verifiedAt": "2024-01-15T10:00:00.000Z",
        "verificationReference": "VER-REF-123456",
        "bankApiResponse": {
          "account_name": "ABC Travel Agency Ltd",
          "account_number": "1234567890"
        },
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      }
    },
    
    // Travel Agent License/Certificate
    "travelAgentLicense": {
      "id": "license-uuid",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "licenseNumber": "AGT-2025-000001",
      "licenseType": "REGULAR_TRAVEL_AGENT",
      "status": "ACTIVE",
      "issuedAt": "2024-01-15T10:00:00.000Z",
      "expiresAt": "2025-01-15T10:00:00.000Z",
      "applicationId": "application-uuid",
      "issuedBy": "admin-user-id",
      "revokedAt": null,
      "revokedBy": null,
      "revokeReason": null,
      "suspendedAt": null,
      "suspendedBy": null,
      "suspendedReason": null,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      
      // Related Application (minimal info)
      "application": {
        "id": "application-uuid",
        "applicationType": "REGULAR_TRAVEL_AGENT",
        "companyName": "ABC Travel Agency Ltd"
      }
    }
  }
}
```

## Important Notes

1. **`travelAgentProfile`** will be `null` if the agent hasn't been approved yet (no profile created)
2. **`travelAgentLicense`** will be `null` if the agent doesn't have a license yet
3. **Normalized Profile Structure**: The profile data is split into separate objects:
   - `company` - Company contact information
   - `registration` - CAC and TIN registration details
   - `compliance` - NAHCON, DSS, EFCC clearances
   - `certifications` - IATA and NANTA certifications
   - `bankAccount` - Bank account details (may be `null` if not provided)
4. **All nested objects** (`company`, `registration`, etc.) can be `null` if that data wasn't provided in the application
5. **`currentNinVerification`** is a single object (not an array) - the most recent NIN verification
6. **`ninVerifications`** array is NOT included in the response (excluded)

## For Non-Agents

For regular users (non-agents), the response will be the same structure but:
- `travelAgentProfile` will be `null`
- `travelAgentLicense` will be `null`
- `roles` will not include `"AGENCY"`



