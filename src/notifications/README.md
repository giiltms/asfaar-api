# Notifications

This directory contains all notification services for the application.

## Structure

- `notifications.module.ts` - Main notifications module that imports all notification services
- `travel-agent-license-notifications.service.ts` - Handles license expiration notifications

## Notification Services

### License Notifications

- **Expiration Notifications**: Send notifications for licenses expiring within specified days
- **Renewal Reminders**: Send renewal reminder notifications for all expiring licenses
- **Statistics**: Track notification success/failure rates

## Adding New Notification Services

1. Create a new notification service in this directory
2. Add the service to `notifications.module.ts`
3. Import the `NotificationsModule` where needed

## Example Notification Service

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MyNotificationService {
  private readonly logger = new Logger(MyNotificationService.name);

  async sendNotification(message: string, recipient: string) {
    this.logger.log(`Sending notification to ${recipient}: ${message}`);
    // Your notification logic here
  }
}
```
