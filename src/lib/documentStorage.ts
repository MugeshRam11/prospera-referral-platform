import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

// Storage directory outside public reach
const STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'private_documents');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

/**
 * Validates actual file content against known magic byte signatures.
 * Blocks spoofed MIME types, executable files, and script injections.
 */
export function verifyMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  // PDF signature: 25 50 44 46 (%PDF)
  if (declaredMimeType === 'application/pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  // JPEG signature: FF D8 FF
  if (declaredMimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (declaredMimeType === 'image/png') {
    if (buffer.length < 8) return false;
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // WebP signature: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  if (declaredMimeType === 'image/webp') {
    if (buffer.length < 12) return false;
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

export interface StoredDocumentMetadata {
  fileKey: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Checksum: string;
}

/**
 * Saves a validated document buffer into the private storage directory.
 */
export async function storePrivateDocument(
  buffer: Buffer,
  originalFilename: string,
  declaredMimeType: string
): Promise<StoredDocumentMetadata> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
  }

  if (!ALLOWED_MIME_TYPES.includes(declaredMimeType)) {
    throw new Error(`Invalid file type: ${declaredMimeType}. Allowed types: PDF, JPEG, PNG, WEBP`);
  }

  if (!verifyMagicBytes(buffer, declaredMimeType)) {
    throw new Error('File content does not match declared MIME type or contains unsafe header');
  }

  // Derive secure extension from verified MIME type
  let ext = '.bin';
  if (declaredMimeType === 'application/pdf') ext = '.pdf';
  else if (declaredMimeType === 'image/jpeg') ext = '.jpg';
  else if (declaredMimeType === 'image/png') ext = '.png';
  else if (declaredMimeType === 'image/webp') ext = '.webp';

  const randomKey = `${crypto.randomUUID()}${ext}`;
  const absolutePath = path.join(STORAGE_ROOT, randomKey);

  const sha256Checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  await fs.promises.writeFile(absolutePath, buffer, { mode: 0o600 });

  return {
    fileKey: randomKey,
    originalFilename: path.basename(originalFilename).slice(0, 255),
    fileSizeBytes: buffer.length,
    mimeType: declaredMimeType,
    sha256Checksum,
  };
}

/**
 * Retrieves read stream for a stored document.
 */
export function getDocumentReadStream(fileKey: string): { stream: fs.ReadStream; filePath: string } {
  // Prevent path traversal
  const sanitizedKey = path.basename(fileKey);
  const filePath = path.join(STORAGE_ROOT, sanitizedKey);

  if (!fs.existsSync(filePath)) {
    throw new Error('Requested document not found in private storage');
  }

  return {
    stream: fs.createReadStream(filePath),
    filePath,
  };
}

/**
 * Safely removes a document from disk.
 */
export async function deletePrivateDocument(fileKey: string): Promise<void> {
  const sanitizedKey = path.basename(fileKey);
  const filePath = path.join(STORAGE_ROOT, sanitizedKey);

  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath);
  }
}

// Multer memory storage instance for parsing uploads before verification
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});
