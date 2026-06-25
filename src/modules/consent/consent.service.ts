import { Injectable, Logger } from '@nestjs/common';
import { DkgService } from '@/providers/dkg/dkg.service';
import { PublishConsentDto } from './dto/publish-consent.dto';
import { RevokeConsentDto } from './dto/revoke-consent.dto';

// rx: ontology namespace used by the physician-access gate SPARQL.
const RX = 'https://mfssia.io/ontology/prescription#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

// Publishes DataSharingConsent / ConsentRevocation as JSON-LD assets.
// IMPORTANT: raw Turtle posted to /rdf is stored but NOT parsed into queryable
// triples by the DKG node, so the gate's SPARQL never sees it. JSON-LD via
// createAsset produces proper triples — the same path used for challenge sets.
@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(private readonly dkgService: DkgService) {}

  async publish(dto: PublishConsentDto): Promise<{ UAL: string }> {
    const asset = {
      '@context': { rx: RX, xsd: XSD },
      '@id': `urn:consent:${dto.consentId}`,
      '@type': 'rx:DataSharingConsent',
      'rx:patient': dto.patientId,
      'rx:consentCovers': dto.organizationId,
      'rx:grantedAt': { '@value': dto.grantedAt, '@type': 'xsd:dateTime' },
      'rx:validUntil': { '@value': dto.validUntil, '@type': 'xsd:dateTime' },
    };
    const res = await this.dkgService.createAsset(asset as any);
    this.logger.log(
      `DataSharingConsent ${dto.consentId} (covers ${dto.organizationId}) → UAL=${res.UAL}`,
    );
    return { UAL: res.UAL };
  }

  async revoke(dto: RevokeConsentDto): Promise<{ UAL: string }> {
    const asset = {
      '@context': { rx: RX, xsd: XSD },
      '@id': `urn:consent-revocation:${dto.consentId}`,
      '@type': 'rx:ConsentRevocation',
      'rx:revokes': { '@id': `urn:consent:${dto.consentId}` },
      'rx:revokedAt': { '@value': new Date().toISOString(), '@type': 'xsd:dateTime' },
    };
    const res = await this.dkgService.createAsset(asset as any);
    this.logger.log(`ConsentRevocation for ${dto.consentId} → UAL=${res.UAL}`);
    return { UAL: res.UAL };
  }
}
