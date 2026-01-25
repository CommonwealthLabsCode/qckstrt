/**
 * User CRUD Integration Tests
 *
 * Tests user operations against real database and GraphQL endpoints.
 */
import {
  cleanDatabase,
  disconnectDatabase,
  createUser,
  createUsers,
  findUserById,
  findUserByEmail,
  graphqlRequest,
  assertNoErrors,
} from '../utils';

// GraphQL Queries - using inline arguments to avoid variable parsing issues
const buildFindUserQuery = (email: string) => `
  query {
    findUser(email: "${email}") {
      id
      email
      firstName
      lastName
      created
      updated
    }
  }
`;

// Reserved for future use when getUsers query is implemented
// const GET_USERS_QUERY = `
//   query {
//     getUsers {
//       id
//       email
//       firstName
//       lastName
//     }
//   }
// `;

describe('Users Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Database Operations', () => {
    it('should create a user in the database', async () => {
      const user = await createUser({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
    });

    it('should find a user by ID', async () => {
      const createdUser = await createUser({
        email: 'findbyid@example.com',
      });

      const foundUser = await findUserById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe('findbyid@example.com');
    });

    it('should find a user by email', async () => {
      await createUser({
        email: 'findbyemail@example.com',
        firstName: 'Test',
      });

      const foundUser = await findUserByEmail('findbyemail@example.com');

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('findbyemail@example.com');
      expect(foundUser?.firstName).toBe('Test');
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await findUserById('non-existent-id');
      expect(foundUser).toBeNull();
    });

    it('should create multiple users', async () => {
      const users = await createUsers(3, { lastName: 'Batch' });

      expect(users).toHaveLength(3);
      expect(users[0].firstName).toBe('Test1');
      expect(users[1].firstName).toBe('Test2');
      expect(users[2].firstName).toBe('Test3');
      users.forEach((u) => expect(u.lastName).toBe('Batch'));
    });

    it('should enforce unique email constraint', async () => {
      await createUser({ email: 'unique@example.com' });

      await expect(
        createUser({ email: 'unique@example.com' }),
      ).rejects.toThrow();
    });
  });

  describe('GraphQL: findUser Query', () => {
    it('should find a user by email via GraphQL', async () => {
      // Create user directly in database
      await createUser({
        email: 'graphql-test@example.com',
        firstName: 'GraphQL',
        lastName: 'Test',
      });

      // Query via GraphQL through API Gateway
      const result = await graphqlRequest<{
        findUser: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
        };
      }>(buildFindUserQuery('graphql-test@example.com'));

      assertNoErrors(result);
      expect(result.data.findUser).toBeDefined();
      expect(result.data.findUser.email).toBe('graphql-test@example.com');
      expect(result.data.findUser.firstName).toBe('GraphQL');
      expect(result.data.findUser.lastName).toBe('Test');
    });

    it('should handle non-existent email gracefully', async () => {
      // Note: findUser returns User! (non-nullable), so it throws an error for non-existent users
      const result = await graphqlRequest<{ findUser: null }>(
        buildFindUserQuery('nonexistent@example.com'),
      );

      // The resolver throws an error because User! is non-nullable
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Cannot return null');
    });
  });

  describe('GraphQL: User lifecycle', () => {
    it('should persist user data between GraphQL operations', async () => {
      // Create user
      const user = await createUser({
        email: 'lifecycle@example.com',
        firstName: 'Lifecycle',
        lastName: 'Test',
      });

      // Verify via GraphQL through API Gateway
      const findResult = await graphqlRequest<{
        findUser: { id: string; email: string };
      }>(buildFindUserQuery('lifecycle@example.com'));

      assertNoErrors(findResult);
      expect(findResult.data.findUser.id).toBe(user.id);

      // Verify via direct database query
      const dbUser = await findUserById(user.id);
      expect(dbUser?.email).toBe('lifecycle@example.com');
    });
  });

  describe('Database cleanup', () => {
    it('should have clean database at start of each test', async () => {
      // First test creates a user
      await createUser({ email: 'cleanup-test@example.com' });

      // Verify user exists
      const user = await findUserByEmail('cleanup-test@example.com');
      expect(user).toBeDefined();
    });

    it('should not see users from previous tests', async () => {
      // This test runs after the previous one, database should be clean
      const user = await findUserByEmail('cleanup-test@example.com');
      expect(user).toBeNull();
    });
  });
});
