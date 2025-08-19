### Biometric Data API

#### Overview

- Capture and manage applicant biometrics: photos, signatures, and fingerprints.
- Supports 442 fingerprints (4 left, 4 right, 2 thumbs) with per-finger quality and metadata.
- Allows upsert by application `referenceNumber` for biometric officer workflows.

#### Auth

- All endpoints require Bearer JWT: `Authorization: Bearer <token>`.

#### Base URL

- Examples assume: `API=/api/v1/biometric-data`

---

## Data Models (Simplified)

### BiometricData

- `id: string`
- `userId: string`, `submissionId?: string`
- `photoUrl?: string`, `photoHash?: string`, `photoMetadata?: object`
- `fingerprintData?: object`, `fingerprintHash?: string`, `fingerprintMetadata?: object`
- `signatureUrl?: string`, `signatureHash?: string`, `signatureMetadata?: object`
- `photoQualityScore?: number`, `fingerprintQualityScore?: number`, `overallQualityScore?: number`
- `isVerified: boolean`, `verificationStatus?: string`, `verificationNotes?: string`
- `capturedBy?: string`, `capturedAt?: string`, `captureDevice?: string`, `captureLocation?: string`
- `isEncrypted: boolean`, `encryptionKey?: string`, `dataRetentionPolicy?: string`
- `createdAt: string`, `updatedAt: string`, `createdBy?: string`, `lastModifiedBy?: string`
- `fingerprintFingers?: FingerprintData[]`

### FingerprintData (per finger)

- `fingerPosition: 'LEFT_THUMB'|'LEFT_INDEX'|'LEFT_MIDDLE'|'LEFT_RING'|'LEFT_LITTLE'|'RIGHT_THUMB'|'RIGHT_INDEX'|'RIGHT_MIDDLE'|'RIGHT_RING'|'RIGHT_LITTLE'`
- `fingerName: string`
- `templateFormat?: 'ISO-19794-2'|'ANSI-378'|'PROPRIETARY'`
- `templateData?: object` (encrypted payload + metadata)
- `templateHash?: string`
- `qualityScore?: number (0-100)`, `captureAttempts?: number`, `isAcceptable?: boolean`
- `capturedAt?: string`, `captureDevice?: string`, `captureMethod?: string`
- `metadata?: object`

---

## Endpoints

### Create/Update by Reference Number

POST `${API}/by-reference/:referenceNumber`

Request (any subset of fields from CreateBiometricDataDto):

```bash
curl -X POST "$HOST$API/by-reference/SA25001234" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "photoUrl": "https://cdn.example.com/photos/abc.jpg",
    "photoHash": "sha256:...",
    "photoQualityScore": 95,
    "capturedBy": "agent-uuid",
    "captureDevice": "Suprema G10",
    "captureLocation": "ABJ-CENTER-A/Booth-3",
    "isEncrypted": true
  }'
```

Response (200):

```json
{
  "id": "biodata-uuid",
  "userId": "user-uuid",
  "submissionId": "submission-uuid",
  "photoUrl": "https://cdn.example.com/photos/abc.jpg",
  "photoHash": "sha256:...",
  "photoQualityScore": 95,
  "isVerified": false,
  "capturedBy": "agent-uuid",
  "captureDevice": "Suprema G10",
  "captureLocation": "ABJ-CENTER-A/Booth-3",
  "isEncrypted": true,
  "createdAt": "2025-08-19T12:15:00.000Z",
  "updatedAt": "2025-08-19T12:15:00.000Z"
}
```

---

### Attach 442 Fingers by Reference

POST `${API}/by-reference/:referenceNumber/fingers`

Request (send 10 items or partial batches):

```bash
curl -X POST "$HOST$API/by-reference/SA25001234/fingers" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "fingerprintFingers": [
      {
        "fingerPosition": "LEFT_THUMB",
        "templateFormat": "ISO-19794-2",
        "templateData": {
          "encrypted": true,
          "algorithm": "AES-256-GCM",
          "template": "base64-encoded-encrypted-template",
          "version": "2011",
          "deviceInfo": {"manufacturer":"Suprema","model":"G10"}
        },
        "templateHash": "sha256:...",
        "qualityScore": 90,
        "isAcceptable": true,
        "captureAttempts": 1,
        "captureDevice": "Suprema G10",
        "captureMethod": "optical"
      }
    ]
  }'
```

Response (201):

```json
{ "biometricDataId": "biodata-uuid" }
```

---

### Create 442 Fingers by BiometricData ID

POST `${API}/:id/fingers`

Request:

```bash
curl -X POST "$HOST$API/biodata-uuid/fingers" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "fingerprintFingers": [
      {"fingerPosition":"LEFT_INDEX","templateFormat":"ISO-19794-2","templateData":{"encrypted":true,"template":"<base64>"},"qualityScore":88}
    ]
  }'
```

Response (201):

```json
{ "success": true }
```

---

### Update Single Finger

PATCH `${API}/:id/finger/:position`

Request:

```bash
curl -X PATCH "$HOST$API/biodata-uuid/finger/LEFT_THUMB" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "qualityScore": 95,
    "isAcceptable": true,
    "templateData": {"encrypted": true, "template": "<base64-new>"},
    "templateHash": "sha256:new..."
  }'
```

Response (200):

```json
{
  "id": "finger-uuid",
  "biometricDataId": "biodata-uuid",
  "fingerPosition": "LEFT_THUMB",
  "fingerName": "Left Thumb",
  "qualityScore": 95,
  "isAcceptable": true,
  "capturedAt": "2025-08-19T12:30:00.000Z",
  "captureDevice": "Suprema G10",
  "templateFormat": "ISO-19794-2"
}
```

---

### Get Biometric Data by ID

GET `${API}/:id`

Response (200):

```json
{
  "id": "biodata-uuid",
  "userId": "user-uuid",
  "submissionId": "submission-uuid",
  "photoUrl": "https://cdn.example.com/photos/abc.jpg",
  "photoQualityScore": 95,
  "fingerprintQualityScore": 88,
  "overallQualityScore": 90.8,
  "isVerified": false,
  "capturedBy": "agent-uuid",
  "captureDevice": "Suprema G10",
  "isEncrypted": true,
  "createdAt": "2025-08-19T12:15:00.000Z",
  "updatedAt": "2025-08-19T12:30:00.000Z",
  "fingerprintFingers": [
    {
      "fingerPosition": "LEFT_THUMB",
      "qualityScore": 90,
      "isAcceptable": true
    },
    {
      "fingerPosition": "RIGHT_THUMB",
      "qualityScore": 89,
      "isAcceptable": true
    }
  ]
}
```

---

### Get by User

GET `${API}/user/:userId`

Response (200):

```json
[
  { "id": "biodata-uuid-1", "submissionId": "sub-1", "isVerified": false },
  { "id": "biodata-uuid-2", "submissionId": "sub-2", "isVerified": true }
]
```

---

### Get by Submission

GET `${API}/submission/:submissionId`

Response (200):

```json
{ "id": "biodata-uuid", "submissionId": "submission-uuid", "isVerified": false }
```

---

### Verify Biometric Data

POST `${API}/:id/verify`

Request:

```bash
curl -X POST "$HOST$API/biodata-uuid/verify" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"verificationStatus":"VERIFIED","verificationNotes":"High quality"}'
```

Response (200):

```json
{
  "id": "biodata-uuid",
  "isVerified": true,
  "verificationStatus": "VERIFIED",
  "verificationNotes": "High quality"
}
```

---

### Stats Overview

GET `${API}/stats/overview`

Response (200):

```json
{
  "totalRecords": 120,
  "verifiedRecords": 96,
  "pendingVerification": 24,
  "qualityStats": {
    "average": { "photo": 89.2, "fingerprint": 86.5, "overall": 88.1 },
    "minimum": { "photo": 60, "fingerprint": 58, "overall": 59 },
    "maximum": { "photo": 99, "fingerprint": 98, "overall": 98 }
  }
}
```

---

## Notes & Best Practices

- Always send encrypted fingerprint templates; store only encrypted payload.
- Set `templateFormat` for interoperability (e.g., `ISO-19794-2` for Suprema G10).
- Use `referenceNumber` endpoints at capture stations to avoid extra ID lookups.
- Populate `templateHash` and `photoHash` for integrity verification.
- Aim for quality scores ≥ 70 for acceptance; retake if necessary.

---

### Upload Photo by Reference Number

POST `${API}/by-reference/:referenceNumber/photo`

Request (multipart/form-data):

```bash
curl -X POST "$HOST$API/by-reference/SA25001234/photo" \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@/path/to/photo.jpg"
```

Response (201):

```json
{
  "success": true,
  "photoUrl": "/uploads/biometrics/photos/1724061300-photo.jpg",
  "biometricData": {
    "id": "biodata-uuid",
    "userId": "user-uuid",
    "submissionId": "submission-uuid",
    "photoUrl": "/uploads/biometrics/photos/1724061300-photo.jpg",
    "isVerified": false,
    "capturedBy": "agent-uuid",
    "createdAt": "2025-08-19T12:15:00.000Z",
    "updatedAt": "2025-08-19T12:16:00.000Z"
  }
}
```

Notes

- Form field name is `photo`.
- The file is stored via local storage provider and URL saved to `biometric_data.photoUrl`.
