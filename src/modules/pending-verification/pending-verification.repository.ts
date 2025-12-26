import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PendingVerification } from './entities/pending-verification.entity';

@Injectable()
export class PendingVerificationRepository extends Repository<PendingVerification> {
  constructor(private dataSource: DataSource) {
    super(PendingVerification, dataSource.createEntityManager());
  }
}
