/**
 * Activity Integration Tests
 *
 * Tests activity tracking operations against real database.
 * Covers AuditLog, UserSession, and UserLogin entities.
 *
 * Note: GraphQL queries for activity (myActivityLog, mySessions, etc.)
 * require JWT authentication. These tests focus on database operations.
 */
import {
  cleanDatabase,
  disconnectDatabase,
  createUser,
  createAuditLog,
  createUserSession,
  createUserLogin,
  getDbService,
} from '../utils';

describe('Activity Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Database Operations: AuditLog', () => {
    it('should create an audit log record', async () => {
      const user = await createUser({ email: 'audit-test@example.com' });

      const log = await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        operationName: 'login',
        operationType: 'mutation',
        success: true,
      });

      expect(log).toBeDefined();
      expect(log.id).toBeDefined();
      expect(log.userId).toBe(user.id);
      expect(log.action).toBe('LOGIN');
      expect(log.entityType).toBe('User');
      expect(log.success).toBe(true);
    });

    it('should find audit logs by user ID', async () => {
      const user = await createUser({ email: 'audit-find@example.com' });

      await createAuditLog({
        userId: user.id,
        action: 'LOGIN',
        success: true,
      });
      await createAuditLog({
        userId: user.id,
        action: 'READ',
        entityType: 'Document',
        success: true,
      });
      await createAuditLog({
        userId: user.id,
        action: 'UPDATE',
        entityType: 'Profile',
        success: false,
        errorMessage: 'Validation error',
      });

      const db = await getDbService();
      const logs = await db.auditLog.findMany({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
      });

      expect(logs).toHaveLength(3);
      expect(logs.map((l) => l.action)).toContain('LOGIN');
      expect(logs.map((l) => l.action)).toContain('READ');
      expect(logs.map((l) => l.action)).toContain('UPDATE');
    });

    it('should filter audit logs by action', async () => {
      const user = await createUser({ email: 'audit-filter@example.com' });

      await createAuditLog({ userId: user.id, action: 'LOGIN' });
      await createAuditLog({ userId: user.id, action: 'LOGIN' });
      await createAuditLog({ userId: user.id, action: 'LOGOUT' });

      const db = await getDbService();
      const loginLogs = await db.auditLog.findMany({
        where: { userId: user.id, action: 'LOGIN' },
      });

      expect(loginLogs).toHaveLength(2);
      loginLogs.forEach((log) => expect(log.action).toBe('LOGIN'));
    });

    it('should filter audit logs by success status', async () => {
      const user = await createUser({ email: 'audit-success@example.com' });

      await createAuditLog({
        userId: user.id,
        action: 'CREATE',
        success: true,
      });
      await createAuditLog({
        userId: user.id,
        action: 'CREATE',
        success: false,
        errorMessage: 'Failed',
      });
      await createAuditLog({
        userId: user.id,
        action: 'UPDATE',
        success: true,
      });

      const db = await getDbService();
      const failedLogs = await db.auditLog.findMany({
        where: { userId: user.id, success: false },
      });

      expect(failedLogs).toHaveLength(1);
      expect(failedLogs[0].errorMessage).toBe('Failed');
    });

    it('should filter audit logs by date range', async () => {
      const user = await createUser({ email: 'audit-date@example.com' });
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const twoDaysAgo = new Date(now.getTime() - 172800000);

      await createAuditLog({
        userId: user.id,
        action: 'OLD',
        timestamp: twoDaysAgo,
      });
      await createAuditLog({
        userId: user.id,
        action: 'YESTERDAY',
        timestamp: yesterday,
      });
      await createAuditLog({
        userId: user.id,
        action: 'TODAY',
        timestamp: now,
      });

      const db = await getDbService();
      const recentLogs = await db.auditLog.findMany({
        where: {
          userId: user.id,
          timestamp: { gte: yesterday },
        },
        orderBy: { timestamp: 'asc' },
      });

      expect(recentLogs).toHaveLength(2);
      expect(recentLogs[0].action).toBe('YESTERDAY');
      expect(recentLogs[1].action).toBe('TODAY');
    });

    it('should store IP address and user agent', async () => {
      const log = await createAuditLog({
        action: 'LOGIN',
        ipAddress: '192.168.1.100',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
      });

      const db = await getDbService();
      const found = await db.auditLog.findUnique({ where: { id: log.id } });

      expect(found?.ipAddress).toBe('192.168.1.100');
      expect(found?.userAgent).toContain('Chrome');
    });

    it('should paginate audit logs', async () => {
      const user = await createUser({ email: 'audit-page@example.com' });

      for (let i = 0; i < 15; i++) {
        await createAuditLog({
          userId: user.id,
          action: `ACTION_${i}`,
        });
      }

      const db = await getDbService();
      const page1 = await db.auditLog.findMany({
        where: { userId: user.id },
        take: 10,
        orderBy: { timestamp: 'desc' },
      });
      const page2 = await db.auditLog.findMany({
        where: { userId: user.id },
        skip: 10,
        take: 10,
        orderBy: { timestamp: 'desc' },
      });

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(5);
    });
  });

  describe('Database Operations: UserSession', () => {
    it('should create a user session', async () => {
      const user = await createUser({ email: 'session-test@example.com' });

      const session = await createUserSession({
        userId: user.id,
        deviceType: 'desktop',
        browser: 'Chrome',
        operatingSystem: 'macOS',
        ipAddress: '192.168.1.1',
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(user.id);
      expect(session.deviceType).toBe('desktop');
      expect(session.browser).toBe('Chrome');
      expect(session.isActive).toBe(true);
    });

    it('should find a session by ID', async () => {
      const user = await createUser({ email: 'session-find@example.com' });
      const session = await createUserSession({ userId: user.id });

      const db = await getDbService();
      const found = await db.userSession.findUnique({
        where: { id: session.id },
      });

      expect(found).toBeDefined();
      expect(found?.id).toBe(session.id);
      expect(found?.sessionToken).toBe(session.sessionToken);
    });

    it('should list active sessions for a user', async () => {
      const user = await createUser({ email: 'session-list@example.com' });

      await createUserSession({
        userId: user.id,
        deviceType: 'desktop',
        isActive: true,
      });
      await createUserSession({
        userId: user.id,
        deviceType: 'mobile',
        isActive: true,
      });
      await createUserSession({
        userId: user.id,
        deviceType: 'tablet',
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'user_logout',
      });

      const db = await getDbService();
      const activeSessions = await db.userSession.findMany({
        where: { userId: user.id, isActive: true },
      });

      expect(activeSessions).toHaveLength(2);
      activeSessions.forEach((s) => expect(s.isActive).toBe(true));
    });

    it('should revoke a session', async () => {
      const user = await createUser({ email: 'session-revoke@example.com' });
      const session = await createUserSession({ userId: user.id });

      const db = await getDbService();
      const revoked = await db.userSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: 'user_logout',
        },
      });

      expect(revoked.isActive).toBe(false);
      expect(revoked.revokedAt).toBeDefined();
      expect(revoked.revokedReason).toBe('user_logout');
    });

    it('should update last activity timestamp', async () => {
      const user = await createUser({ email: 'session-activity@example.com' });
      const session = await createUserSession({ userId: user.id });
      const originalActivity = session.lastActivityAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const db = await getDbService();
      const updated = await db.userSession.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() },
      });

      expect(updated.lastActivityAt?.getTime()).toBeGreaterThan(
        originalActivity?.getTime() ?? 0,
      );
    });

    it('should store geo-location data', async () => {
      const user = await createUser({ email: 'session-geo@example.com' });

      const session = await createUserSession({
        userId: user.id,
        city: 'San Francisco',
        region: 'California',
        country: 'US',
      });

      const db = await getDbService();
      const found = await db.userSession.findUnique({
        where: { id: session.id },
      });

      expect(found?.city).toBe('San Francisco');
      expect(found?.region).toBe('California');
      expect(found?.country).toBe('US');
    });

    it('should find expired sessions', async () => {
      const user = await createUser({ email: 'session-expired@example.com' });
      const now = new Date();
      const pastExpiry = new Date(now.getTime() - 86400000); // Yesterday
      const futureExpiry = new Date(now.getTime() + 86400000); // Tomorrow

      await createUserSession({
        userId: user.id,
        expiresAt: pastExpiry,
      });
      await createUserSession({
        userId: user.id,
        expiresAt: futureExpiry,
      });

      const db = await getDbService();
      const expiredSessions = await db.userSession.findMany({
        where: { userId: user.id, expiresAt: { lt: now } },
      });

      expect(expiredSessions).toHaveLength(1);
    });

    it('should cascade delete sessions when user is deleted', async () => {
      const user = await createUser({ email: 'session-cascade@example.com' });
      await createUserSession({ userId: user.id });
      await createUserSession({ userId: user.id });

      const db = await getDbService();

      // Verify sessions exist
      let sessions = await db.userSession.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(2);

      // Delete user (should cascade to sessions)
      await db.user.delete({ where: { id: user.id } });

      // Verify sessions are deleted
      sessions = await db.userSession.findMany({ where: { userId: user.id } });
      expect(sessions).toHaveLength(0);
    });
  });

  describe('Database Operations: UserLogin', () => {
    it('should create a user login record', async () => {
      const user = await createUser({ email: 'login-test@example.com' });

      const login = await createUserLogin({
        userId: user.id,
        lastLoginAt: new Date(),
        loginCount: 1,
      });

      expect(login).toBeDefined();
      expect(login.userId).toBe(user.id);
      expect(login.loginCount).toBe(1);
      expect(login.failedLoginAttempts).toBe(0);
    });

    it('should track login count', async () => {
      const user = await createUser({ email: 'login-count@example.com' });
      await createUserLogin({ userId: user.id, loginCount: 0 });

      const db = await getDbService();

      // Simulate multiple logins
      for (let i = 1; i <= 5; i++) {
        await db.userLogin.update({
          where: { userId: user.id },
          data: {
            loginCount: i,
            lastLoginAt: new Date(),
          },
        });
      }

      const updated = await db.userLogin.findUnique({
        where: { userId: user.id },
      });
      expect(updated?.loginCount).toBe(5);
    });

    it('should track failed login attempts', async () => {
      const user = await createUser({ email: 'login-failed@example.com' });
      await createUserLogin({ userId: user.id });

      const db = await getDbService();

      // Simulate failed attempts
      const updated = await db.userLogin.update({
        where: { userId: user.id },
        data: { failedLoginAttempts: 3 },
      });

      expect(updated.failedLoginAttempts).toBe(3);
    });

    it('should lock account after too many failed attempts', async () => {
      const user = await createUser({ email: 'login-locked@example.com' });
      await createUserLogin({ userId: user.id });

      const db = await getDbService();
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes

      const locked = await db.userLogin.update({
        where: { userId: user.id },
        data: {
          failedLoginAttempts: 5,
          lockedUntil: lockUntil,
        },
      });

      expect(locked.failedLoginAttempts).toBe(5);
      expect(locked.lockedUntil).toBeDefined();
      expect(locked.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reset failed attempts on successful login', async () => {
      const user = await createUser({ email: 'login-reset@example.com' });
      await createUserLogin({
        userId: user.id,
        failedLoginAttempts: 3,
      });

      const db = await getDbService();

      // Simulate successful login
      const updated = await db.userLogin.update({
        where: { userId: user.id },
        data: {
          failedLoginAttempts: 0,
          loginCount: { increment: 1 },
          lastLoginAt: new Date(),
          lockedUntil: null,
        },
      });

      expect(updated.failedLoginAttempts).toBe(0);
      expect(updated.lockedUntil).toBeNull();
    });

    it('should cascade delete login record when user is deleted', async () => {
      const user = await createUser({ email: 'login-cascade@example.com' });
      await createUserLogin({ userId: user.id });

      const db = await getDbService();

      // Verify login exists
      let login = await db.userLogin.findUnique({ where: { userId: user.id } });
      expect(login).toBeDefined();

      // Delete user (should cascade to login)
      await db.user.delete({ where: { id: user.id } });

      // Verify login is deleted
      login = await db.userLogin.findUnique({ where: { userId: user.id } });
      expect(login).toBeNull();
    });

    it('should enforce unique userId constraint', async () => {
      const user = await createUser({ email: 'login-unique@example.com' });
      await createUserLogin({ userId: user.id });

      // Attempting to create another login for the same user should fail
      await expect(createUserLogin({ userId: user.id })).rejects.toThrow();
    });
  });

  describe('Database Operations: Activity Summary', () => {
    it('should calculate activity summary for a user', async () => {
      const user = await createUser({ email: 'summary-test@example.com' });

      // Create some audit logs
      await createAuditLog({ userId: user.id, action: 'LOGIN', success: true });
      await createAuditLog({ userId: user.id, action: 'READ', success: true });
      await createAuditLog({
        userId: user.id,
        action: 'UPDATE',
        success: false,
      });

      // Create sessions
      await createUserSession({ userId: user.id, isActive: true });
      await createUserSession({
        userId: user.id,
        isActive: false,
        revokedAt: new Date(),
      });

      const db = await getDbService();

      // Calculate summary
      const [logs, activeSessions] = await Promise.all([
        db.auditLog.findMany({ where: { userId: user.id } }),
        db.userSession.count({ where: { userId: user.id, isActive: true } }),
      ]);

      const successfulActions = logs.filter((l) => l.success).length;
      const failedActions = logs.filter((l) => !l.success).length;

      expect(logs.length).toBe(3);
      expect(successfulActions).toBe(2);
      expect(failedActions).toBe(1);
      expect(activeSessions).toBe(1);
    });
  });

  describe('Database cleanup', () => {
    it('should have clean database at start of each test', async () => {
      const user = await createUser({ email: 'cleanup-activity@example.com' });
      await createAuditLog({ userId: user.id, action: 'TEST' });
      await createUserSession({ userId: user.id });

      const db = await getDbService();
      const logs = await db.auditLog.findMany();
      const sessions = await db.userSession.findMany();

      expect(logs.length).toBeGreaterThan(0);
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should not see data from previous tests', async () => {
      const db = await getDbService();
      const logs = await db.auditLog.findMany();
      const sessions = await db.userSession.findMany();
      const logins = await db.userLogin.findMany();

      expect(logs).toHaveLength(0);
      expect(sessions).toHaveLength(0);
      expect(logins).toHaveLength(0);
    });
  });
});
