// src/common/utils/setup-swagger.ts
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);

  const appName = configService.get<string>('app.name') || 'MFSSIA API';
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';

  const config = new DocumentBuilder()
    .setTitle(`${appName} - API Documentation`)
    .setDescription(
      `
# MFSSIA — Multi-Factor Self-Sovereign Authentication Protocol

**Why this name?**

- **Multi-Factor**: Trust is established through **multiple independent verification factors** bundled in a Challenge Set and evaluated via policy.
- **Self-Sovereign**: Users control their identity (DID) and receive **portable, verifiable proof** (Identity Attestation on DKG) — no central issuer.
- **Authentication Protocol**: Standardized flow using evidence + decentralized oracle verification → reusable, tamper-proof credentials.

**Environment**: ${nodeEnv.toUpperCase()}

---

## 🔹 Frontend Integration Guide (JavaScript)

### 1️⃣ Connect to the Oracle WebSocket Gateway
\`\`\`js
import { io } from 'socket.io-client';

const socket = io('wss://<backend-domain>/ws/oracle', {
  path: '/ws/oracle',
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected to Oracle Gateway:', socket.id);
});
\`\`\`

### 2️⃣ Subscribe to a Verification Instance
\`\`\`js
const verificationInstanceId = 'INSTANCE_ID_HERE';
socket.emit('oracle.subscribe', { verificationInstanceId });
\`\`\`

### 3️⃣ Listen for Real-time Events
\`\`\`js
const events = [
  'oracle.connected',
  'oracle.verification.requested',
  'oracle.verification.processing',
  'oracle.verification.success',
  'oracle.verification.failed',
  'oracle.verification.error',
];

events.forEach((event) => {
  socket.on(event, (payload) => {
    console.log(\`Event: \${event}\`, payload);
  });
});
\`\`\`

> Only events for the subscribed verificationInstanceId will be received.

---

## Process Flow Diagram
\`\`\`mermaid
sequenceDiagram
    participant Governance as Governance/DAO
    participant Marketplace as Marketplace UI
    participant User as User (DID Owner)
    participant Backend as MFSSIA Backend
    participant Oracle as Chainlink Functions DON
    participant DKG as Distributed Knowledge Graph

    Governance->>Backend: Create Challenge Definitions (C-A-1, C-B-4, etc.)
    Backend->>DKG: Anchor Challenge Definitions (immutable)
    Governance->>Backend: Create Challenge Sets (Example-A, B, C, D)
    Backend->>DKG: Anchor Challenge Sets (published to marketplace)
    User->>Marketplace: Browse available Challenge Sets
    Marketplace-->>User: List Example-A, B, C, D
    User->>Backend: Register DID + Select Challenge Set
    Backend->>User: Issue Challenge Instance
    User->>Backend: Submit Evidence
    Backend->>Oracle: Trigger batch verification
    Oracle-->>Backend: Return result (finalResult, passedChallenges, confidence)
    alt Verification PASS
        Backend->>DKG: Anchor Identity Attestation
        Backend->>User: Return success + Attestation UAL
    else Verification FAIL
        Backend->>User: Return failure
    end
\`\`\`

---

## Integration Points: DKG Anchoring & Oracle Invocation

### What is Anchored on DKG (Immutable Knowledge Assets)
| Object | When Anchored | Purpose |
|--------|---------------|--------|
| Challenge Definitions | After governance creation | Reusable verification rules |
| Challenge Sets | After approval | Policy bundles (marketplace) |
| Identity Attestation | After oracle PASS | Proof of DID passed verification |

> Transient data (evidence, instances) is **never** anchored on DKG.

### Oracle Invocation
- Triggered automatically when **all mandatory evidence is submitted**
- Runs via "VerificationService.triggerBatchVerification()"
- Results drive **policy evaluation & attestation anchoring**

---

## Data Persistence: Local DB vs DKG Anchoring

| Entity | Stored Fields | Purpose & Lifecycle |
|--------|---------------|------------------|
| MfssiaIdentity | DID, requestedChallengeSet, registrationState | Tracks onboarding; persistent until deletion |
| ChallengeInstance | nonce, issuedAt, expiresAt, state | Session-bound; cleaned after completion/timeout |
| ChallengeEvidence | evidence JSON, submittedAt | Temporary; deleted after oracle processing |
| MfssiaAttestation | UAL, validFrom/Until, oracle proof | Cached locally for returning-user validation |

> Local DB data is **ephemeral or cached** — not authoritative.

### Challenge Instance State Cycle
\`\`\`mermaid
stateDiagram-v2
    [*] --> IN_PROGRESS : Instance created
    IN_PROGRESS --> EVIDENCE_COLLECTED : User submits evidence
    EVIDENCE_COLLECTED --> ORACLE_PENDING : All mandatory evidence received
    ORACLE_PENDING --> VERIFIED : Oracle returns PASS + policy satisfied
    ORACLE_PENDING --> FAILED : Oracle FAIL or policy not met
    VERIFIED --> ATTESTATION_ANCHORED : Saved to DKG
    IN_PROGRESS --> EXPIRED : Timeout
    FAILED --> [*]
    EXPIRED --> [*]
    ATTESTATION_ANCHORED --> VALID : Used for returning login
    VALID --> EXPIRED : validUntil reached
\`\`\`

> Only final verified outcomes are saved on DKG — everything else remains local and ephemeral.

---

> All responses: { success, message, data, statusCode, timestamp }  
> Use **Bearer JWT** for protected endpoints (governance actions).

`,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    customCss: `
      .swagger-ui .topbar { background-color: #1a1a1a; }
      .swagger-ui .info { margin: 50px 0; }
      .swagger-ui .markdown code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }
    `,
    customSiteTitle: `${appName} | API Docs`,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      syntaxHighlight: {
        theme: 'agate',
      },
    },
  });
}
