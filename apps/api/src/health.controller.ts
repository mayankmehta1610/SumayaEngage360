import { Controller, Get } from '@nestjs/common';
import { Public } from './common/auth/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // NFR-012: basic metrics for observability dashboards.
  @Public()
  @Get('metrics')
  async metrics() {
    const [tenants, users, employees, auditLogs] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.users.count(),
      this.prisma.employee.count(),
      this.prisma.auditLog.count(),
    ]);
    return {
      tenants,
      users,
      employees,
      auditLogs,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
