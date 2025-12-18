import { Injectable } from '@nestjs/common';
import { DkgService } from '../../providers/DKGConnector/dkgConnector.service';

@Injectable()
export class QueryService {
  constructor(private readonly dkgConnector: DkgService) {}

 
  async getNodeInfo(): Promise<any> {
    return await this.dkgConnector.getDkgNode();
  }

  async queryAsset(UAL: string): Promise<any> {
    return await this.dkgConnector.readAsset(UAL);
  }
}
