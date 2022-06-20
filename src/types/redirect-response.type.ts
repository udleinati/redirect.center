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

    if (destination.port && destination.port > 0 && destination.port <= 65535) this.url += `:${destination.port}`;
    if (destination.pathnames.length) this.url += destination.pathnames.join('');
    if (destination.queries.length >= 1) this.url += `?${destination.queries.join('&')}`.replace('?#', '#');
  }
}
