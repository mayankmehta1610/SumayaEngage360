import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tenantId: string,
    dto: { assetTag: string; category: string; model?: string; serialNo?: string },
  ) {
    return this.prisma.asset.create({ data: { tenantId, ...dto } });
  }

  list(tenantId: string) {
    return this.prisma.asset.findMany({
      where: { tenantId },
      include: {
        assignments: {
          where: { returnedAt: null },
          include: {
            employee: {
              select: {
                employeeCode: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
  }

  async assign(tenantId: string, assetId: string, employeeId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, tenantId },
      include: { assignments: { where: { returnedAt: null } } },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (asset.assignments.length > 0) {
      throw new BadRequestException('Asset is already assigned');
    }
    return this.prisma.assetAssignment.create({
      data: { tenantId, assetId, employeeId },
    });
  }

  async returnAsset(tenantId: string, assignmentId: string, condition?: string) {
    const assignment = await this.prisma.assetAssignment.findFirst({
      where: { id: assignmentId, tenantId, returnedAt: null },
    });
    if (!assignment) throw new NotFoundException('Active assignment not found');
    return this.prisma.assetAssignment.update({
      where: { id: assignmentId },
      data: { returnedAt: new Date(), condition },
    });
  }

  // What an employee currently holds — used by the exit clearance.
  employeeAssets(tenantId: string, employeeId: string) {
    return this.prisma.assetAssignment.findMany({
      where: { tenantId, employeeId, returnedAt: null },
      include: { asset: true },
    });
  }
}
