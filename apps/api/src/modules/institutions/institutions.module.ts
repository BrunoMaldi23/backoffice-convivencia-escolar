import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { InstitutionsService } from './institutions.service';

@Module({ imports: [DatabaseModule], providers: [InstitutionsService], exports: [InstitutionsService] })
export class InstitutionsModule {}
