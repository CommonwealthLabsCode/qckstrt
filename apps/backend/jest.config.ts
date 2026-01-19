import type { Config } from 'jest';
// import { defaults } from 'jest-config';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    String.raw`.*\.integration\.spec\.ts$`,
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    // Exclude boilerplate files from coverage
    'src/db/migrations/',
    'src/db/entities/',
    String.raw`/main\.ts$`,
    String.raw`src/common/bootstrap\.ts$`,
    String.raw`src/config/index\.ts$`,
    // Exclude simple DTOs (type definitions only)
    String.raw`\.dto\.ts$`,
  ],
  verbose: true,
  rootDir: '.',
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
