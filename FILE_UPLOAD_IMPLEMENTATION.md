# 📁 File Upload Implementation - Complete Guide

## 🎯 **Overview**

The file upload system validates uploads against specific form field configurations, ensuring that only valid files are accepted based on:

- **Field Type**: Must be a FILE field
- **File Size**: Based on field's `maxSize` configuration
- **File Types**: Based on field's `accept` array
- **Multiple Files**: Based on field's `multiple` flag

---

## 🚀 **API Endpoints**

### **1. Single File Upload**

```bash
POST /api/v1/submissions/upload/single
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>

Form Data:
- file: <binary_file>
- fieldId: "field-passport-copy-uuid" (required)
- submissionId: "draft-submission-uuid" (optional)
- metadata: {"purpose": "passport_copy"} (optional)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "fileUrl": "https://storage.example.com/uploads/user123_field456_1234567890_passport.pdf",
    "fileName": "passport.pdf",
    "fileSize": 2048000,
    "mimeType": "application/pdf",
    "fieldId": "field-passport-copy-uuid"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **2. Multiple Files Upload**

```bash
POST /api/v1/submissions/upload/multiple
Content-Type: multipart/form-data
Authorization: Bearer <JWT_TOKEN>

Form Data:
- files: <binary_file_1>
- files: <binary_file_2>
- fieldId: "field-passport-photos-uuid" (required)
- submissionId: "draft-submission-uuid" (optional)
- metadata: {"purpose": "passport_photos"} (optional)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "fileUrl": "https://storage.example.com/uploads/user123_field456_1234567890_photo1.jpg",
        "fileName": "photo1.jpg",
        "fileSize": 1024000,
        "mimeType": "image/jpeg"
      },
      {
        "fileUrl": "https://storage.example.com/uploads/user123_field456_1234567891_photo2.jpg",
        "fileName": "photo2.jpg",
        "fileSize": 1536000,
        "mimeType": "image/jpeg"
      }
    ],
    "fieldId": "field-passport-photos-uuid",
    "totalFiles": 2,
    "totalSize": 2560000
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🛡️ **Validation System**

### **Step 1: Global Validation**

- **File presence**: Ensures file is included
- **Global size limit**: 50MB per file maximum
- **Authentication**: JWT token required

### **Step 2: Field Lookup & Validation**

- **Field exists**: Validates fieldId exists in database
- **Field type**: Must be FILE type
- **Field configuration**: Loads fileTypes configuration

### **Step 3: Field-Specific Validation**

#### **File Size Validation**

```typescript
// Field Configuration Example
{
  "name": "passport_copy",
  "type": "FILE",
  "fileTypes": {
    "maxSize": "5MB"  // Parsed to 5242880 bytes
  }
}

// Validation Logic
if (file.size > parseFileSize(field.fileTypes.maxSize)) {
  throw new BadRequestException(
    `File size 7MB exceeds maximum allowed size 5MB`
  );
}
```

#### **File Type Validation**

```typescript
// Field Configuration Example
{
  "name": "passport_copy",
  "type": "FILE",
  "fileTypes": {
    "accept": ["application/pdf", "image/*", ".jpg", ".png"]
  }
}

// Validation Results:
// ✅ passport.pdf (application/pdf) - Direct MIME match
// ✅ photo.jpg (image/jpeg) - Wildcard match (image/*)
// ✅ photo.png - Extension match (.png)
// ❌ document.docx - Not in allowed types
```

#### **Multiple Files Validation**

```typescript
// Field Configuration Example
{
  "name": "passport_photos",
  "type": "FILE",
  "fileTypes": {
    "multiple": true  // Allows multiple files
  }
}

// If multiple: false and files.length > 1:
throw new BadRequestException('Multiple files not allowed for this field');
```

---

## 🔧 **Implementation Details**

### **Service Methods**

#### **1. uploadSingleFile()**

```typescript
async uploadSingleFile(
  userId: string,
  file: Express.Multer.File,
  uploadDto: FileUploadDto,
): Promise<{
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fieldId: string;
}>
```

**Process:**

1. Get field configuration by fieldId
2. Validate file against field requirements
3. Upload to storage service
4. Return file metadata

#### **2. uploadMultipleFiles()**

```typescript
async uploadMultipleFiles(
  userId: string,
  files: Express.Multer.File[],
  uploadDto: FileUploadDto,
): Promise<{
  files: FileMetadata[];
  fieldId: string;
  totalFiles: number;
  totalSize: number;
}>
```

**Process:**

1. Get field configuration by fieldId
2. Validate multiple files are allowed
3. Validate each file against field requirements
4. Upload all files to storage service in parallel
5. Return aggregated metadata

### **Helper Methods**

#### **File Type Validation**

```typescript
private validateFileType(file: Express.Multer.File, allowedTypes: string[]): boolean {
  for (const allowedType of allowedTypes) {
    // Wildcard match: */*
    if (allowedType === '*/*') return true;

    // Direct MIME type match: application/pdf
    if (file.mimetype === allowedType) return true;

    // Wildcard MIME type: image/*
    if (allowedType.includes('/*')) {
      const baseType = allowedType.split('/')[0];
      if (file.mimetype.startsWith(baseType + '/')) return true;
    }

    // File extension match: .pdf, .jpg
    if (allowedType.startsWith('.')) {
      const fileExt = '.' + file.originalname.split('.').pop()?.toLowerCase();
      if (fileExt === allowedType.toLowerCase()) return true;
    }
  }
  return false;
}
```

#### **File Size Parsing**

```typescript
private parseFileSize(sizeString: string): number {
  const units = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)$/i);

  if (!match) return 10 * 1024 * 1024; // Default 10MB

  const [, size, unit] = match;
  return parseFloat(size) * units[unit.toUpperCase()];
}

// Examples:
// "5MB" → 5242880 bytes
// "2.5GB" → 2684354560 bytes
// "500KB" → 512000 bytes
```

---

## 📋 **JavaScript/Frontend Examples**

### **Single File Upload**

```javascript
const uploadFile = async (file, fieldId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fieldId', fieldId);
  formData.append(
    'metadata',
    JSON.stringify({
      originalName: file.name,
      purpose: 'passport_copy',
      uploadedAt: new Date().toISOString(),
    }),
  );

  const response = await fetch('/api/v1/submissions/upload/single', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
};

// Usage
try {
  const result = await uploadFile(
    fileInput.files[0],
    'field-passport-copy-uuid',
  );
  console.log('Upload successful:', result.data.fileUrl);
} catch (error) {
  console.error('Upload failed:', error.message);
}
```

### **Multiple Files Upload**

```javascript
const uploadMultipleFiles = async (files, fieldId) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  formData.append('fieldId', fieldId);
  formData.append(
    'metadata',
    JSON.stringify({
      multipleFiles: true,
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
    }),
  );

  const response = await fetch('/api/v1/submissions/upload/multiple', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
};

// Usage with drag & drop
const handleDrop = async (event) => {
  event.preventDefault();
  const files = Array.from(event.dataTransfer.files);

  try {
    const result = await uploadMultipleFiles(
      files,
      'field-passport-photos-uuid',
    );
    console.log(`Uploaded ${result.data.totalFiles} files`);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
};
```

---

## ❌ **Error Handling Examples**

### **File Too Large**

```json
{
  "success": false,
  "message": "File size 12.5 MB exceeds maximum allowed size 5MB",
  "error": "Bad Request",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Invalid File Type**

```json
{
  "success": false,
  "message": "File type application/msword is not allowed. Allowed types: application/pdf, image/*",
  "error": "Bad Request",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Field Not Found**

```json
{
  "success": false,
  "message": "Form field with ID abc123 not found",
  "error": "Not Found",
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Not a File Field**

```json
{
  "success": false,
  "message": "Field is not a file upload field",
  "error": "Bad Request",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Multiple Files Not Allowed**

```json
{
  "success": false,
  "message": "Multiple files not allowed for this field",
  "error": "Bad Request",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔗 **Integration with Form Submission**

### **Complete Workflow**

#### **Step 1: Upload Files**

```javascript
// Upload passport copy
const passportResult = await uploadFile(
  passportFile,
  'field-passport-copy-uuid',
);

// Upload photos
const photosResult = await uploadMultipleFiles(
  photoFiles,
  'field-passport-photos-uuid',
);
```

#### **Step 2: Submit Form with File URLs**

```javascript
const submissionData = {
  formId: 'visa-form-uuid',
  responses: [
    {
      fieldId: 'field-first-name',
      fieldName: 'first_name',
      value: 'John',
    },
    {
      fieldId: 'field-passport-copy-uuid',
      fieldName: 'passport_copy',
      fileUrls: [passportResult.data.fileUrl],
    },
    {
      fieldId: 'field-passport-photos-uuid',
      fieldName: 'passport_photos',
      fileUrls: photosResult.data.files.map((f) => f.fileUrl),
    },
  ],
};

await submitForm(submissionData);
```

---

## 🎛️ **Field Configuration Examples**

### **Passport Copy Field**

```json
{
  "label": "Passport Copy",
  "name": "passport_copy",
  "type": "FILE",
  "required": true,
  "fileTypes": {
    "accept": ["application/pdf", "image/*"],
    "maxSize": "5MB",
    "multiple": false
  }
}
```

### **Supporting Documents Field**

```json
{
  "label": "Supporting Documents",
  "name": "supporting_docs",
  "type": "FILE",
  "required": false,
  "fileTypes": {
    "accept": [".pdf", ".doc", ".docx", "image/*"],
    "maxSize": "10MB",
    "multiple": true
  }
}
```

### **Photo Field**

```json
{
  "label": "Passport Photos",
  "name": "passport_photos",
  "type": "FILE",
  "required": true,
  "fileTypes": {
    "accept": ["image/jpeg", "image/png"],
    "maxSize": "2MB",
    "multiple": true
  }
}
```

---

## 🔧 **Configuration & Setup**

### **Environment Variables**

```bash
# Storage Configuration
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads
STORAGE_MAX_FILE_SIZE=10485760  # 10MB
STORAGE_ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,pdf,doc,docx

# For S3 Storage
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

### **Global Limits**

- **Max file size per request**: 50MB
- **Max files per multiple upload**: 10
- **Supported storage providers**: Local, S3, Cloudinary

---

## ✅ **Key Features**

1. **🔍 Field-based validation**: Each field can have different file requirements
2. **📏 Flexible size limits**: Parse human-readable sizes (5MB, 2.5GB, etc.)
3. **🎯 MIME type support**: Direct types, wildcards, and extensions
4. **📁 Multiple file control**: Per-field multiple file configuration
5. **🛡️ Security**: Type validation prevents malicious uploads
6. **🚀 Storage agnostic**: Works with any configured storage provider
7. **📝 Clear errors**: Detailed validation error messages
8. **📊 Rich metadata**: File size, type, and field information

---

## 🚀 **Ready to Use!**

The file upload system is now fully implemented and ready for production use. It provides robust validation, clear error messages, and seamless integration with the form submission workflow.

**Next Steps:**

1. Configure your preferred storage provider (Local/S3/Cloudinary)
2. Set up your form fields with appropriate fileTypes configurations
3. Implement frontend upload components using the provided examples
4. Test with various file types and sizes to ensure validation works correctly

🎉 **Happy uploading!**
