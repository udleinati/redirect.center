import { Module } from '@nestjs/common';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { ConfigModule, ConfigService, registerAs } from '@nestjs/config';
import { appConfig } from './configs';
import { decamelizeKeys } from 'fast-case';
import { sleep } from './functions';
import { PageController } from './controllers/page.controller';
import { RedirectController } from './controllers/redirect.controller';
import { GuardianService, RedirectService, StatisticService } from './services';

@Module({
  imports: [
    /* Global */
    ConfigModule.forRoot({
      load: [registerAs('app', appConfig)],
      isGlobal: true,
    }),

    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        return {
          pinoHttp: {
            messageKey: 'message',
            name: config.get('app').projectName,
            level: config.get('app').loggerLevel,
            formatters: {
              level: label => ({ level: label }),
              log: (log: any) => decamelizeKeys(log, '_'),
            },
          },
          forRoutes: [],
        };
      },
    }),
  ],
  controllers: [PageController, RedirectController],
  providers: [RedirectService, GuardianService, StatisticService],
})
export class AppModule {
  constructor(private readonly logger: PinoLogger) {}

  async beforeApplicationShutdown(signal?: string): Promise<void> {
    this.logger.warn(`Signal received: ${signal}`);
    await sleep(1000);
  }
}
