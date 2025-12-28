import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  In,
} from 'typeorm';

import { AuditLogEntity } from 'src/db/entities/audit-log.entity';
import { UserSessionEntity } from 'src/db/entities/user-session.entity';
import { AuditAction } from 'src/common/enums/audit-action.enum';

import {
  ActivityLogEntry,
  ActivityLogPage,
  ActivityLogFilters,
  SessionInfo,
  SessionsPage,
  ActivitySummary,
} from './dto/activity.dto';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
    @InjectRepository(UserSessionEntity)
    private readonly sessionRepository: Repository<UserSessionEntity>,
  ) {}

  /**
   * Get paginated activity log for a user
   */
  async getActivityLog(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    filters?: ActivityLogFilters,
  ): Promise<ActivityLogPage> {
    const where: FindOptionsWhere<AuditLogEntity> = { userId };

    // Apply filters
    if (filters?.actions?.length) {
      where.action = In(filters.actions);
    }
    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters?.startDate) {
      where.timestamp = MoreThanOrEqual(filters.startDate);
    }
    if (filters?.endDate) {
      where.timestamp = LessThanOrEqual(filters.endDate);
    }
    if (filters?.successOnly !== undefined) {
      where.success = filters.successOnly;
    }

    const [logs, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });

    const items: ActivityLogEntry[] = logs.map((log) =>
      this.mapAuditLogToEntry(log),
    );

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * Get user's sessions
   */
  async getSessions(
    userId: string,
    currentSessionToken?: string,
    includeRevoked: boolean = false,
  ): Promise<SessionsPage> {
    const where: FindOptionsWhere<UserSessionEntity> = { userId };

    if (!includeRevoked) {
      where.isActive = true;
    }

    const [sessions, total] = await this.sessionRepository.findAndCount({
      where,
      order: { lastActivityAt: 'DESC', createdAt: 'DESC' },
    });

    const items: SessionInfo[] = sessions.map((session) =>
      this.mapSessionToInfo(session, currentSessionToken),
    );

    return { items, total };
  }

  /**
   * Get a specific session
   */
  async getSession(
    userId: string,
    sessionId: string,
    currentSessionToken?: string,
  ): Promise<SessionInfo | null> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return null;
    }

    return this.mapSessionToInfo(session, currentSessionToken);
  }

  /**
   * Revoke a session
   */
  async revokeSession(
    userId: string,
    sessionId: string,
    reason: string = 'user_logout',
  ): Promise<boolean> {
    const result = await this.sessionRepository.update(
      { id: sessionId, userId },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    );

    return (result.affected ?? 0) > 0;
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(
    userId: string,
    exceptSessionToken?: string,
    reason: string = 'user_logout_all',
  ): Promise<number> {
    const sessions = await this.sessionRepository.find({
      where: { userId, isActive: true },
    });

    let revokedCount = 0;
    for (const session of sessions) {
      if (session.sessionToken !== exceptSessionToken) {
        await this.sessionRepository.update(session.id, {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: reason,
        });
        revokedCount++;
      }
    }

    return revokedCount;
  }

  /**
   * Get activity summary for a user
   */
  async getActivitySummary(userId: string): Promise<ActivitySummary> {
    // Get action counts
    const totalActions = await this.auditLogRepository.count({
      where: { userId },
    });

    const successfulActions = await this.auditLogRepository.count({
      where: { userId, success: true },
    });

    const failedActions = await this.auditLogRepository.count({
      where: { userId, success: false },
    });

    // Get session counts
    const activeSessions = await this.sessionRepository.count({
      where: { userId, isActive: true },
    });

    // Get last login
    const lastLogin = await this.auditLogRepository.findOne({
      where: { userId, action: AuditAction.LOGIN },
      order: { timestamp: 'DESC' },
    });

    // Get last activity
    const lastActivity = await this.auditLogRepository.findOne({
      where: { userId },
      order: { timestamp: 'DESC' },
    });

    return {
      totalActions,
      successfulActions,
      failedActions,
      activeSessions,
      lastLoginAt: lastLogin?.timestamp,
      lastActivityAt: lastActivity?.timestamp,
    };
  }

  /**
   * Parse user agent to extract device info
   */
  private parseUserAgent(userAgent?: string): {
    deviceType?: string;
    browser?: string;
  } {
    if (!userAgent) {
      return {};
    }

    let deviceType = 'desktop';
    if (/mobile/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    let browser: string | undefined;
    if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) {
      browser = 'Chrome';
    } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
      browser = 'Safari';
    } else if (/firefox/i.test(userAgent)) {
      browser = 'Firefox';
    } else if (/edge/i.test(userAgent)) {
      browser = 'Edge';
    }

    return { deviceType, browser };
  }

  private mapAuditLogToEntry(log: AuditLogEntity): ActivityLogEntry {
    const { deviceType, browser } = this.parseUserAgent(log.userAgent);

    return {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      operationName: log.operationName,
      operationType: log.operationType,
      success: log.success,
      errorMessage: log.errorMessage,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      deviceType,
      browser,
      timestamp: log.timestamp,
    };
  }

  private mapSessionToInfo(
    session: UserSessionEntity,
    currentSessionToken?: string,
  ): SessionInfo {
    return {
      id: session.id,
      deviceType: session.deviceType,
      deviceName: session.deviceName,
      browser: session.browser,
      operatingSystem: session.operatingSystem,
      city: session.city,
      region: session.region,
      country: session.country,
      isActive: session.isActive,
      isCurrent: session.sessionToken === currentSessionToken,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
    };
  }
}
