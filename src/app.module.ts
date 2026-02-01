import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module';
import { ChallengeSetModule } from './modules/challenge-set/challenge-set.module';
import { ChallengeDefinitionModule } from './modules/challenge-definitions/challenge-definitions.module';
import { IdentityModule } from './modules/mfssia-identity/mfssia-identity.module';
import { ChallengeInstanceModule } from './modules/challenge-instance/challenge-instance.module';
import { ChallengeEvidenceModule } from './modules/challenge-evidence/challenge-evidence.module';
import { AttestationModule } from './modules/mfssia-attestation/mfssia-attestation.module';
import databaseConfig from './config/database/database.config';
import appConfig from './config/app/app.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OracleVerificationModule } from './providers/oracle/oracle-verification.module';
import blockchainConfig from './config/blockchain/blockchain.config';
import challengesConfig from './config/challenges/challenges.config';
import { OracleBaseModule } from './shared/realtime/base.module';
import { RdfModule } from './modules/rdf/rdf.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: false,
      load: [appConfig, databaseConfig, blockchainConfig, challengesConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    InfrastructureModule,
    ChallengeDefinitionModule,
    ChallengeSetModule,
    IdentityModule,
    ChallengeInstanceModule,
    ChallengeEvidenceModule,
    AttestationModule,
    OracleVerificationModule,
    OracleBaseModule,
    RdfModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
