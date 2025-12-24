import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CorsMiddleware } from './middlewares/cors/cors.middleware';
import { OriginMiddleware } from './middlewares/origin/origin.middleware';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: false,
      load: [appConfig, databaseConfig],
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
  ],
  controllers: [AppController],
  providers: [AppService],
})

// export class AppModule {}
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorsMiddleware, OriginMiddleware).forRoutes('*');
  }
}
