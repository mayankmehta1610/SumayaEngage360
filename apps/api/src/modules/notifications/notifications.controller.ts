import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/auth/roles.decorator';
import { TenantId } from '../../common/tenant/tenant.decorator';
import { NotificationsService } from './notifications.service';

class SendDto {
  @IsString() code: string;
  @IsString() channel: string;
  @IsString() recipient: string;
  @IsObject() vars: Record<string, string>;
}

class TemplateDto {
  @IsString() code: string;
  @IsString() channel: string;
  @IsOptional() @IsString() subject?: string;
  @IsString() body: string;
}

@Controller('notifications')
@Roles(Role.TENANT_ADMIN, Role.HR)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('templates')
  templates(@TenantId() tenantId: string) {
    return this.notifications.listTemplates(tenantId);
  }

  @Get('deliveries')
  deliveries(@TenantId() tenantId: string) {
    return this.notifications.listDeliveries(tenantId);
  }

  @Post('send')
  send(@TenantId() tenantId: string, @Body() dto: SendDto) {
    return this.notifications.send(tenantId, dto.code, dto.channel, dto.recipient, dto.vars);
  }

  @Post('templates')
  createTemplate(@TenantId() tenantId: string, @Body() dto: TemplateDto) {
    return this.notifications.createTemplate(tenantId, dto);
  }

  @Patch('templates/:id')
  updateTemplate(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: Partial<TemplateDto>) {
    return this.notifications.updateTemplate(tenantId, id, dto);
  }
}
