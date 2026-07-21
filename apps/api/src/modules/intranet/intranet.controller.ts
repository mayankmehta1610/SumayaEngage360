import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { FilesService } from '../files/files.service';
import {
  CreateBannerDto,
  CreateCategoryDto,
  CreateContentDto,
  ListContentQuery,
  UpdateBannerDto,
  UpdateCategoryDto,
  UpdateContentDto,
} from './intranet.dto';
import { IntranetService } from './intranet.service';

// Company intranet — all routes are tenant-scoped and authenticated.
// Publishing rights are enforced in the service (admin/HR anywhere,
// department heads within their own department).
@Controller('intranet')
export class IntranetController {
  constructor(
    private readonly intranet: IntranetService,
    private readonly files: FilesService,
  ) {}

  // ── home (SharePoint-style landing aggregate) ───────────────────

  @Get('home')
  home(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.intranet.home(tenantId, user);
  }

  // ── categories ──────────────────────────────────────────────────

  @Get('departments/:departmentId/categories')
  categoryTree(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('departmentId') departmentId: string,
  ) {
    return this.intranet.categoryTree(tenantId, user, departmentId);
  }

  @Post('categories')
  createCategory(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.intranet.createCategory(tenantId, user, dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.intranet.updateCategory(tenantId, user, id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.intranet.deleteCategory(tenantId, user, id);
  }

  @Get('categories/:id/banner')
  async categoryBanner(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const fileId = await this.intranet.categoryBannerFileId(tenantId, id);
    await this.streamInline(fileId, tenantId, res);
  }

  // ── content ─────────────────────────────────────────────────────

  @Get('content')
  listContent(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: ListContentQuery,
  ) {
    return this.intranet.listContent(tenantId, user, query);
  }

  @Get('content/:id')
  getContent(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.intranet.getContent(tenantId, user, id);
  }

  @Post('content')
  createContent(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateContentDto,
  ) {
    return this.intranet.createContent(tenantId, user, dto);
  }

  @Patch('content/:id')
  updateContent(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.intranet.updateContent(tenantId, user, id, dto);
  }

  @Post('content/:id/submit')
  submit(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.intranet.transitionContent(tenantId, user, id, 'submit');
  }

  @Post('content/:id/publish')
  publish(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.intranet.transitionContent(tenantId, user, id, 'publish');
  }

  @Post('content/:id/unpublish')
  unpublish(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.intranet.transitionContent(tenantId, user, id, 'unpublish');
  }

  @Post('content/:id/archive')
  archive(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.intranet.transitionContent(tenantId, user, id, 'archive');
  }

  // ── moderation ──────────────────────────────────────────────────

  @Get('review-queue')
  reviewQueue(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.intranet.reviewQueue(tenantId, user);
  }

  @Post('content/:id/review')
  review(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: { decision: 'approve' | 'reject'; note?: string },
  ) {
    return this.intranet.reviewContent(tenantId, user, id, dto.decision, dto.note);
  }

  @Delete('content/:id')
  deleteContent(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.intranet.deleteContent(tenantId, user, id);
  }

  /** Inline view (video player, poster preview, in-browser documents). */
  @Get('content/:id/file')
  async viewFile(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const fileId = await this.intranet.resolveContentFile(tenantId, user, id, 'view', 'file');
    await this.streamInline(fileId, tenantId, res);
  }

  /** Card thumbnail / cover image. */
  @Get('content/:id/cover')
  async coverImage(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const fileId = await this.intranet.resolveContentFile(tenantId, user, id, 'view', 'cover');
    await this.streamInline(fileId, tenantId, res);
  }

  /** Download — blocked (403) when the item is marked view-only. */
  @Get('content/:id/download')
  async download(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const fileId = await this.intranet.resolveContentFile(tenantId, user, id, 'download', 'file');
    const { stream, meta } = await this.files.getStream(fileId, tenantId);
    res.setHeader('Content-Type', meta.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${meta.fileName.replace(/"/g, '')}"`,
    );
    stream.pipe(res);
  }

  // ── banners ─────────────────────────────────────────────────────

  @Get('banners')
  listBanners(
    @TenantId() tenantId: string,
    @Query('departmentId') departmentId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('all') all?: string,
  ) {
    return this.intranet.listBanners(tenantId, {
      departmentId,
      categoryId,
      all: all === 'true',
    });
  }

  @Post('banners')
  createBanner(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBannerDto,
  ) {
    return this.intranet.createBanner(tenantId, user, dto);
  }

  @Patch('banners/:id')
  updateBanner(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
  ) {
    return this.intranet.updateBanner(tenantId, user, id, dto);
  }

  @Delete('banners/:id')
  deleteBanner(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.intranet.deleteBanner(tenantId, user, id);
  }

  @Get('banners/:id/image')
  async bannerImage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const fileId = await this.intranet.bannerImageFileId(tenantId, id);
    await this.streamInline(fileId, tenantId, res);
  }

  private async streamInline(fileId: string, tenantId: string, res: Response) {
    const { stream, meta } = await this.files.getStream(fileId, tenantId);
    res.setHeader('Content-Type', meta.contentType);
    res.setHeader('Content-Disposition', 'inline');
    stream.pipe(res);
  }
}
