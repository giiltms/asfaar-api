# Schedulers

This directory contains all scheduled tasks and cron jobs for the application.

## Structure

- `schedulers.module.ts` - Main schedulers module that imports all scheduler services
- `travel-agent-license-scheduler.service.ts` - Handles license expiration processing and notifications

## Scheduled Tasks

### License Management

- **Daily at Midnight**: Process expired licenses (mark as EXPIRED)
- **Weekly (Monday 9 AM)**: Check licenses expiring in 30 days
- **Daily at 9 AM**: Check licenses expiring in 7 days
- **Daily at 2 PM**: Check licenses expiring in 1 day

## Adding New Schedulers

1. Create a new scheduler service in this directory
2. Add the service to `schedulers.module.ts`
3. Import the `SchedulersModule` in `app.module.ts`

## Example Scheduler Service

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MySchedulerService {
  private readonly logger = new Logger(MySchedulerService.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async myScheduledTask() {
    this.logger.log('Running scheduled task...');
    // Your scheduled logic here
  }
}
```
