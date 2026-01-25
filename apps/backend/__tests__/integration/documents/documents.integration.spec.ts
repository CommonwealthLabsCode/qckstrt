/**
 * Document Integration Tests
 *
 * Tests document operations against real database.
 * Note: Storage operations (S3) are not tested here as they require cloud infrastructure.
 */
import {
  cleanDatabase,
  disconnectDatabase,
  createUser,
  createDocument,
  getDbService,
  generateId,
} from '../utils';
import { DocumentStatus } from '@qckstrt/relationaldb-provider';

describe('Document Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Document CRUD Operations', () => {
    it('should create a document for a user', async () => {
      const user = await createUser({ email: 'doc-test@example.com' });

      const doc = await createDocument({
        userId: user.id,
        location: 's3://my-bucket',
        key: 'test-file.pdf',
        size: 2048,
        checksum: 'sha256-abc123',
      });

      expect(doc).toBeDefined();
      expect(doc.id).toBeDefined();
      expect(doc.userId).toBe(user.id);
      expect(doc.location).toBe('s3://my-bucket');
      expect(doc.key).toBe('test-file.pdf');
      expect(doc.size).toBe(2048);
      expect(doc.checksum).toBe('sha256-abc123');
      expect(doc.status).toBe(DocumentStatus.processing_pending);
    });

    it('should find a document by ID', async () => {
      const user = await createUser({ email: 'doc-find@example.com' });
      const doc = await createDocument({
        userId: user.id,
        key: 'findable.pdf',
      });

      const db = await getDbService();
      const found = await db.document.findUnique({
        where: { id: doc.id },
      });

      expect(found).toBeDefined();
      expect(found?.id).toBe(doc.id);
      expect(found?.key).toBe('findable.pdf');
    });

    it('should list all documents for a user', async () => {
      const user = await createUser({ email: 'doc-list@example.com' });

      await createDocument({ userId: user.id, key: 'file1.pdf' });
      await createDocument({ userId: user.id, key: 'file2.pdf' });
      await createDocument({ userId: user.id, key: 'file3.pdf' });

      const db = await getDbService();
      const docs = await db.document.findMany({
        where: { userId: user.id },
      });

      expect(docs).toHaveLength(3);
      expect(docs.map((d) => d.key)).toContain('file1.pdf');
      expect(docs.map((d) => d.key)).toContain('file2.pdf');
      expect(docs.map((d) => d.key)).toContain('file3.pdf');
    });

    it('should update document status', async () => {
      const user = await createUser({ email: 'doc-update@example.com' });
      const doc = await createDocument({
        userId: user.id,
        status: DocumentStatus.processing_pending,
      });

      const db = await getDbService();
      const updated = await db.document.update({
        where: { id: doc.id },
        data: { status: DocumentStatus.processing_complete },
      });

      expect(updated.status).toBe(DocumentStatus.processing_complete);
    });

    it('should delete a document', async () => {
      const user = await createUser({ email: 'doc-delete@example.com' });
      const doc = await createDocument({
        userId: user.id,
        key: 'to-delete.pdf',
      });

      const db = await getDbService();
      await db.document.delete({ where: { id: doc.id } });

      const deleted = await db.document.findUnique({
        where: { id: doc.id },
      });

      expect(deleted).toBeNull();
    });

    it('should delete documents by user and key', async () => {
      const user = await createUser({ email: 'doc-delete-key@example.com' });
      await createDocument({
        userId: user.id,
        key: 'specific-key.pdf',
      });

      const db = await getDbService();
      const result = await db.document.deleteMany({
        where: { userId: user.id, key: 'specific-key.pdf' },
      });

      expect(result.count).toBe(1);
    });
  });

  describe('Document Status Transitions', () => {
    it('should track document through processing states', async () => {
      const user = await createUser({ email: 'doc-states@example.com' });
      const doc = await createDocument({
        userId: user.id,
        status: DocumentStatus.processing_pending,
      });

      const db = await getDbService();

      // Transition to processing
      await db.document.update({
        where: { id: doc.id },
        data: { status: DocumentStatus.text_extraction_started },
      });

      let current = await db.document.findUnique({ where: { id: doc.id } });
      expect(current?.status).toBe(DocumentStatus.text_extraction_started);

      // Transition to complete
      await db.document.update({
        where: { id: doc.id },
        data: { status: DocumentStatus.processing_complete },
      });

      current = await db.document.findUnique({ where: { id: doc.id } });
      expect(current?.status).toBe(DocumentStatus.processing_complete);
    });

    it('should mark document as failed', async () => {
      const user = await createUser({ email: 'doc-fail@example.com' });
      const doc = await createDocument({
        userId: user.id,
        status: DocumentStatus.text_extraction_started,
      });

      const db = await getDbService();
      const failed = await db.document.update({
        where: { id: doc.id },
        data: { status: DocumentStatus.text_extraction_failed },
      });

      expect(failed.status).toBe(DocumentStatus.text_extraction_failed);
    });
  });

  describe('Document User Isolation', () => {
    it('should not return documents from other users', async () => {
      const user1 = await createUser({ email: 'user1@example.com' });
      const user2 = await createUser({ email: 'user2@example.com' });

      await createDocument({ userId: user1.id, key: 'user1-file.pdf' });
      await createDocument({ userId: user2.id, key: 'user2-file.pdf' });

      const db = await getDbService();

      const user1Docs = await db.document.findMany({
        where: { userId: user1.id },
      });
      const user2Docs = await db.document.findMany({
        where: { userId: user2.id },
      });

      expect(user1Docs).toHaveLength(1);
      expect(user1Docs[0].key).toBe('user1-file.pdf');

      expect(user2Docs).toHaveLength(1);
      expect(user2Docs[0].key).toBe('user2-file.pdf');
    });
  });

  describe('Document Checksum Lookup', () => {
    it('should find document by checksum', async () => {
      const user = await createUser({ email: 'checksum@example.com' });
      const uniqueChecksum = `sha256-${generateId()}`;

      await createDocument({
        userId: user.id,
        key: 'checksummed.pdf',
        checksum: uniqueChecksum,
      });

      const db = await getDbService();
      const found = await db.document.findFirst({
        where: { checksum: uniqueChecksum },
      });

      expect(found).toBeDefined();
      expect(found?.key).toBe('checksummed.pdf');
    });

    it('should detect duplicate documents via checksum', async () => {
      const user = await createUser({ email: 'duplicate@example.com' });
      const sharedChecksum = `sha256-duplicate-${generateId()}`;

      await createDocument({
        userId: user.id,
        key: 'original.pdf',
        checksum: sharedChecksum,
      });

      await createDocument({
        userId: user.id,
        key: 'duplicate.pdf',
        checksum: sharedChecksum,
      });

      const db = await getDbService();
      const duplicates = await db.document.findMany({
        where: { checksum: sharedChecksum },
      });

      expect(duplicates).toHaveLength(2);
    });
  });

  describe('Document Cascade Delete', () => {
    it('should delete documents when user is deleted', async () => {
      const user = await createUser({ email: 'cascade@example.com' });

      await createDocument({ userId: user.id, key: 'file1.pdf' });
      await createDocument({ userId: user.id, key: 'file2.pdf' });

      const db = await getDbService();

      // Verify documents exist
      let docs = await db.document.findMany({ where: { userId: user.id } });
      expect(docs).toHaveLength(2);

      // Delete user (cascade should delete documents)
      await db.user.delete({ where: { id: user.id } });

      // Verify documents are deleted
      docs = await db.document.findMany({ where: { userId: user.id } });
      expect(docs).toHaveLength(0);
    });
  });

  describe('Document Timestamps', () => {
    it('should set createdAt on creation', async () => {
      const user = await createUser({ email: 'timestamp@example.com' });
      const before = new Date();

      const doc = await createDocument({ userId: user.id });

      const after = new Date();

      expect(doc.createdAt).toBeDefined();
      expect(doc.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(doc.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const user = await createUser({ email: 'update-ts@example.com' });
      const doc = await createDocument({ userId: user.id });

      const originalUpdatedAt = doc.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const db = await getDbService();
      const updated = await db.document.update({
        where: { id: doc.id },
        data: { status: DocumentStatus.text_extraction_started },
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });
  });
});
