import { Controller, Get, Param } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../prisma/prisma.service';

// Resource planning: bench view (spare capacity) and skill-based matching
// of employees to a project's required skills.
@Controller('resourcing')
@Roles(Role.TENANT_ADMIN, Role.HR, Role.MANAGER)
export class ResourcingController {
  constructor(private readonly prisma: PrismaService) {}

  // Everyone with live allocation < 100% (bench = spare capacity), sorted
  // by most available first.
  @Get('bench')
  async bench(@TenantId() tenantId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'ON_NOTICE'] } },
      select: {
        id: true, employeeCode: true, designation: true,
        user: { select: { firstName: true, lastName: true } },
        skills: { select: { skill: { select: { name: true } } } },
        allocations: { where: { endDate: null }, select: { percentage: true } },
      },
    });
    return employees
      .map((e) => {
        const allocated = e.allocations.reduce((s, a) => s + a.percentage, 0);
        return {
          id: e.id, employeeCode: e.employeeCode, designation: e.designation,
          name: `${e.user.firstName} ${e.user.lastName}`,
          skills: e.skills.map((s) => s.skill.name),
          allocatedPercent: allocated,
          availablePercent: Math.max(0, 100 - allocated),
        };
      })
      .filter((e) => e.availablePercent > 0)
      .sort((a, b) => b.availablePercent - a.availablePercent);
  }

  // Rank available employees against a project's required skills
  // (ProjectSkill rows when present, else the project's job-family keywords).
  @Get('projects/:projectId/match')
  async match(@TenantId() tenantId: string, @Param('projectId') projectId: string) {
    const project = await this.prisma.project.findFirstOrThrow({
      where: { id: projectId, tenantId },
      select: { id: true, name: true, description: true },
    });
    // required skills: any skills recorded for the project via master data;
    // fall back to keywords from the description
    const projectSkills = await this.prisma.skill.findMany({
      where: { tenantId, jobSkills: { some: {} } },
      select: { name: true },
      take: 50,
    });
    const wanted = new Set(
      (project.description ?? '')
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 2),
    );
    const skillNames = projectSkills.map((s) => s.name).filter((n) => wanted.has(n.toLowerCase()));
    const target = (skillNames.length ? skillNames : projectSkills.map((s) => s.name)).map((s) => s.toLowerCase());

    const bench = await this.bench(tenantId);
    return {
      project: { id: project.id, name: project.name },
      targetSkills: target.slice(0, 20),
      candidates: bench
        .map((e) => {
          const have = e.skills.map((s: string) => s.toLowerCase());
          const matched = target.filter((t) => have.some((h: string) => h.includes(t) || t.includes(h)));
          const score = target.length ? Math.round((matched.length / target.length) * 100) : 0;
          return { ...e, matchedSkills: matched, matchScore: score };
        })
        .sort((a, b) => b.matchScore - a.matchScore || b.availablePercent - a.availablePercent)
        .slice(0, 25),
    };
  }
}
