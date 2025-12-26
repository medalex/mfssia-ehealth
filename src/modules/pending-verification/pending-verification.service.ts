import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreatePendingVerificationDto } from './dto/create-pending-verification.dto';
import { UpdatePendingVerificationDto } from './dto/update-pending-verification.dto';
import { PendingVerificationRepository } from './pending-verification.repository';
import { PendingVerification } from './entities/pending-verification.entity';
import { PendingVerificationStatus } from './pending-verification.enums';

@Injectable()
export class PendingVerificationService {
  constructor(private readonly repo: PendingVerificationRepository) {}

  async create(
    dto: CreatePendingVerificationDto,
  ): Promise<PendingVerification> {
    const existing = await this.repo.findOneBy({ requestId: dto.requestId });
    if (existing) {
      throw new ConflictException(
        `Pending verification for requestId ${dto.requestId} already exists`,
      );
    }

    const pending = this.repo.create({
      ...dto,
      status: dto.status || PendingVerificationStatus.PENDING,
      requestedAt: new Date(),
    });

    return this.repo.save(pending);
  }

  async findOne(id: string): Promise<PendingVerification> {
    const pending = await this.repo.findOneBy({ id });
    if (!pending) {
      throw new NotFoundException(
        `Pending verification with id ${id} not found`,
      );
    }
    return pending;
  }

  async findByRequestId(
    requestId: string,
  ): Promise<PendingVerification | null> {
    return await this.repo.findOneBy({ requestId });
  }

  async update(
    id: string,
    dto: UpdatePendingVerificationDto,
  ): Promise<PendingVerification> {
    const pending = await this.findOne(id);

    Object.assign(pending, {
      ...dto,
      completedAt:
        dto.status && dto.status !== 'PENDING'
          ? new Date()
          : pending.completedAt,
    });

    return this.repo.save(pending);
  }

  async updateByRequestId(
    requestId: string,
    dto: Partial<UpdatePendingVerificationDto>,
  ): Promise<PendingVerification> {
    const pending = await this.repo.findOneBy({ requestId });
    if (!pending) {
      throw new NotFoundException(
        `No pending record for requestId ${requestId}`,
      );
    }

    Object.assign(pending, {
      ...dto,
      completedAt:
        dto.status && dto.status !== 'PENDING'
          ? new Date()
          : pending.completedAt,
    });

    return this.repo.save(pending);
  }

  async remove(id: string): Promise<void> {
    const pending = await this.findOne(id);
    await this.repo.remove(pending);
  }
}
