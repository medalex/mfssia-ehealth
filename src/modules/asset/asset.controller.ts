import { Body, Controller, Get, Header, Logger, Param, Put, Query } from "@nestjs/common";
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
    
    @Get('get')    
    async getAsset(
        @Query("property") property: string, 
        @Query("value") value: string, 
        @Query("schema") schema: string, 
        @Query("type-") type: string
    ): Promise<Object> {
        return await this.assetService.find(property, value, schema, type);
    }

      @Get('get/:ual')
      async getAssetByUal(@Param('ual') ual: string): Promise<unknown> {
        return await this.assetService.fidByUal(ual);
      }


}