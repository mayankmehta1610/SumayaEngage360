import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GEO_CATALOG } from './geo.catalog';

export interface ResolvedGeo {
  countryCode: string | null;
  countryName: string | null;
  stateId: string | null;
  stateName: string | null;
  cityId: string | null;
  cityName: string | null;
  display: string; // "City, State, Country"
}

@Injectable()
export class GeoService implements OnModuleInit {
  private readonly logger = new Logger(GeoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent boot seeding from the geo catalog. */
  async onModuleInit() {
    try {
      await this.ensureSeeded();
    } catch (e) {
      // Never block boot on seed problems (e.g. read-only replica).
      this.logger.error(`Geo seeding skipped: ${(e as Error).message}`);
    }
  }

  async ensureSeeded() {
    const count = await this.prisma.geoCountry.count();
    if (count >= GEO_CATALOG.length) return;
    for (const c of GEO_CATALOG) {
      await this.prisma.geoCountry.upsert({
        where: { code: c.code },
        create: { code: c.code, name: c.name },
        update: { name: c.name },
      });
      for (const [code, name, type] of c.states) {
        const state = await this.prisma.geoState.upsert({
          where: { countryCode_code: { countryCode: c.code, code } },
          create: { countryCode: c.code, code, name, type: type ?? 'STATE' },
          update: { name, type: type ?? 'STATE' },
        });
        for (const cityName of c.cities[code] ?? []) {
          await this.prisma.geoCity.upsert({
            where: { stateId_name: { stateId: state.id, name: cityName } },
            create: { stateId: state.id, name: cityName, isMajor: true },
            update: { isMajor: true },
          });
        }
      }
    }
    this.logger.log(`Geo master data seeded (${GEO_CATALOG.length} countries)`);
  }

  countries() {
    return this.prisma.geoCountry.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  states(countryCode: string) {
    return this.prisma.geoState.findMany({
      where: { countryCode: countryCode.toUpperCase(), isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * City lookup. When `tenantId` is set and the tenant has provisioned
   * operating cities within the requested scope, only those are returned —
   * so in-tenant pickers offer exactly the cities the company operates in.
   * Falls back to the full master list when nothing is provisioned there.
   */
  async cities(opts: {
    stateId?: string;
    countryCode?: string;
    q?: string;
    tenantId?: string | null;
  }) {
    const where = {
      ...(opts.stateId ? { stateId: opts.stateId } : {}),
      ...(opts.countryCode
        ? { state: { countryCode: opts.countryCode.toUpperCase() } }
        : {}),
      ...(opts.q ? { name: { contains: opts.q, mode: 'insensitive' as const } } : {}),
    };
    if (opts.tenantId) {
      const provisioned = await this.prisma.geoCity.findMany({
        where: {
          ...where,
          tenants: { some: { tenantId: opts.tenantId, isActive: true } },
        },
        include: { state: { select: { name: true, countryCode: true } } },
        orderBy: [{ isMajor: 'desc' }, { name: 'asc' }],
        take: 100,
      });
      if (provisioned.length) return provisioned;
    }
    return this.prisma.geoCity.findMany({
      where,
      include: { state: { select: { name: true, countryCode: true } } },
      orderBy: [{ isMajor: 'desc' }, { name: 'asc' }],
      take: 100,
    });
  }

  /**
   * Tenant admins can add a missing city under an existing state; it is
   * auto-provisioned as one of the tenant's operating cities.
   */
  async addCity(tenantId: string, stateId: string, name: string) {
    const state = await this.prisma.geoState.findUnique({ where: { id: stateId } });
    if (!state) throw new NotFoundException('State not found');
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('City name is required');
    const city = await this.prisma.geoCity.upsert({
      where: { stateId_name: { stateId, name: trimmed } },
      create: { stateId, name: trimmed, addedByTenantId: tenantId },
      update: {},
    });
    await this.provisionCity(tenantId, city.id);
    return city;
  }

  // ── tenant operating cities ─────────────────────────────────────

  tenantCities(tenantId: string) {
    return this.prisma.tenantCity.findMany({
      where: { tenantId, isActive: true },
      include: {
        city: { include: { state: { select: { name: true, countryCode: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async provisionCity(tenantId: string, cityId: string) {
    const city = await this.prisma.geoCity.findUnique({ where: { id: cityId } });
    if (!city) throw new NotFoundException('City not found');
    return this.prisma.tenantCity.upsert({
      where: { tenantId_cityId: { tenantId, cityId } },
      create: { tenantId, cityId },
      update: { isActive: true },
    });
  }

  async removeTenantCity(tenantId: string, cityId: string) {
    await this.prisma.tenantCity.updateMany({
      where: { tenantId, cityId },
      data: { isActive: false },
    });
    return { removed: true };
  }

  /**
   * Validate a structured location and produce names + a display string.
   * Throws when the hierarchy is inconsistent (city not in state, state not
   * in country). All parts optional — pass what you have.
   */
  async resolve(input: {
    countryCode?: string | null;
    stateId?: string | null;
    cityId?: string | null;
  }): Promise<ResolvedGeo> {
    const out: ResolvedGeo = {
      countryCode: null, countryName: null,
      stateId: null, stateName: null,
      cityId: null, cityName: null,
      display: '',
    };
    if (input.cityId) {
      const city = await this.prisma.geoCity.findUnique({
        where: { id: input.cityId },
        include: { state: { include: { country: true } } },
      });
      if (!city) throw new NotFoundException('City not found');
      if (input.stateId && input.stateId !== city.stateId) {
        throw new BadRequestException('City does not belong to the selected state');
      }
      out.cityId = city.id; out.cityName = city.name;
      out.stateId = city.stateId; out.stateName = city.state.name;
      out.countryCode = city.state.countryCode; out.countryName = city.state.country.name;
    } else if (input.stateId) {
      const state = await this.prisma.geoState.findUnique({
        where: { id: input.stateId },
        include: { country: true },
      });
      if (!state) throw new NotFoundException('State not found');
      out.stateId = state.id; out.stateName = state.name;
      out.countryCode = state.countryCode; out.countryName = state.country.name;
    } else if (input.countryCode) {
      const country = await this.prisma.geoCountry.findUnique({
        where: { code: input.countryCode.toUpperCase() },
      });
      if (!country) throw new NotFoundException('Country not found');
      out.countryCode = country.code; out.countryName = country.name;
    }
    if (input.countryCode && out.countryCode && input.countryCode.toUpperCase() !== out.countryCode) {
      throw new BadRequestException('State/city do not belong to the selected country');
    }
    out.display = [out.cityName, out.stateName, out.countryName]
      .filter(Boolean)
      .join(', ');
    return out;
  }

  /**
   * Shared helper for feature services: given a DTO carrying optional
   * countryCode/stateId/cityId, return prisma-ready fields including the
   * synced display string written to `displayField` (each model names its
   * display column differently: Job.location, Candidate.currentLocation,
   * Employee.location). Returns {} when the DTO carries no geo fields.
   */
  async locationFields(
    dto: {
      countryCode?: string | null;
      stateId?: string | null;
      cityId?: string | null;
    },
    displayField: string,
  ): Promise<Record<string, unknown>> {
    if (
      dto.countryCode === undefined &&
      dto.stateId === undefined &&
      dto.cityId === undefined
    ) {
      return {};
    }
    const resolved = await this.resolve(dto);
    return {
      countryCode: resolved.countryCode,
      stateId: resolved.stateId,
      cityId: resolved.cityId,
      ...(resolved.display ? { [displayField]: resolved.display } : {}),
    };
  }
}
