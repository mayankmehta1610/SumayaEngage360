import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { Public } from '../../common/auth/public.decorator';
import { FilesService } from './files.service';

const MAX_SIZE = 100 * 1024 * 1024; // recordings can be large

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  // Public: candidates upload resumes pre-auth; onboarding docs via token.
  // Production hardening: signed upload URLs + antivirus scan hook.
  @Public()
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE } }))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('file field is required');
    const saved = await this.files.save(
      file,
      (req as any).tenantId,
      (req as any).user?.sub,
    );
    return {
      id: saved.id,
      fileName: saved.fileName,
      contentType: saved.contentType,
      sizeBytes: saved.sizeBytes,
    };
  }

  @Get(':id')
  meta(@Param('id') id: string) {
    return this.files.getMeta(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { stream, meta } = await this.files.getStream(id);
    res.setHeader('Content-Type', meta.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${meta.fileName.replace(/"/g, '')}"`,
    );
    stream.pipe(res);
  }
}
