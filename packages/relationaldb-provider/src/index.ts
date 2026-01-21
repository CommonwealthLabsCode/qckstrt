/**
 * Relational Database Provider Package
 *
 * Strategy Pattern + Dependency Injection for relational database connections.
 * Uses Prisma ORM with PostgreSQL (via Supabase).
 *
 * @example
 * ```typescript
 * import { PrismaModule, PrismaService } from '@qckstrt/relationaldb-provider';
 *
 * // In your module
 * @Module({
 *   imports: [PrismaModule],
 * })
 * export class AppModule {}
 *
 * // In your service
 * @Injectable()
 * export class MyService {
 *   constructor(private prisma: PrismaService) {}
 *
 *   async findUser(id: string) {
 *     return this.prisma.user.findUnique({ where: { id } });
 *   }
 * }
 * ```
 */

// Re-export types from common
export {
  IRelationalDBProvider,
  RelationalDBType,
  RelationalDBError,
  // Environment helpers
  getEnvironment,
  isDevelopment,
  isProduction,
  isTest,
  type Environment,
} from "@qckstrt/common";

// Prisma Service and Module
export { PrismaService } from "./prisma.service.js";
export { PrismaModule } from "./prisma.module.js";

// Re-export Prisma types for convenience
// This allows consumers to import Prisma types from this package
export { Prisma, PrismaClient } from "@prisma/client";

// Re-export all generated Prisma model types
export type {
  User,
  UserProfile,
  UserLogin,
  PasskeyCredential,
  WebAuthnChallenge,
  UserSession,
  UserConsent,
  UserAddress,
  EmailCorrespondence,
  NotificationPreference,
  AuditLog,
  Document,
  Representative,
  Proposition,
  Meeting,
} from "@prisma/client";

// Re-export Prisma enums
// Note: AuthStrategy is not exported because the User.authStrategy field is a String, not an enum
export {
  PoliticalAffiliation,
  VotingFrequency,
  EducationLevel,
  IncomeRange,
  HomeownerStatus,
  ConsentType,
  ConsentStatus,
  AddressType,
  EmailType,
  EmailStatus,
  NotificationFrequency,
  DocumentStatus,
} from "@prisma/client";

// Test utilities are available from "@qckstrt/relationaldb-provider/testing"
// They are NOT exported from the main entry point to avoid loading
// jest-mock-extended in production environments.
