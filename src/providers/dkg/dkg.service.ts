import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as DKG from 'dkg.js';
import { IAssetResponse } from '../../interfaces/IAssetResponse';
import { DkgQueryResultDto } from './dkg-query-result.dto';
import { NodeInfoResponseDto } from 'src/modules/infrastructure/node.-info.dto';


@Injectable()
export class DkgService {   
  
  private readonly logger = new Logger(DkgService.name);
  private readonly dkg: DKG;  

  constructor(private config: ConfigService) {
    this.dkg = new DKG(this.config.get('dkg'));
  }

  async getDkgNodeInfo(): Promise<NodeInfoResponseDto> {    
      return await this.dkg.node.info(); 
  }

  async createAsset(asset: Record<string, unknown>): Promise<IAssetResponse> {
    try {
      const response = await this.dkg.asset.create({public: asset}, {epochsNum: 2});
      this.logger.debug(response);    
      return response;

    } catch (e) {
      this.logger.error(`Error creating asset: ${e.message}`);

      throw e;
    }
  }

  //TODO: Check if options param is required or it is enough to use the default configuration
  async readAsset(ual: string): Promise<unknown> {   
    return await this.dkg.asset.get(ual, {
      validate: true,
      commitOffset: 0,
      maxNumberOfRetries: 5,
      blockchain: this.dkg.blockchain
    });    
  }

  async findAssets(sparqlQuery: string): Promise<DkgQueryResultDto> {    
    return await this.dkg.graph.query(sparqlQuery, "SELECT");    
  }
}
