import { Module } from '@nestjs/common';
import { ProjectsModule } from '@modules/projects';
import { WorkItemsService } from './application/work-items.service';
import { WorkItemsController } from './interface/http/work-items.controller';
import { WorkItemDrizzleRepository } from './infrastructure/persistence/work-item.drizzle-repository';
import { ActivityLogDrizzleRepository } from './infrastructure/persistence/activity-log.drizzle-repository';
import { WORK_ITEM_REPOSITORY } from './domain/ports/work-item.repository';
import { ACTIVITY_LOG_REPOSITORY } from './domain/ports/activity-log.repository';

@Module({
  imports: [ProjectsModule],
  controllers: [WorkItemsController],
  providers: [
    WorkItemsService,
    { provide: WORK_ITEM_REPOSITORY, useClass: WorkItemDrizzleRepository },
    { provide: ACTIVITY_LOG_REPOSITORY, useClass: ActivityLogDrizzleRepository },
  ],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
