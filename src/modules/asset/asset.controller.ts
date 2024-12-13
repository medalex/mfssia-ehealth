import { Body, Controller, Header, Logger, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AssetService } from "./asset.service";
import { AssetRequest } from "./asset.request";

@ApiBearerAuth()
@ApiTags('Asset')
@Controller('/api/asset')
export class AssetController {
    constructor(private readonly assetService: AssetService) {};

    @Put("publish")
    @Header('Content-Type', 'application/json')
      async publish(@Body() asset: AssetRequest): Promise<any> {
        Logger.log({obj: asset})
    
        return await this.assetService.publish(asset);
      }

}