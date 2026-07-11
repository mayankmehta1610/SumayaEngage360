import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { CandidatesController } from './candidates.controller';
import { HiringClientsController } from './hiring-clients.controller';
import { HiringClientsService } from './hiring-clients.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';

@Module({
  imports: [MatchingModule],
  controllers: [
    CandidatesController,
    HiringClientsController,
    JobsController,
    ApplicationsController,
    InterviewsController,
    OffersController,
  ],
  providers: [
    HiringClientsService,
    JobsService,
    ApplicationsService,
    InterviewsService,
    OffersService,
  ],
  exports: [JobsService, ApplicationsService],
})
export class AtsModule {}
