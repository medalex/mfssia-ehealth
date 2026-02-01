import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { MfssiaAttestation } from './entities/mfssia-attestation.entity';
import { DkgService } from 'src/providers/dkg/dkg.service';
import { ChallengeInstanceService } from '../challenge-instance/challenge-instance.service';
import { Uuid } from '@/common/types/common.type';
import { MfssiaAttestationDkgMapper } from './mfssia-attestation.dkg.mapper';
import { ChallengeSetService } from '../challenge-set/challenge-set.service';
import { ATTESTATION_VALIDITY_MS } from '@/constants/time.constant';

@Injectable()
export class AttestationService {
  constructor(
    @InjectRepository(MfssiaAttestation)
    private readonly repo: Repository<MfssiaAttestation>,
    private readonly dkgService: DkgService,
    private readonly instanceService: ChallengeInstanceService,
    private readonly challengeSetService: ChallengeSetService,
  ) {}

  async createFromInstance(
    instanceId: Uuid,
    oracleProof: string,
    passedChallenges: string[],
  ): Promise<MfssiaAttestation> {
    const instance = await this.instanceService.findOne(instanceId);
    const challengeSet = await this.challengeSetService.findById(
      instance.challengeSet,
    );

    const attestation = this.repo.create({
      identity: instance.identity.identifier,
      challengeSet: instance.challengeSet,
      verifiedChallenges: passedChallenges,
      oracleAttestation: oracleProof,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + ATTESTATION_VALIDITY_MS),
      aggregationRule: challengeSet.policy.aggregationRule,
    });

    const dkgDto = MfssiaAttestationDkgMapper.toDkgDto(attestation);
    const dkgAttestation = await this.dkgService.createAsset(dkgDto);

    attestation.ual = dkgAttestation.UAL;

    return await this.repo.save(attestation);
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
