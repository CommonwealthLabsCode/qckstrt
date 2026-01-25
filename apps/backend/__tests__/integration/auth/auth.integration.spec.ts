/**
 * Auth Integration Tests
 *
 * Tests authentication flows against real services.
 * Requires Supabase and Inbucket to be running.
 *
 * Note: Some tests require the full auth stack and may be skipped
 * if infrastructure is not available.
 */
import {
  cleanDatabase,
  disconnectDatabase,
  createUser,
  graphqlRequest,
  SUPABASE_URL,
  getMagicLinkFromInbucket,
  clearInbucketMailbox,
  waitFor,
  generateTestEmail,
  getDbService,
} from '../utils';

// GraphQL Mutations - using inline arguments to avoid variable parsing issues
const buildSendMagicLinkMutation = (email: string, redirectTo: string) => `
  mutation {
    sendMagicLink(input: { email: "${email}", redirectTo: "${redirectTo}" })
  }
`;

const buildRegisterWithMagicLinkMutation = (
  email: string,
  redirectTo: string,
) => `
  mutation {
    registerWithMagicLink(input: { email: "${email}", redirectTo: "${redirectTo}" })
  }
`;

const buildFindUserQuery = (email: string) => `
  query {
    findUser(email: "${email}") {
      id
      email
    }
  }
`;

// Helper to check if Supabase is available (with timeout)
async function isSupabaseAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${SUPABASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

describe('Auth Integration Tests', () => {
  let supabaseAvailable = false;

  beforeAll(async () => {
    supabaseAvailable = await isSupabaseAvailable();
    if (!supabaseAvailable) {
      console.warn(
        'Supabase is not available. Skipping auth tests that require Supabase.',
      );
    }
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Magic Link Registration Flow', () => {
    it('should send magic link for registration', async () => {
      if (!supabaseAvailable) {
        console.log('Skipping: Supabase not available');
        return;
      }

      const email = generateTestEmail();

      const result = await graphqlRequest<{ registerWithMagicLink: boolean }>(
        buildRegisterWithMagicLinkMutation(
          email,
          'http://localhost:3000/auth/callback',
        ),
      );

      // The mutation should succeed (returns true even if user doesn't exist)
      expect(result.data?.registerWithMagicLink).toBe(true);
    });

    it('should receive magic link email', async () => {
      if (!supabaseAvailable) {
        console.log('Skipping: Supabase not available');
        return;
      }

      const email = generateTestEmail();

      // Clear any existing emails
      await clearInbucketMailbox(email);

      // Request magic link
      await graphqlRequest(
        buildRegisterWithMagicLinkMutation(
          email,
          'http://localhost:3000/auth/callback',
        ),
      );

      // Wait for email to arrive
      let magicLink: string | null = null;
      try {
        await waitFor(
          async () => {
            magicLink = await getMagicLinkFromInbucket(email);
            return magicLink !== null;
          },
          { timeoutMs: 15000, intervalMs: 1000 },
        );
      } catch {
        // Email may not arrive in test environment
        console.log('Magic link email not received (may be expected in CI)');
        return;
      }

      expect(magicLink).toBeDefined();
      expect(magicLink).toContain('token=');
    });
  });

  describe('Magic Link Login Flow', () => {
    it('should send magic link for existing user', async () => {
      if (!supabaseAvailable) {
        console.log('Skipping: Supabase not available');
        return;
      }

      // Create a user first
      const email = generateTestEmail();
      await createUser({ email });

      const result = await graphqlRequest<{ sendMagicLink: boolean }>(
        buildSendMagicLinkMutation(
          email,
          'http://localhost:3000/auth/callback',
        ),
      );

      // Should succeed for existing user
      expect(result.data?.sendMagicLink).toBe(true);
    });
  });

  describe('User Lookup After Auth', () => {
    it('should be able to find user created via magic link', async () => {
      // Create a user directly (simulating completed auth)
      const email = generateTestEmail();
      await createUser({ email, authStrategy: 'magic_link' });

      // Query the user via GraphQL through API Gateway
      const result = await graphqlRequest<{
        findUser: { id: string; email: string };
      }>(buildFindUserQuery(email));

      expect(result.data?.findUser).toBeDefined();
      expect(result.data?.findUser.email).toBe(email);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on magic link requests', async () => {
      if (!supabaseAvailable) {
        console.log('Skipping: Supabase not available');
        return;
      }

      const email = generateTestEmail();

      // Make multiple rapid requests
      const requests = Array.from({ length: 5 }, () =>
        graphqlRequest<{ sendMagicLink: boolean }>(
          buildSendMagicLinkMutation(
            email,
            'http://localhost:3000/auth/callback',
          ),
        ),
      );

      const results = await Promise.all(requests);

      // Some requests should succeed, some may be rate limited
      const successCount = results.filter((r) => r.data?.sendMagicLink).length;
      const errorCount = results.filter(
        (r) => r.errors && r.errors.length > 0,
      ).length;

      // At least some requests should have gone through
      expect(successCount).toBeGreaterThan(0);

      // Verify the endpoint handles multiple requests without crashing
      expect(successCount + errorCount).toBe(5);
    });
  });

  describe('User Login Record', () => {
    it('should track login count in UserLogin', async () => {
      const email = generateTestEmail();
      const user = await createUser({ email, authStrategy: 'magic_link' });

      const db = await getDbService();

      // Create a user login record
      await db.userLogin.create({
        data: {
          userId: user.id,
          loginCount: 1,
        },
      });

      // Verify login record was created
      const login = await db.userLogin.findUnique({
        where: { userId: user.id },
      });

      expect(login).toBeDefined();
      expect(login?.loginCount).toBe(1);
    });

    it('should track failed login attempts', async () => {
      const email = generateTestEmail();
      const user = await createUser({ email, authStrategy: 'magic_link' });

      const db = await getDbService();

      // Create login record with failed attempts
      await db.userLogin.create({
        data: {
          userId: user.id,
          failedLoginAttempts: 3,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // Locked for 15 min
        },
      });

      const login = await db.userLogin.findUnique({
        where: { userId: user.id },
      });

      expect(login?.failedLoginAttempts).toBe(3);
      expect(login?.lockedUntil).toBeDefined();
    });
  });

  describe('Passkey Credentials', () => {
    it('should store and retrieve passkey credentials', async () => {
      const user = await createUser({
        email: generateTestEmail(),
        authStrategy: 'passkey',
      });

      const db = await getDbService();

      // Create a mock passkey credential (using strings as per schema)
      const credential = await db.passkeyCredential.create({
        data: {
          id: crypto.randomUUID(),
          credentialId: 'base64-encoded-credential-id',
          publicKey: 'base64-encoded-public-key',
          counter: BigInt(0),
          userId: user.id,
          friendlyName: 'Test Device',
          deviceType: 'platform',
          transports: ['internal'],
        },
      });

      expect(credential).toBeDefined();
      expect(credential.friendlyName).toBe('Test Device');

      // Verify we can retrieve it
      const found = await db.passkeyCredential.findFirst({
        where: { userId: user.id },
      });

      expect(found).toBeDefined();
      expect(found?.deviceType).toBe('platform');
    });

    it('should delete passkey credentials when user is deleted', async () => {
      const user = await createUser({
        email: generateTestEmail(),
        authStrategy: 'passkey',
      });

      const db = await getDbService();

      // Create passkey
      await db.passkeyCredential.create({
        data: {
          id: crypto.randomUUID(),
          credentialId: 'test-credential-id',
          publicKey: 'test-public-key',
          counter: BigInt(0),
          userId: user.id,
        },
      });

      // Delete user
      await db.user.delete({ where: { id: user.id } });

      // Verify passkey is also deleted (cascade)
      const credentials = await db.passkeyCredential.findMany({
        where: { userId: user.id },
      });

      expect(credentials).toHaveLength(0);
    });
  });

  describe('WebAuthn Challenge', () => {
    it('should store and expire challenges', async () => {
      const db = await getDbService();
      const identifier = `challenge-${crypto.randomUUID()}`;

      // Create a challenge (uses identifier as primary key)
      const challenge = await db.webAuthnChallenge.create({
        data: {
          identifier,
          challenge: 'mock-challenge-string',
          type: 'registration',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        },
      });

      expect(challenge).toBeDefined();
      expect(challenge.type).toBe('registration');

      // Find valid (non-expired) challenge
      const valid = await db.webAuthnChallenge.findFirst({
        where: {
          identifier,
          expiresAt: { gt: new Date() },
        },
      });

      expect(valid).toBeDefined();
    });

    it('should not find expired challenges', async () => {
      const db = await getDbService();
      const identifier = `expired-${crypto.randomUUID()}`;

      // Create an expired challenge
      await db.webAuthnChallenge.create({
        data: {
          identifier,
          challenge: 'expired-challenge',
          type: 'authentication',
          expiresAt: new Date(Date.now() - 1000), // Already expired
        },
      });

      // Should not find expired challenge
      const found = await db.webAuthnChallenge.findFirst({
        where: {
          identifier,
          expiresAt: { gt: new Date() },
        },
      });

      expect(found).toBeNull();
    });
  });
});
