import { Module } from '@nestjs/common';
import { OrgMastersController } from './org-masters.controller';
import { OrgMastersService } from './org-masters.service';

@Module({
  controllers: [OrgMastersController],
  providers: [OrgMastersService],
})
export class OrgMastersModule {}
