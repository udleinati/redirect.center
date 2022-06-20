import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  InternalServerErrorException,
  Redirect,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GuardianService, RedirectService, StatisticService } from 'src/services';
import { RedirectResponse } from 'src/types';

@Controller()
export class RedirectController {
  constructor(
    @InjectPinoLogger(RedirectController.name) private readonly logger: PinoLogger,
    private readonly service: RedirectService,
    private readonly guardian: GuardianService,
    private readonly statistic: StatisticService,
  ) {}

  @Get('*')
  @Redirect()
  async redirect(@Headers('host') host: string, @Req() req: Request) {
    host = host.includes(':') ? host.split(':')[0] : host || 'undefined';

    /* source guardian */
    if (this.guardian.isDenied(host)) throw new ForbiddenException();

    /* redirect rules */
    let redirect: RedirectResponse;

    try {
      redirect = await this.service.resolveDnsAndRedirect(host, req.url);
    } catch (err) {
      throw new InternalServerErrorException(`${err.code}: ${err.message}`);
    }

    /* destination gaurdian */
    if (this.guardian.isDenied(redirect.fqdn)) throw new ForbiddenException();

    /* statistics */
    this.statistic.write(host);

    /* log */
    this.logger.info(`${host}${req.url} -> ${redirect.status} ${redirect.url}`);

    return redirect;
  }
}
