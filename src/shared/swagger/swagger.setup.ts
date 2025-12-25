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

## Integration Points: DKG Anchoring & Oracle Invocation

### What is Anchored on DKG (Immutable Knowledge Assets)
These objects are **permanently stored** on the Distributed Knowledge Graph for global auditability:

| Object                        | When Anchored                          | Purpose |
|-------------------------------|----------------------------------------|---------|
| **Challenge Definitions**     | After governance creation              | Reusable atomic verification rules |
| **Challenge Sets**            | After governance approval (Example-A to D) | Trust policy bundles (marketplace) |
| **Identity Attestation**      | **Only on successful verification** (after oracle PASS) | Proof of DID passing a challenge set → enables fast login |

> Transient data (evidence, instances) is **never** anchored on DKG.

### When & Where the Oracle is Invoked
| Trigger Condition                          | Invocation Point                  | Details |
|--------------------------------------------|-----------------------------------|---------|
| All **mandatory** evidence submitted       | **Automatically** by backend      | In \`VerificationService.triggerBatchVerification()\` |
| Never manual — fully automated             | End of Phase 2 → Start of Phase 3 | Ensures no tampering; oracle runs pure compute-only JS |

> Oracle result drives final policy decision and attestation anchoring.

## Data Persistence: Local DB vs DKG Anchoring

### What is Stored in Local Database (PostgreSQL)
The local DB holds **transient, session-specific data** — never trusted until verified.

| Entity                     | Stored Fields                              | Purpose & Lifecycle (Technical + Business) |
|----------------------------|--------------------------------------------|-------------------------------------------|
| **MfssiaIdentity**         | DID, requestedChallengeSet, registrationState | **Technical**: Tracks user onboarding and selected challenge set.<br>**Business**: Ensures each DID has a single active registration path; prevents duplicate or conflicting attempts.<br>Lifecycle: Persistent until user deletion. |
| **ChallengeInstance**      | nonce, issuedAt, expiresAt, state (IN_PROGRESS → VERIFIED/FAILED) | **Technical**: Enforces anti-replay and time-bounding for authentication sessions.<br>**Business**: Guarantees freshness of evidence submission and prevents replay attacks.<br>Lifecycle: Short-lived (expires in minutes); cleaned up after completion or timeout. |
| **ChallengeEvidence**      | evidence JSON, submittedAt                 | **Technical**: Temporarily holds user-submitted proofs before oracle verification.<br>**Business**: Enables asynchronous submission while maintaining audit trail of what was provided.<br>Lifecycle: Deleted after oracle processing or instance expiry. |
| **MfssiaAttestation** (local copy) | UAL, validFrom/Until, oracle proof          | **Technical**: Fast cache for returning-user validation without DKG query.<br>**Business**: Enables instant login for valid attestations; improves UX while preserving security.<br>Lifecycle: Updated on renewal; kept for performance. |

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
    IN_PROGRESS --> EXPIRED : Timeout (no full evidence)
    FAILED --> [*]
    EXPIRED --> [*]
    ATTESTATION_ANCHORED --> VALID : Used for returning login
    VALID --> EXPIRED : validUntil reached
\`\`\`

### When Data is Saved to DKG (Immutable & Authoritative)
**Only final, verified outcomes** are anchored on DKG:

| Data                          | Trigger Condition                                | When Saved | Technical + Business Value |
|-------------------------------|--------------------------------------------------|------------|----------------------------|
| **Challenge Definitions**     | Governance creates & approves                    | Immediately after creation | **Technical**: Immutable verification primitives.<br>**Business**: Ensures all verifications use the exact same rules — no drift or tampering. |
| **Challenge Sets**            | Governance publishes (Example-A to D)             | Immediately after approval | **Technical**: Fixed trust policy bundles.<br>**Business**: Guarantees users and auditors know exactly what level of trust was required. |
| **Identity Attestation**      | **Oracle returns PASS** AND policy satisfied     | **Only in Phase 5** — after successful verification | **Technical**: Cryptographic proof of verification.<br>**Business**: Enables reusable, portable, self-sovereign identity across systems — the core MFSSIA value. |

> **Nothing else** (evidence, instances, failed attempts) is ever saved to DKG.  
> This ensures DKG contains **only immutable, verified truth** — the foundation of trust-by-verification.

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
      docExpansion: 'none',
      syntaxHighlight: {
        theme: 'agate',
      },
    },
  });
}
