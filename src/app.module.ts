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
    ContractModule
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
