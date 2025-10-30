/**
 * Artifact management service
 */

import { prisma } from '../db';
import { logger } from '../utils/logger';

/**
 * Record an artifact in the database
 */
export async function recordArtifact(
  caseId: string,
  kind: string,
  s3Key: string,
  s3Url: string,
  sizeBytes: number
): Promise<{ id: string }> {
  logger.info({ caseId, kind, s3Key }, 'Recording artifact');

  try {
    const artifact = await prisma.artifact.create({
      data: {
        caseId,
        kind,
        s3Key,
        s3Url,
        sizeBytes: BigInt(sizeBytes),
      },
    });

    logger.info({ artifactId: artifact.id, kind }, 'Artifact recorded');

    return { id: artifact.id };
  } catch (error) {
    logger.error({ error, caseId, kind }, 'Error recording artifact');
    throw new Error('Failed to record artifact');
  }
}

/**
 * Get artifacts for a case
 */
export async function getArtifactsByCase(caseId: string) {
  try {
    const artifacts = await prisma.artifact.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });

    // Convert BigInt to Number for JSON serialization
    return artifacts.map(artifact => ({
      ...artifact,
      sizeBytes: artifact.sizeBytes ? Number(artifact.sizeBytes) : null,
    }));
  } catch (error) {
    logger.error({ error, caseId }, 'Error getting artifacts');
    return [];
  }
}

/**
 * Delete artifact
 */
export async function deleteArtifact(artifactId: string): Promise<void> {
  try {
    await prisma.artifact.delete({
      where: { id: artifactId },
    });

    logger.info({ artifactId }, 'Artifact deleted');
  } catch (error) {
    logger.error({ error, artifactId }, 'Error deleting artifact');
    throw new Error('Failed to delete artifact');
  }
}
