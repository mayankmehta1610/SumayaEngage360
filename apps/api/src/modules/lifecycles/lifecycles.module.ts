import { Module } from '@nestjs/common';
import { LifecyclesController } from './lifecycles.controller';
import { LifecyclesService } from './lifecycles.service';

@Module({ controllers: [LifecyclesController], providers: [LifecyclesService], exports: [LifecyclesService] })
export class LifecyclesModule {}
