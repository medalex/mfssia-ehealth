import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';

// Детерминированный хеш: SHA256(licenseNumber), первые 31 байт → BN254 field element.
// Та же формула что stringToField в ehealth-zkp-prover.
function computeCredentialHash(licenseNumber: string): string {
  const h = createHash('sha256').update(licenseNumber, 'utf8').digest('hex');
  return BigInt('0x' + h.slice(0, 62)).toString();
}

export interface Physician {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber: string;
  credentialHash: string;
}

// Реестр лицензированных врачей — источник истины для ZKP-верификации credential.
// ID врачей совпадают с теми что сеятся в ehealth-hospital-api (Seeder.cs).
const PHYSICIAN_REGISTRY: Physician[] = [
  {
    id: '00000000-0000-0000-0002-000000000001',
    firstName: 'James',
    lastName: 'Wilson',
    specialty: 'General Practitioner',
    licenseNumber: 'MED-LIC-2024-001',
    credentialHash: computeCredentialHash('MED-LIC-2024-001'),
  },
  {
    id: '00000000-0000-0000-0002-000000000002',
    firstName: 'Sarah',
    lastName: 'Chen',
    specialty: 'Endocrinologist',
    licenseNumber: 'MED-LIC-2024-002',
    credentialHash: computeCredentialHash('MED-LIC-2024-002'),
  },
  {
    id: '00000000-0000-0000-0002-000000000003',
    firstName: 'Michael',
    lastName: 'Roberts',
    specialty: 'Pulmonologist',
    licenseNumber: 'MED-LIC-2024-003',
    credentialHash: computeCredentialHash('MED-LIC-2024-003'),
  },
];

@Injectable()
export class PhysicianRegistryService {
  findAll(): Physician[] {
    return PHYSICIAN_REGISTRY;
  }

  findById(id: string): Physician {
    const physician = PHYSICIAN_REGISTRY.find(
      (p) => p.id.toLowerCase() === id.toLowerCase(),
    );
    if (!physician) {
      throw new NotFoundException(`Physician ${id} not found in MFSSIA registry`);
    }
    return physician;
  }
}
