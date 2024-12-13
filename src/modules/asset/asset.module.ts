import { Module } from '@nestjs/common';
import { DKGConnectorModule } from "src/providers/DKGConnector/dkgConnector.module";
import { AssetController } from "./asset.controller";
import { AssetService } from "./asset.service";

@Module({
    imports: [DKGConnectorModule],
    controllers: [AssetController],
    providers: [AssetService]
  })
  export class AssetModule {}