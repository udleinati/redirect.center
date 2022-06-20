import { Controller, Get, NotFoundException, Render } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StatisticService } from 'src/services';
import * as os from 'os';

@Controller({ host: process.env.FQDN || 'localhost' })
export class PageController {
  constructor(private readonly config: ConfigService, private readonly statistic: StatisticService) {}

  @Get()
  @Render('index.hbs')
  async root(): Promise<Record<string, any>> {
    return {
      uptime: os.uptime(),
      app: this.config.get('app'),
      statistics: this.statistic.summary(),
    };
  }

  @Get('*')
  notFound(): void {
    throw new NotFoundException();
  }
}
