// URLs for integration testing
// When running in Docker, these use container names.
// When running from host, these use localhost with mapped ports.
export const BASE_URL =
  process.env.USERS_SERVICE_URL || 'http://localhost:3001';
export const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:8000';
export const INBUCKET_URL =
  process.env.INBUCKET_URL || 'http://localhost:54324';

/**
 * Fetches the magic link from Inbucket email service.
 * Inbucket captures emails sent during integration tests.
 *
 * @param email - The email address to check
 * @returns The magic link URL or null if not found
 */
export async function getMagicLinkFromInbucket(
  email: string,
): Promise<string | null> {
  const mailbox = email.split('@')[0];

  // Get list of emails in mailbox
  const response = await fetch(`${INBUCKET_URL}/api/v1/mailbox/${mailbox}`);
  const emails = await response.json();

  if (!Array.isArray(emails) || emails.length === 0) {
    return null;
  }

  // Get the latest email body
  const latestId = emails[emails.length - 1].id;
  const emailResponse = await fetch(
    `${INBUCKET_URL}/api/v1/mailbox/${mailbox}/${latestId}`,
  );
  const emailData = await emailResponse.json();

  // Extract magic link from email body
  const bodyText = emailData.body?.text || '';
  const match = bodyText.match(/https?:\/\/\S+token=\S+/);
  return match ? match[0] : null;
}

/**
 * Clears all emails from an Inbucket mailbox.
 * Useful for cleaning up between tests.
 *
 * @param email - The email address whose mailbox to clear
 */
export async function clearInbucketMailbox(email: string): Promise<void> {
  const mailbox = email.split('@')[0];
  await fetch(`${INBUCKET_URL}/api/v1/mailbox/${mailbox}`, {
    method: 'DELETE',
  });
}

/**
 * Waits for a condition to be true, polling at intervals.
 * Useful for waiting for async operations like email delivery.
 *
 * @param condition - Function that returns true when condition is met
 * @param options - Timeout and interval options
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const { timeoutMs = 10000, intervalMs = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Makes an authenticated request to the backend.
 *
 * @param path - API path (e.g., '/users/me')
 * @param token - JWT access token
 * @param options - Fetch options
 */
export async function authenticatedFetch(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Generates a unique test email address.
 * Uses timestamp and random string to ensure uniqueness.
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}@test.local`;
}
