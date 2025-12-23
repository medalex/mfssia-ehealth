import { Injectable } from '@nestjs/common';
import { DkgService } from '../../providers/dkg/dkg.service';
import { NodeInfoResponseDto } from './node.-info.dto';

@Injectable()
export class InfrastructureService {
  constructor(private readonly dkgService: DkgService ) {}
  
  async getNodeInfo(): Promise<NodeInfoResponseDto> {
    return await this.dkgService.getDkgNodeInfo();
  }
}
