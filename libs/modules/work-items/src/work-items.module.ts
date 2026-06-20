import { Module } from '@nestjs/common';
import { ProjectsModule } from '@modules/projects';
import { WorkItemsService } from './application/work-items.service';
import { WorkItemsController } from './interface/http/work-items.controller';
import { WorkItemDrizzleRepository } from './infrastructure/persistence/work-item.drizzle-repository';
import { WORK_ITEM_REPOSITORY } from './domain/ports/work-item.repository';

@Module({
  imports: [ProjectsModule],
  controllers: [WorkItemsController],
  providers: [
    WorkItemsService,
    { provide: WORK_ITEM_REPOSITORY, useClass: WorkItemDrizzleRepository },
  ],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
