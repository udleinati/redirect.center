import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  // template engine
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  // start server
  const server = await app.listen(config.get('app.port'), '0.0.0.0');

  // https://shuheikagawa.com/blog/2019/04/25/keep-alive-timeout/
  server.keepAliveTimeout = 2 * 60 * 1000;

  logger.log(`Server is listening on port ${config.get('app.port')}`, 'NestApplication');
}

bootstrap();
