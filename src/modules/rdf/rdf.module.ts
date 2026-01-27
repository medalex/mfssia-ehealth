import { Module } from '@nestjs/common';
import { RdfController } from './rdf.controller';
import { RdfService } from './rdf.service';
import { DkgModule } from '@/providers/dkg/dkg.module';

@Module({
  imports: [DkgModule],
  controllers: [RdfController],
  providers: [RdfService],
  exports: [RdfService],
})
export class RdfModule {}
