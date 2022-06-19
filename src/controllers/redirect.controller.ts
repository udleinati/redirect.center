import { Controller, ForbiddenException, Get, Headers, Redirect, Req } from '@nestjs/common';
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
    const redirect = await this.service.resolveDnsAndRedirect(host, req.url);

    /* destination gaurdian */
    if (this.guardian.isDenied(redirect.fqdn)) throw new ForbiddenException();

    /* statistics */
    this.statistic.write(host);

    return redirect;
  }
}
