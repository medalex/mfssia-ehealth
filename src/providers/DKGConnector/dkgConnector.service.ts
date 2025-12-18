import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as DKG from 'dkg.js';
import { IAssetResponse } from '../../interfaces/IAssetResponse';


@Injectable()
export class DkgService {   
  public readonly dkg: DKG;  

  constructor(private config: ConfigService) {
    this.dkg = new DKG(this.config.get('dkg'));
  }

  async getDkgNode(): Promise<unknown> {    
      return await this.dkg.node.info(); 
  }

  async createAsset(asset: Record<string, unknown>): Promise<IAssetResponse> {
    try {
      let response = await this.dkg.asset.create({public: asset}, {epochsNum: 2});
      console.log(response);    
    return response;
    } catch (e) {
      console.log( {e});
    }
  }

  async readAsset(ual: string): Promise<unknown> {   
    return await this.dkg.asset.get(ual, {
      validate: true,
      commitOffset: 0,
      maxNumberOfRetries: 5,
      blockchain: this.dkg.blockchain
    });    
  }
}
