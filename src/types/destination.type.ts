import { HttpStatus } from '@nestjs/common';

export class Destination {
  protocol: 'http' | 'https' = 'http';
  host: string;
  pathnames: string[] = [];
  queries: string[] = [];
  status: HttpStatus = 301;
}
