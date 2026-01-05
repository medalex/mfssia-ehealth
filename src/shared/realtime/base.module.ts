import { Global, Module } from '@nestjs/common';
import { OracleGateway } from './oracle.gateway';

@Global()
@Module({
  imports: [],
  providers: [OracleGateway],
  exports: [OracleGateway],
})
export class BaseModule {}
