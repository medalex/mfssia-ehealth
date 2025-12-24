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

## Module Overview & Purpose

### challenge-definitions
**Purpose**: Governance-managed atomic verification rules (e.g., source authenticity, hash check, provenance).  
These are reusable primitives used across all challenge sets.

### challenge-sets
**Purpose**: Pre-approved bundles of challenge definitions (Example-A, Example-B, etc.).  
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

### dkg (if present)
**Purpose**: Direct interaction with Distributed Knowledge Graph for publishing/querying immutable assets.

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
      'JWT-auth', // This name is referenced in @ApiBearerAuth('JWT-auth')
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    customCss: '.swagger-ui .topbar { background-color: #1a1a1a; }',
    customSiteTitle: `${appName} | API Docs`,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
