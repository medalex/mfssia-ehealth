import { Injectable } from '@nestjs/common';
import { DkgService } from '../../providers/DKGConnector/dkgConnector.service';

@Injectable()
export class InfrastructureService {
  constructor(private readonly dkgService: DkgService ) {}
  
  async getNodeInfo(): Promise<any> {
    return await this.dkgService.getDkgNode();
  }
}
