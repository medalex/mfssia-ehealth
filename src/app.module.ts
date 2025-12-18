import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import { CorsMiddleware } from './middlewares/cors/cors.middleware';
import { OriginMiddleware } from './middlewares/origin/origin.middleware';
import { ConsensusModule } from './modules/consensus/consensus.module';
import { ContractModule } from './modules/contract/contract.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { MedicalLicenseModule } from './modules/medical-license/medical-license.module';
import { PatientDataModule } from './modules/patient-data/patient-data.module';
import { PatientPermissionModule } from './modules/patient-permission/patient-permission.module';
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module';
import { SystemModule } from './modules/system/system.module';
import { SecurityLicenseModule } from './modules/security-license/security-license.module';
import { AssetModule } from './modules/asset/asset.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: false,
      load: [appConfig],
      envFilePath: ['.env'],
    }),
    InfrastructureModule,    
    ConsensusModule,
    ContractModule,
    GatewayModule,
    MedicalLicenseModule,
    PatientPermissionModule,
    PatientDataModule,
    SystemModule,
    SecurityLicenseModule,
    AssetModule    
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
