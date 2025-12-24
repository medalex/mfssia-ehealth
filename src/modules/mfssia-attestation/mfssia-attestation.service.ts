import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { MfssiaAttestation } from './entities/mfssia-attestation.entity';
import { DkgService } from 'src/providers/dkg/dkg.service';
import { ChallengeInstanceService } from '../challenge-instance/challenge-instance.service';
import { Uuid } from '@/common/types/common.type';

@Injectable()
export class AttestationService {
  constructor(
    @InjectRepository(MfssiaAttestation)
    private readonly repo: Repository<MfssiaAttestation>,
    private readonly dkgService: DkgService,
    private readonly instanceService: ChallengeInstanceService,
  ) {}

  async createFromInstance(
    instanceId: Uuid,
    oracleProof: string,
    passedChallenges: string[],
  ): Promise<MfssiaAttestation> {
    const instance = await this.instanceService.findOne(instanceId);

    const attestation = this.repo.create({
      identity: instance.identity.identifier,
      challengeSet: instance.challengeSet,
      verifiedChallenges: passedChallenges,
      oracleAttestation: oracleProof,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    const saved = await this.repo.save(attestation);

    // Anchor to DKG
    const ual: any = await this.dkgService.createAsset({
      '@type': 'mfssia:IdentityAttestation',
      ...attestation,
    });

    saved.ual = ual;
    return this.repo.save(saved);
  }

  async findValidByDid(did: string): Promise<MfssiaAttestation[]> {
    return this.repo.find({
      where: {
        identity: did,
        validUntil: MoreThan(new Date()),
      },
    });
  }
}
