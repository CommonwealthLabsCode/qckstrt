import { PrismaClient } from "@prisma/client";
import { mockDeep, DeepMockProxy, mockReset } from "jest-mock-extended";

/**
 * Type for deeply mocked database client
 */
export type MockDbClient = DeepMockProxy<PrismaClient>;

/**
 * Creates a deeply mocked database client for testing
 */
export const createMockDbClient = (): MockDbClient => {
  return mockDeep<PrismaClient>();
};

/**
 * Resets all mocks on a MockDbClient
 */
export const resetMockDbClient = (mock: MockDbClient): void => {
  mockReset(mock);
};

/**
 * Type alias for DbService mock - exported for test compatibility
 * (DbService extends the underlying client, so they share the same mock type)
 */
export type MockDbService = MockDbClient;

/**
 * Creates a deeply mocked DbService for testing
 */
export const createMockDbService = (): MockDbService => {
  return createMockDbClient();
};

/**
 * Resets all mocks on a MockDbService
 */
export const resetMockDbService = (mock: MockDbService): void => {
  resetMockDbClient(mock);
};
