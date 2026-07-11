import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { OidcService } from './oidc.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly oidc: OidcService,
  ) {}

  // Bootstrap: the first registered user becomes the platform admin.
  // After that, users are created by admins/HR through their own flows.
  async register(dto: RegisterDto) {
    const userCount = await this.prisma.users.count();
    if (userCount > 0) {
      throw new ConflictException(
        'Self-registration is disabled. Users are created by an administrator.',
      );
    }
    const user = await this.prisma.users.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        firstName: dto.firstName,
        lastName: dto.lastName,
        roles: [Role.PLATFORM_ADMIN],
        tenantId: null,
      },
    });
    return this.issueToken(user.id);
  }

  async login(dto: LoginDto, tenantId?: string) {
    const user = await this.prisma.users.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        isActive: true,
        ...(tenantId ? { tenantId } : {}),
      },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueToken(user.id);
  }

  async ssoProviders(tenantId: string) {
    return this.prisma.ssoProvider.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, provider: true, issuerUrl: true, clientId: true },
    });
  }

  // OIDC callback stub: validates provider is enabled and issues JWT for mapped user.
  async ssoLogin(tenantId: string, dto: { email: string; provider: string; idToken?: string }) {
    const user = await this.oidc.validateAndLogin(tenantId, dto.email, dto.idToken);
    return this.issueToken(user.id);
  }

  async upsertSsoProvider(tenantId: string, dto: {
    provider: string; issuerUrl: string; clientId: string; clientSecret?: string; isActive?: boolean;
  }) {
    return this.prisma.ssoProvider.upsert({
      where: { tenantId_provider: { tenantId, provider: dto.provider } },
      create: { tenantId, ...dto, isActive: dto.isActive ?? true },
      update: { issuerUrl: dto.issuerUrl, clientId: dto.clientId, clientSecret: dto.clientSecret, isActive: dto.isActive ?? true },
    });
  }

  private async issueToken(userId: string) {
    const user = await this.prisma.users.findUniqueOrThrow({
      where: { id: userId },
    });
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
      roles: user.roles,
      email: user.email,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        tenantId: user.tenantId,
      },
    };
  }
}
