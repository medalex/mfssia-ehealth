// src/modules/system/system.service.ts
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { DkgService } from 'src/providers/DKGConnector/dkgConnector.service';
import { System } from 'src/modules/system/system.entity';
import { PublishSystemRequestDto } from './dto/system.publish-request.dto';
import { SystemMapper } from './system.mapper';
import { PublishSystemResponseDto } from './dto/system.publish-response.dto';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private static readonly SCHEMA = 'http://schema.org/';


  constructor(private readonly dkgConnector: DkgService) {}

  async findByUuid(uuid: string): Promise<System | null> {  
    const query =
      "PREFIX mfssia:<http://schema.org/> " +
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
      'SELECT ?s ?p ?o WHERE {' +
      '?s rdf:type mfssia:System . ' +
      `?s mfssia:uuid '${uuid}' . ` +
      '?s ?p ?o . ' +
      '}';

    this.logger.debug(`Executing SPARQL query: ${query}`);

    const result = await this.dkgConnector.dkg.graph.query(query, 'SELECT');

    this.logger.debug(`SPARQL query result: ${JSON.stringify(result)}`);
    const rows = result?.data ?? result;     

    if (!Array.isArray(rows) || rows.length === 0) {
      this.logger.debug(`No system found for uuid=${uuid}`);
      return null;
    }

    return this.mapSystem(rows);         
  }

  async publish(dto: PublishSystemRequestDto): Promise<PublishSystemResponseDto> {
    const systemEntity = SystemMapper.toEntity(dto);

    const existing = await this.findByUuid(systemEntity.uuid);
    if (existing) {
      throw new ConflictException('System already exists');
    }

    const asset = this.mapToAsset(systemEntity);

    const created = await this.dkgConnector.createAsset(asset);

    this.logger.debug(`Created system : ${created ? JSON.stringify(created) : ''}`);

    return {
      system: SystemMapper.toResponse(systemEntity),
      ual: created.UAL,
    };
  }


  private mapSystem(sparqlRows: any[]): System {
    const system = new System();

    if (!Array.isArray(sparqlRows)) {
      this.logger.warn('mapSystem: expected array of rows');
      return system;
    }

    for (const row of sparqlRows) {      
      let predicate = row.p ?? row['p'];
      let object = row.o ?? row['o'];

      if (object && typeof object === 'object' && 'value' in object) {
        object = object.value;
      }
      
      const oStr = object != null ? String(object).replace(/\"/g, '') : '';

      this.logger.debug(`Processing predicate: ${predicate}, object: ${oStr}`);

      switch (predicate) {        
        case `${SystemService.SCHEMA}uuid`:
          system.uuid = oStr;
          break;

        case `${SystemService.SCHEMA}timestamp`:
          system.timestamp = oStr;
          break;

        case `${SystemService.SCHEMA}network`:
          system.network = oStr;
          break;

        case `${SystemService.SCHEMA}contracts`:
          this.logger.debug(`Adding contract: ${oStr}`);
          system.contracts.push(Number(oStr.split('^^')[0]));
          break;

        default:
          break;
}

    }

    return system;
  }

  private mapToAsset(system: System): Record<string, unknown> {
    const newAsset: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'System',
      uuid: system.uuid,
      timestamp: system.timestamp,
      network: system.network,      
      contracts: system.contracts ?? [],
    };

    this.logger.debug(`Prepared newAsset: ${JSON.stringify(newAsset)}`);
    return newAsset;
  }
}
