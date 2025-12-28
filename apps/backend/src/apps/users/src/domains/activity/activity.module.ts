import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogEntity } from 'src/db/entities/audit-log.entity';
import { UserSessionEntity } from 'src/db/entities/user-session.entity';

import { ActivityService } from './activity.service';
import { ActivityResolver } from './activity.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity, UserSessionEntity])],
  providers: [ActivityService, ActivityResolver],
  exports: [ActivityService],
})
export class ActivityModule {}
