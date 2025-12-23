import { Body, Controller, Get, Logger, Param, Post, Query, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AssetService } from "./asset.service";
import { AssetRequest } from "./asset.request";
import { SearchAssetDto } from "./asset.dto.search";

@ApiTags('Assets')
@Controller('/api/assets')
export class AssetController {
    private readonly logger = new Logger(AssetController.name);
    constructor(private readonly assetService: AssetService) {};

    @Post("publish")
    @ApiOperation({ summary: 'Publish asset' })
    @ApiResponse({ status: 201, description: 'Asset published' })
    @UsePipes(new ValidationPipe({ transform: true }))    
    async publish(@Body() asset: AssetRequest): Promise<any> {
      this.logger.log(`Publishing asset: ${JSON.stringify(asset)}`);
  
      return await this.assetService.publish(asset);
    }
    
    @Get()
    @ApiOperation({ summary: 'Search assets' })
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))  
    async getAsset(@Query() q  : SearchAssetDto): Promise<Object> {
      return await this.assetService.find(q.property, q.value, q.schema, q.type);
    }

    @Get(':ual')
    @ApiOperation({ summary: 'Get asset by UAL' })
    async getAssetByUal(@Param('ual') ual: string): Promise<unknown> {
      return await this.assetService.findByUal(ual);
    }
}