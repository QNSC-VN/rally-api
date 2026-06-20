import { Module } from '@nestjs/common';
import { ProjectsService } from './application/projects.service';
import { ProjectsController } from './interface/http/projects.controller';
import { ProjectDrizzleRepository } from './infrastructure/persistence/project.drizzle-repository';
import { WorkflowStatusDrizzleRepository } from './infrastructure/persistence/workflow-status.drizzle-repository';
import { PROJECT_REPOSITORY } from './domain/ports/project.repository';
import { WORKFLOW_STATUS_REPOSITORY } from './domain/ports/workflow-status.repository';

@Module({
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    { provide: PROJECT_REPOSITORY, useClass: ProjectDrizzleRepository },
    { provide: WORKFLOW_STATUS_REPOSITORY, useClass: WorkflowStatusDrizzleRepository },
  ],
  exports: [ProjectsService, WORKFLOW_STATUS_REPOSITORY],
})
export class ProjectsModule {}
