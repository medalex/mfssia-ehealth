import { System } from './system.entity';
import { SystemResponseDto } from './dto/system.response.dto';
import { PublishSystemRequestDto } from './dto/system.publish-request.dto';

export class SystemMapper {
  static toResponse(system: System): SystemResponseDto {
    return {
      uuid: system.uuid,
      timestamp: system.timestamp,
      network: system.network,
      contracts: system.contracts ?? [],
    };
  }

  static toEntity(dto: PublishSystemRequestDto): System {
    const system = new System();

    system.uuid = dto.uuid;
    system.network = dto.network;
    system.contracts = dto.contracts ?? [];
    system.timestamp = new Date().toISOString();

    return system;
  }
}
