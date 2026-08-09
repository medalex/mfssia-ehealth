import { Module } from '@nestjs/common';
import { EvmPublisherService } from './evm-publisher.service';

@Module({
  providers: [EvmPublisherService],
  exports: [EvmPublisherService],
})
export class EvmPublisherModule {}
