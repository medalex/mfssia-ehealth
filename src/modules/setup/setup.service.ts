import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { readFile } from 'fs/promises';
import { getCurrentTimestamp } from '../../shared/utils/timestampUtils';
import { DKGConnectorService } from '../../providers/DKGConnector/dkgConnector.service';
import { IAssetResponse } from '../../interfaces/IAssetResponse';

@Injectable()
export class DKGInitialSetupService {
  constructor(private readonly dkgConnector: DKGConnectorService ) {}
  
  async getNodeInfo(): Promise<any> {
    return await this.dkgConnector.getDkgNode();
  }
}
