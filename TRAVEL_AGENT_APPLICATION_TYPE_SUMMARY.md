# Travel Agent Application Type Implementation

## Overview

Added support for different types of travel agent upgrade applications to distinguish between regular travel agents and NAHCON registered agents.

## Schema Changes

### 1. New Enum Added

```prisma
enum TravelAgentApplicationType {
  REGULAR_TRAVEL_AGENT
  NAHCON_REGISTERED_AGENT
}
```

### 2. Updated TravelAgentUpgradeApplication Model

```prisma
model TravelAgentUpgradeApplication {
  // ... existing fields ...

  // Application Type
  applicationType TravelAgentApplicationType @default(REGULAR_TRAVEL_AGENT)

  // ... rest of fields ...
}
```

## API Changes

### 1. Updated DTOs

#### CreateDraftApplicationDto

```typescript
export class CreateDraftApplicationDto {
  @ApiProperty({
    enum: TravelAgentApplicationType,
    description: 'Type of travel agent application',
    example: 'REGULAR_TRAVEL_AGENT',
  })
  @IsEnum(TravelAgentApplicationType)
  applicationType: TravelAgentApplicationType;

  // ... other fields ...
}
```

#### CreateUpgradeApplicationDto

```typescript
export class CreateUpgradeApplicationDto {
  @ApiProperty({
    enum: TravelAgentApplicationType,
    description: 'Type of travel agent application',
    example: 'REGULAR_TRAVEL_AGENT',
  })
  @IsEnum(TravelAgentApplicationType)
  applicationType: TravelAgentApplicationType;

  // ... other fields ...
}
```

### 2. Updated Service Interfaces

#### CreateDraftApplicationInput

```typescript
export interface CreateDraftApplicationInput {
  applicationType: TravelAgentApplicationType;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  // ... other fields ...
}
```

#### CreateUpgradeApplicationInput

```typescript
export interface CreateUpgradeApplicationInput {
  applicationType: TravelAgentApplicationType;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  // ... other fields ...
}
```

### 3. Updated Service Methods

Both `createDraftApplication` and `createUpgradeApplication` methods now include the `applicationType` field when creating applications in the database.

## Application Types

### REGULAR_TRAVEL_AGENT

- Standard travel agent application
- Default application type
- Standard processing workflow

### NAHCON_REGISTERED_AGENT

- NAHCON registered travel agent application
- May have different requirements or processing workflow
- Specific to NAHCON registered agents

## Database Migration

Created migration: `20251023191331_add_travel_agent_application_type`

This migration:

1. Adds the `TravelAgentApplicationType` enum
2. Adds the `applicationType` field to `TravelAgentUpgradeApplication` table
3. Sets default value to `REGULAR_TRAVEL_AGENT`

## API Usage Examples

### Create Draft Application (Regular Travel Agent)

```json
POST /travel-agent/upgrade/draft
{
  "applicationType": "REGULAR_TRAVEL_AGENT"
}
```

**Note**: Only `applicationType` is required. All other fields are optional and can be provided later.

### Create Draft Application (NAHCON Registered Agent)

```json
POST /travel-agent/upgrade/draft
{
  "applicationType": "NAHCON_REGISTERED_AGENT"
}
```

**Note**: Only `applicationType` is required. All other fields are optional and can be provided later.

## Benefits

1. **Clear Distinction**: Different application types can have different requirements
2. **Processing Flexibility**: Different workflows for different agent types
3. **Reporting**: Better analytics and reporting by application type
4. **Compliance**: Easier to track NAHCON registered vs regular agents
5. **Future Extensibility**: Easy to add more application types in the future

## Implementation Status

✅ **Schema Updated**: Added enum and field to model
✅ **Migration Applied**: Database schema updated
✅ **DTOs Updated**: Request/response DTOs include application type
✅ **Service Updated**: Service methods handle application type
✅ **Documentation Updated**: API documentation reflects new field
✅ **Build Successful**: All changes compile without errors

## Next Steps

1. **Frontend Integration**: Update frontend forms to include application type selection
2. **Validation Rules**: Add specific validation rules for different application types
3. **Processing Workflow**: Implement different processing workflows based on application type
4. **Reporting**: Add application type filtering to admin dashboards
5. **Analytics**: Track metrics by application type
