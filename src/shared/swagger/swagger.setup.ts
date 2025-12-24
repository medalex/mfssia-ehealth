// src/common/utils/setup-swagger.ts (refactored)
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
# MFSSIA (Multi-Factor Self-Sovereign Authentication) API

**Environment**: ${nodeEnv.toUpperCase()}

## Process Flow Diagram

Below is the end-to-end MFSSIA authentication flow as a Mermaid sequence diagram.

\`\`\`mermaid
sequenceDiagram
    participant Governance as Governance/DAO
    participant Marketplace as Marketplace UI
    participant User as User (DID Owner)
    participant Backend as MFSSIA Backend
    participant Oracle as Chainlink Functions DON
    participant DKG as Distributed Knowledge Graph

    %% Phase 1: Governance Setup
    Governance->>Backend: Create Challenge Definitions (C-A-1, C-B-4, etc.)
    Backend->>DKG: Anchor Challenge Definitions (immutable)
    Governance->>Backend: Create Challenge Sets (Example-A, B, C, D)
    Backend->>DKG: Anchor Challenge Sets (published to marketplace)

    %% Phase 2: User Registration & Selection
    User->>Marketplace: Browse available Challenge Sets
    Marketplace-->>User: List Example-A, B, C, D
    User->>Backend: Register DID + Select Challenge Set (e.g., Example-D)
    Backend->>Backend: Create Identity record (local DB, state: PENDING_CHALLENGE)

    %% Phase 3: Challenge Instance & Evidence Submission
    Backend->>User: Issue Challenge Instance (nonce, expiresAt)
    User->>Backend: Submit Evidence for each challenge (hashes, spans, signatures, etc.)
    Backend->>Backend: Store evidence (local, not trusted yet)
    Note over Backend: When all mandatory evidence received

    %% Phase 4: Oracle Verification
    Backend->>Oracle: Trigger batch verification (inline JS script + args)
    Oracle->>Oracle: Execute verification logic (pure compute, consensus)
    Oracle-->>Backend: Return result (finalResult, passedChallenges, confidence)

    %% Phase 5: Aggregation & Attestation
    alt Verification PASS
        Backend->>Backend: Apply Challenge Set policy (e.g., weighted confidence ≥ 0.85)
        Backend->>DKG: Anchor Identity Attestation (UAL)
        Backend->>User: Return success + Attestation UAL
        Note over User,DKG: Returning user can now present UAL for fast auth
    else Verification FAIL
        Backend->>User: Return failure (retry or support)
    end

    %% Phase 6: Returning User (Fast Path)
    User->>Backend: Present DID + Attestation UAL
    Backend->>DKG: Query & verify Attestation (valid, unexpired, oracle proof)
    alt Valid
        Backend->>User: Grant access (no new challenge)
    else Expired/Invalid
        Backend->>User: Issue new Challenge Instance → repeat flow
    end
\`\`\`

## Module Overview & Purpose

### challenge-definitions
**Purpose**: Governance-managed atomic verification rules (e.g., source authenticity, hash check, provenance).  
These are reusable primitives used across all challenge sets.

### challenge-sets
**Purpose**: Pre-approved bundles of challenge definitions (Example-A, B, C, etc.).  
Defines trust policy: mandatory/optional challenges and aggregation rules.

### identities
**Purpose**: Register and manage user DIDs within the MFSSIA ecosystem.

### challenge-instances
**Purpose**: Create time-bound, nonce-protected authentication sessions for a DID + selected challenge set.

### challenge-evidence
**Purpose**: Submit structured proof artifacts (hashes, spans, signatures) for individual challenges.

### attestations
**Purpose**: Retrieve and verify final Identity Attestations anchored on DKG.  
Used for fast returning-user authentication.

> All responses are wrapped in a consistent format: { success, message, data, statusCode, timestamp }

> Use Bearer token for protected endpoints (governance actions).
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
      docExpansion: 'none', // Collapse all by default
      syntaxHighlight: {
        theme: 'agate',
      },
    },
  });
}
