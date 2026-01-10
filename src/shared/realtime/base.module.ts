import { Module } from '@nestjs/common';
import { OracleGateway } from './oracle.gateway';

@Module({
  imports: [],
  providers: [OracleGateway],
  // exports: [OracleGateway],
})
export class OracleBaseModule {}
