import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MfssiaIdentity } from './entities/mfssia-identity.entity';
import { IdentityService } from './mfssia-identity.service';
import { IdentityController } from './mfssia-identity.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MfssiaIdentity])],
  providers: [IdentityService],
  controllers: [IdentityController],
  exports: [IdentityService],
})
export class IdentityModule {}
