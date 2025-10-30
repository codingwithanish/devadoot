/**
 * Uploads routes
 * Handles artifact uploads to S3
 */

import { Router } from 'express';
import multer from 'multer';
import { asyncHandler, AppError } from '../utils/error';
import { uploadToS3, uploadLargeFile } from '../s3';
import { recordArtifact } from '../services/artifacts';
import { getCaseById } from '../services/cases';

export const uploadsRouter = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

// Re-export upload router with case prefix
export function createUploadsRouter() {
  const router = Router();

  /**
   * POST /cases/:caseId/upload
   * Upload an artifact for a case
   */
  router.post(
    '/:caseId/upload',
    upload.single('file'),
    asyncHandler(async (req, res) => {
      const { caseId } = req.params;
      const { kind, json } = req.body;

      if (!kind) {
        throw new AppError(400, 'kind is required');
      }

      // Verify case exists
      const caseRecord = await getCaseById(caseId);
      if (!caseRecord) {
        throw new AppError(404, 'Case not found');
      }

      let buffer: Buffer;
      let contentType: string;
      let extension: string;

      if (req.file) {
        // Binary file upload
        buffer = req.file.buffer;
        contentType = req.file.mimetype;
        extension = getExtensionForKind(kind);
      } else if (json) {
        // JSON string upload
        buffer = Buffer.from(json, 'utf-8');
        contentType = 'application/json';
        extension = '.json';
      } else {
        throw new AppError(400, 'Either file or json must be provided');
      }

      // Generate S3 key
      const timestamp = Date.now();
      const s3Key = `cases/${caseId}/${kind}-${timestamp}${extension}`;

      // Upload to S3
      let s3Url: string;
      if (buffer.length > 10 * 1024 * 1024) {
        // Use multipart upload for large files
        s3Url = await uploadLargeFile(s3Key, buffer, contentType);
      } else {
        s3Url = await uploadToS3(s3Key, buffer, contentType);
      }

      // Record artifact in database
      const artifact = await recordArtifact(
        caseId,
        kind,
        s3Key,
        s3Url,
        buffer.length
      );

      res.json({
        artifactId: artifact.id,
        s3Key,
        s3Url,
      });
    })
  );

  return router;
}

function getExtensionForKind(kind: string): string {
  const extensions: Record<string, string> = {
    har: '.json',
    console: '.jsonl',
    cookies: '.json',
    dom: '.html.gz',
    memory: '.json',
    performance: '.json',
    screenshot: '.png',
    recording: '.webm',
  };

  return extensions[kind] || '.bin';
}
