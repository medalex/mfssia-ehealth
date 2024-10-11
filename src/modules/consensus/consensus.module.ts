import { Module } from "@nestjs/common";
import { DKGConnectorModule } from "src/providers/DKGConnector/dkgConnector.module";
import { ConsensusController } from "./consensus.controller";
import { ConsensusService } from "./consensus.service";

@Module({
    imports: [DKGConnectorModule],
    controllers: [ConsensusController],
    providers: [ConsensusService],
  })
  export class ConsensusModule {}