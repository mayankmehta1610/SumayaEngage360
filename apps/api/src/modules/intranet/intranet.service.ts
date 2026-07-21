import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IntranetAccessLevel,
  IntranetContentStatus,
  Prisma,
} from '@prisma/client';
import { JwtPayload } from '../../common/auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateBannerDto,
  CreateCategoryDto,
  CreateContentDto,
  ListContentQuery,
  UpdateBannerDto,
  UpdateCategoryDto,
  UpdateContentDto,
} from './intranet.dto';

const MAX_CATEGORY_DEPTH = 3;
const PUBLISHER_ROLES = ['TENANT_ADMIN', 'HR'];

interface Secured {
  accessLevel: IntranetAccessLevel;
  allowedRoles: Prisma.JsonValue | null;
  departmentId: string | null;
  createdBy: string | null;
}

@Injectable()
export class IntranetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvals: ApprovalsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── access model ────────────────────────────────────────────────

  /** TENANT_ADMIN / HR publish anywhere; DEPARTMENT_HEAD within their department. */
  private isPublisher(user: JwtPayload): boolean {
    return user.roles.some((r) => PUBLISHER_ROLES.includes(r));
  }

  private async actorDepartmentId(tenantId: string, userId: string): Promise<string | null> {
    const emp = await this.prisma.employee.findFirst({
      where: { tenantId, userId },
      select: { departmentId: true },
    });
    return emp?.departmentId ?? null;
  }

  async canManageDepartment(tenantId: string, user: JwtPayload, departmentId: string): Promise<boolean> {
    if (this.isPublisher(user)) return true;
    if (!user.roles.includes('DEPARTMENT_HEAD')) return false;
    const deptId = await this.actorDepartmentId(tenantId, user.sub);
    return deptId === departmentId;
  }

  private async assertCanManage(tenantId: string, user: JwtPayload, departmentId: string) {
    if (!(await this.canManageDepartment(tenantId, user, departmentId))) {
      throw new ForbiddenException('You cannot publish for this department');
    }
  }

  /** Any employee may contribute content within their own department. */
  private async assertCanContribute(tenantId: string, user: JwtPayload, departmentId: string) {
    if (this.isPublisher(user)) return;
    const deptId = await this.actorDepartmentId(tenantId, user.sub);
    if (deptId !== departmentId) {
      throw new ForbiddenException('You can only add content to your own department');
    }
  }

  /**
   * Can this user moderate (approve/reject) the given content? The category's
   * reviewerRole decides who reviews: a role (e.g. HR for talent content) means
   * users with that role review; otherwise the department head — and tenant
   * admins/HR can always moderate.
   */
  private async canReview(
    tenantId: string,
    user: JwtPayload,
    item: { departmentId: string; categoryId: string | null },
  ): Promise<boolean> {
    if (user.roles.some((r) => ['TENANT_ADMIN', 'HR'].includes(r))) return true;
    const reviewerRole = item.categoryId
      ? (await this.prisma.intranetCategory.findUnique({
          where: { id: item.categoryId },
          select: { reviewerRole: true },
        }))?.reviewerRole ?? null
      : null;
    if (reviewerRole) return user.roles.includes(reviewerRole);
    // Default reviewer: the head of the content's department.
    return this.canManageDepartment(tenantId, user, item.departmentId);
  }

  private canView(item: Secured, user: JwtPayload, actorDeptId: string | null): boolean {
    if (this.isPublisher(user)) return true;
    if (item.createdBy === user.sub) return true;
    switch (item.accessLevel) {
      case 'COMPANY':
        return true;
      case 'DEPARTMENT':
        return actorDeptId !== null && actorDeptId === item.departmentId;
      case 'ROLES': {
        const allowed = Array.isArray(item.allowedRoles) ? (item.allowedRoles as string[]) : [];
        return allowed.some((r) => user.roles.includes(r));
      }
      case 'PRIVATE':
        return false;
      default:
        return false;
    }
  }

  // ── categories (department → up to 3 levels) ────────────────────

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 80) || 'category';
  }

  private async categoryDepth(tenantId: string, categoryId: string): Promise<number> {
    let depth = 1;
    let current = await this.prisma.intranetCategory.findFirst({
      where: { id: categoryId, tenantId },
      select: { parentId: true },
    });
    if (!current) throw new NotFoundException('Category not found');
    while (current.parentId && depth <= MAX_CATEGORY_DEPTH) {
      depth += 1;
      current = await this.prisma.intranetCategory.findFirst({
        where: { id: current.parentId, tenantId },
        select: { parentId: true },
      });
      if (!current) break;
    }
    return depth;
  }

  async createCategory(tenantId: string, user: JwtPayload, dto: CreateCategoryDto) {
    await this.assertCanManage(tenantId, user, dto.departmentId);
    const dept = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, tenantId },
    });
    if (!dept) throw new NotFoundException('Department not found');

    if (dto.parentId) {
      const parent = await this.prisma.intranetCategory.findFirst({
        where: { id: dto.parentId, tenantId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
      if (parent.departmentId !== dto.departmentId) {
        throw new BadRequestException('Parent category belongs to a different department');
      }
      const parentDepth = await this.categoryDepth(tenantId, dto.parentId);
      if (parentDepth >= MAX_CATEGORY_DEPTH) {
        throw new BadRequestException(`Categories can nest at most ${MAX_CATEGORY_DEPTH} levels deep`);
      }
    }

    const base = this.slugify(dto.name);
    const clash = await this.prisma.intranetCategory.count({
      where: { tenantId, departmentId: dto.departmentId, parentId: dto.parentId ?? null, slug: base },
    });
    const slug = clash ? `${base}-${Date.now().toString(36)}` : base;

    return this.prisma.intranetCategory.create({
      data: {
        tenantId,
        departmentId: dto.departmentId,
        parentId: dto.parentId,
        name: dto.name,
        slug,
        description: dto.description,
        icon: dto.icon,
        bannerFileId: dto.bannerFileId,
        accessLevel: dto.accessLevel ?? 'COMPANY',
        allowedRoles: dto.allowedRoles as Prisma.InputJsonValue | undefined,
        reviewerRole: dto.reviewerRole,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: user.sub,
      },
    });
  }

  async updateCategory(tenantId: string, user: JwtPayload, id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.intranetCategory.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.assertCanManage(tenantId, user, cat.departmentId);
    return this.prisma.intranetCategory.update({
      where: { id },
      data: {
        ...dto,
        allowedRoles: dto.allowedRoles as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deleteCategory(tenantId: string, user: JwtPayload, id: string) {
    const cat = await this.prisma.intranetCategory.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.assertCanManage(tenantId, user, cat.departmentId);
    const [children, contents] = await Promise.all([
      this.prisma.intranetCategory.count({ where: { tenantId, parentId: id } }),
      this.prisma.intranetContent.count({ where: { tenantId, categoryId: id } }),
    ]);
    if (children || contents) {
      throw new BadRequestException(
        'Category still has sub-categories or content. Move or delete them first.',
      );
    }
    return this.prisma.intranetCategory.delete({ where: { id } });
  }

  /** Full category tree for one department, filtered by the caller's access. */
  async categoryTree(tenantId: string, user: JwtPayload, departmentId: string) {
    const actorDeptId = await this.actorDepartmentId(tenantId, user.sub);
    const all = await this.prisma.intranetCategory.findMany({
      where: { tenantId, departmentId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const visible = all.filter((c) => this.canView(c, user, actorDeptId));
    const contentCounts = await this.prisma.intranetContent.groupBy({
      by: ['categoryId'],
      where: { tenantId, departmentId, status: 'PUBLISHED' },
      _count: { _all: true },
    });
    const countMap = new Map(contentCounts.map((c) => [c.categoryId, c._count._all]));
    type Node = (typeof all)[number] & { children: Node[]; contentCount: number };
    const nodes = new Map<string, Node>(
      visible.map((c) => [c.id, { ...c, children: [], contentCount: countMap.get(c.id) ?? 0 }]),
    );
    const roots: Node[] = [];
    for (const node of nodes.values()) {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  // ── content ─────────────────────────────────────────────────────

  private async assertValidCategory(tenantId: string, departmentId: string, categoryId?: string) {
    if (!categoryId) return;
    const cat = await this.prisma.intranetCategory.findFirst({
      where: { id: categoryId, tenantId },
    });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat.departmentId !== departmentId) {
      throw new BadRequestException('Category belongs to a different department');
    }
  }

  async createContent(tenantId: string, user: JwtPayload, dto: CreateContentDto) {
    await this.assertCanContribute(tenantId, user, dto.departmentId);
    await this.assertValidCategory(tenantId, dto.departmentId, dto.categoryId);
    if (dto.type === 'LINK' && !dto.externalUrl) {
      throw new BadRequestException('Link content needs an externalUrl');
    }
    if (['DOCUMENT', 'VIDEO', 'POSTER'].includes(dto.type) && !dto.fileId) {
      throw new BadRequestException(`${dto.type.toLowerCase()} content needs an uploaded file`);
    }
    return this.prisma.intranetContent.create({
      data: {
        tenantId,
        departmentId: dto.departmentId,
        categoryId: dto.categoryId,
        type: dto.type,
        title: dto.title,
        summary: dto.summary,
        body: dto.body,
        fileId: dto.fileId,
        coverFileId: dto.coverFileId,
        externalUrl: dto.externalUrl,
        accessLevel: dto.accessLevel ?? 'COMPANY',
        allowedRoles: dto.allowedRoles as Prisma.InputJsonValue | undefined,
        downloadable: dto.downloadable ?? true,
        pinned: dto.pinned ?? false,
        tags: dto.tags ?? [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdBy: user.sub,
      },
    });
  }

  async updateContent(tenantId: string, user: JwtPayload, id: string, dto: UpdateContentDto) {
    const item = await this.prisma.intranetContent.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Content not found');
    // The author may edit their own not-yet-published content; managers anytime.
    const isOwnerDraft = item.createdBy === user.sub && item.status !== 'PUBLISHED';
    if (!isOwnerDraft) await this.assertCanManage(tenantId, user, item.departmentId);
    if (dto.categoryId) await this.assertValidCategory(tenantId, item.departmentId, dto.categoryId);
    return this.prisma.intranetContent.update({
      where: { id },
      data: {
        ...dto,
        allowedRoles: dto.allowedRoles as Prisma.InputJsonValue | undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        updatedBy: user.sub,
      },
    });
  }

  /** DRAFT → PENDING_REVIEW → PUBLISHED → ARCHIVED workflow. */
  async transitionContent(
    tenantId: string,
    user: JwtPayload,
    id: string,
    action: 'submit' | 'publish' | 'unpublish' | 'archive',
  ) {
    const item = await this.prisma.intranetContent.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Content not found');
    // Authors may submit their own draft for review; publish/unpublish/archive
    // require management rights on the department.
    if (action === 'submit') {
      const isOwner = item.createdBy === user.sub;
      if (!isOwner) await this.assertCanContribute(tenantId, user, item.departmentId);
    } else {
      await this.assertCanManage(tenantId, user, item.departmentId);
    }

    const transitions: Record<string, { from: IntranetContentStatus[]; to: IntranetContentStatus }> = {
      submit: { from: ['DRAFT'], to: 'PENDING_REVIEW' },
      publish: { from: ['DRAFT', 'PENDING_REVIEW', 'ARCHIVED'], to: 'PUBLISHED' },
      unpublish: { from: ['PUBLISHED', 'PENDING_REVIEW'], to: 'DRAFT' },
      archive: { from: ['PUBLISHED', 'PENDING_REVIEW', 'DRAFT'], to: 'ARCHIVED' },
    };
    const t = transitions[action];
    if (!t.from.includes(item.status)) {
      throw new BadRequestException(`Cannot ${action} content that is ${item.status}`);
    }
    const updated = await this.prisma.intranetContent.update({
      where: { id },
      data: {
        status: t.to,
        ...(action === 'publish' ? { publishedAt: new Date(), publishedBy: user.sub } : {}),
        updatedBy: user.sub,
      },
    });
    if (action === 'submit') {
      // If the tenant configured an approval chain for intranet content, open
      // a request; approval auto-publishes, rejection returns it to draft.
      // Without a workflow the item stays in review for manual publishing.
      await this.approvals.startRequest(tenantId, 'INTRANET_CONTENT', id);
    }
    if (action === 'publish') {
      void this.notifications
        .notifyIntranetPublished(tenantId, updated)
        .catch(() => undefined);
    }
    return updated;
  }

  async deleteContent(tenantId: string, user: JwtPayload, id: string) {
    const item = await this.prisma.intranetContent.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Content not found');
    // Authors may remove their own not-yet-published content; managers anything.
    const isOwnerDraft = item.createdBy === user.sub && item.status !== 'PUBLISHED';
    if (!isOwnerDraft) await this.assertCanManage(tenantId, user, item.departmentId);
    return this.prisma.intranetContent.delete({ where: { id } });
  }

  // ── moderation ──────────────────────────────────────────────────

  /** Content awaiting review that the current user is entitled to moderate. */
  async reviewQueue(tenantId: string, user: JwtPayload) {
    const pending = await this.prisma.intranetContent.findMany({
      where: { tenantId, status: 'PENDING_REVIEW' },
      include: { category: { select: { id: true, name: true, reviewerRole: true } } },
      orderBy: { updatedAt: 'asc' },
      take: 200,
    });
    const mine = [];
    for (const item of pending) {
      if (await this.canReview(tenantId, user, item)) mine.push(item);
    }
    return mine;
  }

  /** Approve (→ published) or reject (→ draft with a reason) a submission. */
  async reviewContent(
    tenantId: string,
    user: JwtPayload,
    id: string,
    decision: 'approve' | 'reject',
    note?: string,
  ) {
    const item = await this.prisma.intranetContent.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Content not found');
    if (item.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Only content pending review can be moderated');
    }
    if (!(await this.canReview(tenantId, user, item))) {
      throw new ForbiddenException('You are not a reviewer for this content');
    }
    if (decision === 'reject') {
      return this.prisma.intranetContent.update({
        where: { id },
        data: {
          status: 'DRAFT',
          reviewNote: note ?? 'Returned for changes',
          reviewedBy: user.sub,
          reviewedAt: new Date(),
          updatedBy: user.sub,
        },
      });
    }
    const updated = await this.prisma.intranetContent.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: user.sub,
        reviewNote: note ?? null,
        reviewedBy: user.sub,
        reviewedAt: new Date(),
        updatedBy: user.sub,
      },
    });
    void this.notifications.notifyIntranetPublished(tenantId, updated).catch(() => undefined);
    return updated;
  }

  async listContent(tenantId: string, user: JwtPayload, query: ListContentQuery) {
    const manager = this.isPublisher(user) || user.roles.includes('DEPARTMENT_HEAD');
    const where: Prisma.IntranetContentWhereInput = { tenantId };
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.type) where.type = query.type;
    // Readers only ever see live content; managers can filter any status.
    if (manager && query.status) where.status = query.status;
    else if (!manager) {
      where.status = 'PUBLISHED';
      where.OR = [{ expiresAt: null }, { expiresAt: { gte: new Date() } }];
    }
    if (query.q) {
      const q = query.q;
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { summary: { contains: q, mode: 'insensitive' } },
            { tags: { has: q.toLowerCase() } },
          ],
        },
      ];
    }
    const rows = await this.prisma.intranetContent.findMany({
      where,
      include: { category: { select: { id: true, name: true, parentId: true } } },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
    const actorDeptId = await this.actorDepartmentId(tenantId, user.sub);
    return rows.filter((r) => this.canView(r, user, actorDeptId));
  }

  /** Detail view — access-checked; bumps the view counter for readers. */
  async getContent(tenantId: string, user: JwtPayload, id: string) {
    const item = await this.prisma.intranetContent.findFirst({
      where: { id, tenantId },
      include: { category: { select: { id: true, name: true, parentId: true } } },
    });
    if (!item) throw new NotFoundException('Content not found');
    const actorDeptId = await this.actorDepartmentId(tenantId, user.sub);
    if (!this.canView(item, user, actorDeptId)) {
      throw new ForbiddenException('You do not have access to this content');
    }
    if (item.status === 'PUBLISHED') {
      void this.prisma.intranetContent
        .update({ where: { id }, data: { viewCount: { increment: 1 } } })
        .catch(() => undefined);
    }
    return item;
  }

  /**
   * Resolve a content item's file for viewing or download.
   * Enforces access level; download additionally requires `downloadable`.
   */
  async resolveContentFile(
    tenantId: string,
    user: JwtPayload,
    id: string,
    intent: 'view' | 'download',
    which: 'file' | 'cover' = 'file',
  ): Promise<string> {
    const item = await this.prisma.intranetContent.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Content not found');
    const actorDeptId = await this.actorDepartmentId(tenantId, user.sub);
    if (!this.canView(item, user, actorDeptId)) {
      throw new ForbiddenException('You do not have access to this content');
    }
    if (intent === 'download' && !item.downloadable && !this.isPublisher(user)) {
      throw new ForbiddenException('Downloading this content is not allowed — view it online instead');
    }
    const fileId = which === 'cover' ? item.coverFileId : item.fileId;
    if (!fileId) throw new NotFoundException('No file attached to this content');
    return fileId;
  }

  // ── banners ─────────────────────────────────────────────────────

  async listBanners(
    tenantId: string,
    opts: { departmentId?: string; categoryId?: string; all?: boolean } = {},
  ) {
    const where: Prisma.IntranetBannerWhereInput = { tenantId };
    if (!opts.all) {
      const now = new Date();
      where.isActive = true;
      where.AND = [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ];
      if (opts.categoryId) where.categoryId = opts.categoryId;
      else if (opts.departmentId) {
        where.departmentId = opts.departmentId;
        where.categoryId = null;
      } else {
        where.departmentId = null;
        where.categoryId = null;
      }
    }
    return this.prisma.intranetBanner.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createBanner(tenantId: string, user: JwtPayload, dto: CreateBannerDto) {
    if (dto.departmentId) await this.assertCanManage(tenantId, user, dto.departmentId);
    else if (!this.isPublisher(user)) {
      throw new ForbiddenException('Only HR or tenant admins can manage company-wide banners');
    }
    return this.prisma.intranetBanner.create({
      data: {
        tenantId,
        departmentId: dto.departmentId,
        categoryId: dto.categoryId,
        title: dto.title,
        subtitle: dto.subtitle,
        imageFileId: dto.imageFileId,
        linkUrl: dto.linkUrl,
        sortOrder: dto.sortOrder ?? 0,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        createdBy: user.sub,
      },
    });
  }

  async updateBanner(tenantId: string, user: JwtPayload, id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.intranetBanner.findFirst({ where: { id, tenantId } });
    if (!banner) throw new NotFoundException('Banner not found');
    if (banner.departmentId) await this.assertCanManage(tenantId, user, banner.departmentId);
    else if (!this.isPublisher(user)) {
      throw new ForbiddenException('Only HR or tenant admins can manage company-wide banners');
    }
    return this.prisma.intranetBanner.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async deleteBanner(tenantId: string, user: JwtPayload, id: string) {
    const banner = await this.prisma.intranetBanner.findFirst({ where: { id, tenantId } });
    if (!banner) throw new NotFoundException('Banner not found');
    if (banner.departmentId) await this.assertCanManage(tenantId, user, banner.departmentId);
    else if (!this.isPublisher(user)) {
      throw new ForbiddenException('Only HR or tenant admins can manage company-wide banners');
    }
    return this.prisma.intranetBanner.delete({ where: { id } });
  }

  async bannerImageFileId(tenantId: string, id: string): Promise<string> {
    const banner = await this.prisma.intranetBanner.findFirst({ where: { id, tenantId } });
    if (!banner?.imageFileId) throw new NotFoundException('Banner image not found');
    return banner.imageFileId;
  }

  async categoryBannerFileId(tenantId: string, id: string): Promise<string> {
    const cat = await this.prisma.intranetCategory.findFirst({ where: { id, tenantId } });
    if (!cat?.bannerFileId) throw new NotFoundException('Category banner not found');
    return cat.bannerFileId;
  }

  // ── home page aggregate (SharePoint-style landing) ──────────────

  async home(tenantId: string, user: JwtPayload) {
    const actorDeptId = await this.actorDepartmentId(tenantId, user.sub);
    const now = new Date();
    const liveContent: Prisma.IntranetContentWhereInput = {
      tenantId,
      status: 'PUBLISHED',
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    };
    const [banners, departments, pinnedRaw, recentRaw, deptCounts] = await Promise.all([
      this.listBanners(tenantId),
      this.prisma.department.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.intranetContent.findMany({
        where: { ...liveContent, pinned: true },
        include: { category: { select: { id: true, name: true } } },
        orderBy: { publishedAt: 'desc' },
        take: 12,
      }),
      this.prisma.intranetContent.findMany({
        where: liveContent,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { publishedAt: 'desc' },
        take: 24,
      }),
      this.prisma.intranetContent.groupBy({
        by: ['departmentId'],
        where: liveContent,
        _count: { _all: true },
      }),
    ]);
    const countMap = new Map(deptCounts.map((d) => [d.departmentId, d._count._all]));
    const pinned = pinnedRaw.filter((c) => this.canView(c, user, actorDeptId)).slice(0, 6);
    const recent = recentRaw.filter((c) => this.canView(c, user, actorDeptId)).slice(0, 12);
    const reviewPending = (await this.reviewQueue(tenantId, user)).length;
    return {
      banners,
      departments: departments.map((d) => ({
        ...d,
        contentCount: countMap.get(d.id) ?? 0,
        isMine: d.id === actorDeptId,
      })),
      pinned,
      recent,
      myDepartmentId: actorDeptId,
      canPublish: this.isPublisher(user) || user.roles.includes('DEPARTMENT_HEAD'),
      // Any employee assigned to a department can contribute content there.
      canContribute: this.isPublisher(user) || actorDeptId !== null,
      reviewPending,
    };
  }
}
