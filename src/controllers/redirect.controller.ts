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
import { GuardianService, RedirectService, StatisticService } from 'src/services';

@Controller()
export class RedirectController {
  constructor(
    private readonly service: RedirectService,
    private readonly guardian: GuardianService,
    private readonly statistic: StatisticService,
  ) {}

  @Get('*')
  @Redirect()
  async redirect(@Headers('host') host: string, @Req() req: Request) {
    host = host.split(':')[0];

    /* source guardian */
    if (this.guardian.isDenied(host)) throw new ForbiddenException();

    /* redirect rules */
    let redirect;

    try {
      redirect = await this.service.resolveDnsAndRedirect(host, req.url);
    } catch (err) {
      throw new InternalServerErrorException(`${err.code}: ${err.message}`);
    }

    /* destination gaurdian */
    if (this.guardian.isDenied(redirect.fqdn)) throw new ForbiddenException();

    /* statistics */
    this.statistic.write(host);

    return redirect;
  }
}
