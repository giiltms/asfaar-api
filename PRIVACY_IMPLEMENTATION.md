# Privacy Implementation Guide

## Overview

This document describes the improved privacy implementation for application status filtering in the ASFAAR system. The implementation ensures that private application statuses are never visible to authorities, frontdesk staff, or other administrative roles.

## Privacy Protection Scope

### **🔒 Roles WITH Privacy Protection**

- **AUTHORITY**: Cannot see DRAFT, PENDING_PAYMENT, CANCELLED applications
- **FRONTDESK**: Cannot see DRAFT, PENDING_PAYMENT, CANCELLED applications

### **🌐 Roles WITHOUT Privacy Protection (Full Access)**

- **ADMIN**: Can see ALL statuses (full administrative access)
- **SUPER_ADMIN**: Can see ALL statuses (full administrative access)
- **APPLICANT**: Can see their own applications regardless of status

## Architecture

### 1. Centralized Privacy Service

**File**: `src/common/services/privacy.service.ts`

The `PrivacyService` provides a centralized way to handle privacy protection:

```typescript
// Get private statuses
const privateStatuses = PrivacyService.getPrivateStatuses();

// Check if a status is private
const isPrivate = PrivacyService.isPrivateStatus(SubmissionStatus.DRAFT);

// Create privacy-protected where clause
const whereClause =
  PrivacyService.createPrivacyProtectedWhereClause(requestedStatuses);
```

### 2. Privacy Guard

**File**: `src/common/guards/privacy.guard.ts`

Automatically blocks requests that try to access private data:

```typescript
@UseGuards(PrivacyGuard)
@Get('applications')
async getApplications() {
  // Private statuses are automatically blocked
}
```

### 3. Privacy Decorators

**File**: `src/common/decorators/privacy-protection.decorator.ts`

Provides clean decorators for privacy protection:

```typescript
@Get('applications')
async getApplications(
  @PrivacyProtected() statusFilter: SubmissionStatus[]
) {
  // statusFilter is automatically filtered to exclude private statuses
}
```

## Status Classification

### 🔒 Private Statuses (Hidden from Authorities)

- **`DRAFT`** - User is still working on application
- **`PENDING_PAYMENT`** - User submitted but payment not confirmed
- **`CANCELLED`** - User cancelled their own application

### 🌐 Public Statuses (Visible to Authorities)

- **`SUBMITTED`** - Application is ready for processing
- **`UNDER_REVIEW`** - Being reviewed by verification officers
- **`FLAGGED`** - Flagged for security review
- **`QUERIED`** - Has issues that need resolution
- **`PROCESSING`** - Embassy is processing
- **`PENDING_BIOMETRICS`** - Waiting for biometric capture
- **`APPROVED`** - Final approved state
- **`REJECTED`** - Final rejected state

## Implementation Examples

### 1. Authority Dashboard

```typescript
// OLD IMPLEMENTATION (Duplicated Logic)
const privateStatuses = [
  SubmissionStatus.DRAFT,
  SubmissionStatus.PENDING_PAYMENT,
  SubmissionStatus.CANCELLED,
];

if (filters.status && filters.status.length > 0) {
  const filteredStatuses = filters.status.filter(
    (status) => !privateStatuses.includes(status),
  );
  where.status = { in: filteredStatuses };
} else {
  where.status = { notIn: privateStatuses };
}

// NEW IMPLEMENTATION (Centralized)
const privacyWhere = PrivacyService.createPrivacyProtectedWhereClause(
  filters.status,
);
Object.assign(where, privacyWhere);
```

### 2. Frontdesk Dashboard

```typescript
// OLD IMPLEMENTATION (Magic Strings)
if (filters.status) {
  if (!privateStatuses.includes(filters.status)) {
    where.status = filters.status;
  } else {
    where.status = 'NONEXISTENT_STATUS'; // Magic string!
  }
}

// NEW IMPLEMENTATION (Clean)
const privacyWhere = PrivacyService.createPrivacyProtectedWhereClause(
  filters.status ? [filters.status] : undefined,
);
Object.assign(where, privacyWhere);
```

### 3. Controller with Guard

```typescript
@Controller('dashboard/authority')
@UseGuards(PrivacyGuard) // Automatically blocks private status requests
export class AuthorityController {
  @Get('applications')
  async getApplications(@Query() filters: ApplicationFiltersDto) {
    // Private statuses are automatically filtered out
    return this.service.getApplications(filters);
  }
}
```

## Benefits of Improved Implementation

### 1. **Centralized Logic**

- Single source of truth for privacy rules
- Easy to maintain and update
- Consistent behavior across all services

### 2. **Type Safety**

- TypeScript enums prevent typos
- Compile-time validation of status values
- Better IDE support and autocomplete

### 3. **Testability**

- Comprehensive test suite
- Easy to mock and test edge cases
- Clear test scenarios for privacy violations

### 4. **Security**

- Automatic validation of status requests
- Guards prevent unauthorized access
- Clear error messages for debugging

### 5. **Performance**

- Efficient filtering at the database level
- No unnecessary data transfer
- Optimized queries

## Usage Patterns

### 1. Basic Privacy Protection

```typescript
// Automatically excludes private statuses
const whereClause = PrivacyService.createPrivacyProtectedWhereClause();
```

### 2. Filtered Status Requests

```typescript
// Filters out private statuses from requested list
const whereClause = PrivacyService.createPrivacyProtectedWhereClause([
  SubmissionStatus.DRAFT, // Will be filtered out
  SubmissionStatus.SUBMITTED, // Will be included
  SubmissionStatus.UNDER_REVIEW, // Will be included
]);
```

### 3. Validation

```typescript
// Throws error if private statuses are requested
PrivacyService.validateStatusRequest([
  SubmissionStatus.DRAFT, // Will throw error
  SubmissionStatus.SUBMITTED, // Will pass
]);
```

## Testing

### Unit Tests

```bash
npm test -- --testPathPattern=privacy.service.spec.ts
```

### Integration Tests

```typescript
// Test that private statuses are never returned
const response = await request(app.getHttpServer())
  .get('/dashboard/authority/applications')
  .query({ status: 'DRAFT' })
  .expect(403); // Should be blocked by PrivacyGuard
```

## Migration Guide

### Step 1: Update Services

Replace duplicated privacy logic with centralized service:

```typescript
// Before
const privateStatuses = [SubmissionStatus.DRAFT, ...];
if (filters.status) {
  const filtered = filters.status.filter(s => !privateStatuses.includes(s));
  where.status = { in: filtered };
}

// After
const privacyWhere = PrivacyService.createPrivacyProtectedWhereClause(filters.status);
Object.assign(where, privacyWhere);
```

### Step 2: Add Guards

```typescript
@Controller('dashboard/authority')
@UseGuards(PrivacyGuard)
export class AuthorityController {
  // Controllers automatically protected
}
```

### Step 3: Update Tests

```typescript
// Test privacy protection
it('should block private status requests', async () => {
  await request(app.getHttpServer())
    .get('/dashboard/authority/applications')
    .query({ status: 'DRAFT' })
    .expect(403);
});
```

## Security Considerations

### 1. **No Override Possible**

- Private statuses cannot be accessed even with explicit requests
- Guards prevent bypassing privacy protection
- Database-level filtering ensures data integrity

### 2. **Audit Trail**

- All access attempts are logged
- Security monitoring for privacy violations
- Clear audit trail for compliance

### 3. **Role-Based Access**

- Different roles see different application sets
- User dashboards show all their applications
- Authority dashboards show only public applications

## Performance Impact

### 1. **Database Queries**

- Efficient `NOT IN` clauses for privacy filtering
- Indexed status columns for fast filtering
- Minimal performance overhead

### 2. **Memory Usage**

- Centralized service reduces code duplication
- Efficient status classification
- Minimal memory footprint

### 3. **Network Traffic**

- Reduced data transfer (private applications not sent)
- Smaller response payloads
- Better user experience

## Monitoring and Maintenance

### 1. **Privacy Metrics**

```typescript
const stats = PrivacyService.getPrivacyStats();
console.log(`Private statuses: ${stats.privateStatuses.length}`);
console.log(`Public statuses: ${stats.publicStatuses.length}`);
```

### 2. **Health Checks**

```typescript
// Verify privacy protection is working
const isWorking = PrivacyService.isPrivateStatus(SubmissionStatus.DRAFT);
console.log(`Privacy protection active: ${isWorking}`);
```

### 3. **Logging**

```typescript
// Log privacy violations
if (privateStatuses.length > 0) {
  logger.warn(`Privacy violation attempt: ${privateStatuses.join(', ')}`);
}
```

## Conclusion

The improved privacy implementation provides:

- ✅ **Centralized Logic**: Single source of truth
- ✅ **Type Safety**: Compile-time validation
- ✅ **Security**: Automatic protection against privacy violations
- ✅ **Performance**: Efficient database queries
- ✅ **Maintainability**: Easy to update and extend
- ✅ **Testability**: Comprehensive test coverage

This implementation ensures that user privacy is protected while maintaining system efficiency and maintainability.
