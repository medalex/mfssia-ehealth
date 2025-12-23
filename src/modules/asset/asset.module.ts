import { Module } from '@nestjs/common';
import { DkgModule } from "src/providers/dkg/dkg.module";
import { AssetController } from "./asset.controller";
import { AssetService } from "./asset.service";

@Module({
    imports: [DkgModule],
    controllers: [AssetController],
    providers: [AssetService]
  })
  export class AssetModule {}