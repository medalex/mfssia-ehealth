import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import appConfig from './config/app.config';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { CorsMiddleware } from './middlewares/cors/cors.middleware';
import { OriginMiddleware } from './middlewares/origin/origin.middleware';
import { DKGSetupModule } from './modules/setup/setup.module';
import { QueryModule } from './modules/query/query.module';
import { ConsensusModule } from './modules/consensus/consensus.module';
import { ContractModule } from './modules/contract/contract.module';
import { MedicalLicenseModule } from './modules/medical-license/medical-license.module';
import { PatientPermission } from './providers/DKGConnector/ehealth/PatientPermission';
import { PatientPermissionModule } from './modules/patient-permission/patient-permission.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: false,
      load: [appConfig],
      envFilePath: ['.env'],
    }),
    DKGSetupModule,
    QueryModule,
    ConsensusModule,
    ContractModule,
    MedicalLicenseModule,
    PatientPermissionModule
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
