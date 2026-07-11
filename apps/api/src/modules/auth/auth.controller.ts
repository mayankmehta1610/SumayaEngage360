import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { Public } from '../../common/auth/public.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';

class SsoLoginDto {
  @IsEmail() email: string;
  @IsString() provider: string;
  @IsOptional() @IsString() idToken?: string;
}

class SsoConfigDto {
  @IsString() provider: string;
  @IsString() issuerUrl: string;
  @IsString() clientId: string;
  @IsOptional() @IsString() clientSecret?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, (req as any).tenantId);
  }

  @Public()
  @Get('sso/providers')
  ssoProviders(@Req() req: Request) {
    const tenantId = (req as any).tenantId as string;
    if (!tenantId) return [];
    return this.auth.ssoProviders(tenantId);
  }

  @Public()
  @Post('sso/login')
  ssoLogin(@Body() dto: SsoLoginDto, @Req() req: Request) {
    const tenantId = (req as any).tenantId as string;
    if (!tenantId) throw new UnauthorizedException('Tenant required for SSO');
    return this.auth.ssoLogin(tenantId, dto);
  }

  @Post('sso/config')
  @Roles(Role.TENANT_ADMIN)
  ssoConfig(@TenantId() tenantId: string, @Body() dto: SsoConfigDto) {
    return this.auth.upsertSsoProvider(tenantId, dto);
  }
}
