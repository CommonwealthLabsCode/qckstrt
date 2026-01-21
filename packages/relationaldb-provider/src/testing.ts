/**
 * Test utilities for @qckstrt/relationaldb-provider
 *
 * Import from "@qckstrt/relationaldb-provider/testing" in test files.
 * Do NOT import from the main entry point as it will load jest-mock-extended
 * at runtime which fails outside of Jest test environment.
 *
 * @example
 * ```typescript
 * import {
 *   createMockPrismaService,
 *   MockPrismaService,
 * } from '@qckstrt/relationaldb-provider/testing';
 *
 * describe('MyService', () => {
 *   let prisma: MockPrismaService;
 *
 *   beforeEach(() => {
 *     prisma = createMockPrismaService();
 *   });
 * });
 * ```
 */

export {
  createMockPrismaClient,
  createMockPrismaService,
  resetMockPrismaClient,
  resetMockPrismaService,
  type MockPrismaClient,
  type MockPrismaService,
} from "./test/prisma-mock.js";
