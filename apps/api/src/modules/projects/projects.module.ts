import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ResourcingController } from './resourcing.controller';

@Module({
  controllers: [ProjectsController, ResourcingController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
