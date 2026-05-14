import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sequence } from './sequence.entity';
import { SequenceService } from './sequence.service';
import { SequenceController } from './sequence.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sequence]), AuthModule],
  controllers: [SequenceController],
  providers: [SequenceService],
  exports: [SequenceService, TypeOrmModule],
})
export class SequenceModule {}
