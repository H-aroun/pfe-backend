import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { RoleGuard } from './role.guard';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role]), AuthModule],
  providers: [RoleGuard],
  exports: [RoleGuard, TypeOrmModule],
})
export class RoleModule {}
