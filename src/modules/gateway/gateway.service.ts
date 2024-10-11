import { Injectable } from '@nestjs/common';
import { DKGConnectorService } from '../../providers/DKGConnector/dkgConnector.service';

@Injectable()
export class DKGGatewayService {
  constructor(private readonly dkgConnector: DKGConnectorService) {}

  options = {
    query: `PREFIX identifiers: <http://schema.org/identifiers>
                SELECT ?contractNumber
                WHERE { 
                  ?x identifiers:value ?contractNumber .
                }`,
  };
}
