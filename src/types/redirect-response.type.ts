import { HttpStatus } from '@nestjs/common';
import { Destination } from './destination.type';

export class RedirectResponse {
  url: string;
  status: HttpStatus;
  fqdn: string;

  constructor(destination: Destination) {
    this.fqdn = destination.host;
    this.status = destination.status;
    this.url = `${destination.protocol}://${destination.host}`;

    if (destination.pathnames.length) this.url += destination.pathnames.join();
    if (destination.queries) this.url += `?${destination.queries.join('&')}`;
  }
}
