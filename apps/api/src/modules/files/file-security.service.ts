import { BadRequestException, Injectable } from '@nestjs/common';

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

@Injectable()
export class FileSecurityService {
  validate(file: { mimetype: string; size: number; originalname: string }) {
    if (file.size > MAX_BYTES) {
      throw new BadRequestException(`File exceeds ${MAX_BYTES / 1024 / 1024}MB limit`);
    }
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
    }
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext && ['exe', 'bat', 'cmd', 'sh', 'js', 'vbs'].includes(ext)) {
      throw new BadRequestException('Executable files are not allowed');
    }
    return true;
  }
}
