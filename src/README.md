# ASFAAR API - Improved Codebase Structure

This document outlines the improved codebase structure for better organization and maintainability.

## 📁 Directory Structure

```
src/
├── common/                    # Shared utilities, decorators, guards, etc.
├── config/                    # Configuration files
├── core/                      # Core services (database, cache, etc.)
├── modules/                   # Feature modules
│   ├── travel-agent/         # Travel agent functionality
│   ├── travel-agent-upgrade/ # Travel agent upgrade system
│   └── ...                   # Other feature modules
├── schedulers/               # 🆕 Scheduled tasks and cron jobs
│   ├── schedulers.module.ts
│   ├── travel-agent-license-scheduler.service.ts
│   └── README.md
├── notifications/            # 🆕 Notification services
│   ├── notifications.module.ts
│   ├── travel-agent-license-notifications.service.ts
│   └── README.md
├── providers/                # External service providers
└── shared/                   # Shared services and utilities
```

## 🎯 Key Improvements

### 1. **Separation of Concerns**

- **Schedulers**: All cron jobs and scheduled tasks in one place
- **Notifications**: All notification services centralized
- **Modules**: Feature-specific business logic only

### 2. **Better Organization**

- **Dedicated Directories**: Each concern has its own directory
- **Clear Boundaries**: Schedulers and notifications are separate from business logic
- **Scalable Structure**: Easy to add new schedulers or notification services

### 3. **Improved Maintainability**

- **Single Responsibility**: Each directory has a clear purpose
- **Easy to Find**: Related functionality is grouped together
- **Documentation**: Each directory has its own README

## 🔧 New Architecture

### Schedulers Module

- **Purpose**: Handle all scheduled tasks and cron jobs
- **Location**: `src/schedulers/`
- **Services**: License expiration processing, notification triggers
- **Cron Jobs**: Daily, weekly, and custom schedules

### Notifications Module

- **Purpose**: Handle all notification services
- **Location**: `src/notifications/`
- **Services**: License expiration notifications, renewal reminders
- **Features**: Email, SMS, push notifications (extensible)

### Travel Agent Upgrade Module

- **Purpose**: Core business logic for travel agent upgrades
- **Location**: `src/modules/travel-agent-upgrade/`
- **Services**: Application processing, license management
- **Controllers**: User and admin endpoints

## 🚀 Benefits

1. **Better Code Organization**: Related functionality is grouped together
2. **Easier Testing**: Each module can be tested independently
3. **Scalability**: Easy to add new schedulers or notification types
4. **Maintainability**: Clear separation makes code easier to understand and modify
5. **Team Collaboration**: Different team members can work on different concerns

## 📋 Adding New Features

### Adding a New Scheduler

1. Create service in `src/schedulers/`
2. Add to `schedulers.module.ts`
3. Import `SchedulersModule` in `app.module.ts`

### Adding a New Notification Service

1. Create service in `src/notifications/`
2. Add to `notifications.module.ts`
3. Import `NotificationsModule` where needed

### Adding a New Feature Module

1. Create module in `src/modules/`
2. Add to `app.module.ts`
3. Follow existing patterns for consistency

## 🔍 Module Dependencies

```
AppModule
├── SchedulersModule
│   └── TravelAgentUpgradeModule (for license services)
├── NotificationsModule
│   └── TravelAgentUpgradeModule (for license services)
└── TravelAgentUpgradeModule
    ├── PrismaModule
    └── AuthModule
```

This structure ensures that:

- Schedulers can access license services
- Notifications can access license services
- All modules maintain proper dependency injection
- No circular dependencies exist
