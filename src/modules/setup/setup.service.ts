import { Injectable } from '@nestjs/common';
import { DkgService } from '../../providers/DKGConnector/dkgConnector.service';

@Injectable()
export class DKGInitialSetupService {
  constructor(private readonly dkgConnector: DkgService ) {}
  
  async getNodeInfo(): Promise<any> {
    return await this.dkgConnector.getDkgNode();
  }
}
