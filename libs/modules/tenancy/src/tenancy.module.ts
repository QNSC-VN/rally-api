import { Module } from '@nestjs/common';
import { TenancyService } from './application/tenancy.service';
import { TenantController, WorkspaceController } from './interface/http/tenancy.controller';
import { TenantDrizzleRepository } from './infrastructure/persistence/tenant.drizzle-repository';
import { WorkspaceDrizzleRepository } from './infrastructure/persistence/workspace.drizzle-repository';
import { WorkspaceMemberDrizzleRepository } from './infrastructure/persistence/workspace-member.drizzle-repository';
import { TENANT_REPOSITORY } from './domain/ports/tenant.repository';
import { WORKSPACE_REPOSITORY } from './domain/ports/workspace.repository';
import { WORKSPACE_MEMBER_REPOSITORY } from './domain/ports/workspace-member.repository';

@Module({
  controllers: [TenantController, WorkspaceController],
  providers: [
    TenancyService,
    { provide: TENANT_REPOSITORY, useClass: TenantDrizzleRepository },
    { provide: WORKSPACE_REPOSITORY, useClass: WorkspaceDrizzleRepository },
    { provide: WORKSPACE_MEMBER_REPOSITORY, useClass: WorkspaceMemberDrizzleRepository },
  ],
  exports: [TenancyService],
})
export class TenancyModule {}
