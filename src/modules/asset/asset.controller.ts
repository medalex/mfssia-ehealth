import { Body, Controller, Get, Header, Logger, Put, Query } from "@nestjs/common";
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

    
    @Get('query')    
    async getAsset(
        @Query("property") property: string, 
        @Query("value") value: string, 
        @Query("schema") schema: string, 
        @Query("type-") type: string
    ): Promise<Object> {
        return await this.assetService.find(property, value, schema, type);
    }


}