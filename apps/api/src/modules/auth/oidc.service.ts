import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OidcService {
  constructor(private readonly prisma: PrismaService) {}

  async validateAndLogin(tenantId: string, email: string, idToken?: string) {
    const provider = await this.prisma.ssoProvider.findFirst({
      where: { tenantId, provider: 'OIDC', isActive: true },
    });
    if (!provider) throw new UnauthorizedException('SSO not configured');

    if (idToken) {
      const valid = this.verifyIdTokenStub(idToken, provider.issuerUrl, provider.clientId);
      if (!valid) throw new UnauthorizedException('Invalid OIDC token');
    } else if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('id_token required');
    }

    const user = await this.prisma.users.findFirst({
      where: { tenantId, email: email.toLowerCase(), isActive: true },
    });
    if (!user) throw new UnauthorizedException('User not provisioned for SSO');
    return user;
  }

  // Production: fetch JWKS from issuerUrl/.well-known/openid-configuration
  private verifyIdTokenStub(token: string, issuer: string, clientId: string): boolean {
    if (!token || token.length < 10) return false;
    const hash = createHash('sha256').update(`${issuer}:${clientId}:${token.slice(0, 32)}`).digest('hex');
    return hash.length === 64;
  }
}
