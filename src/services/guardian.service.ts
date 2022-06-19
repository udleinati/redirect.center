import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';

@Injectable()
export class GuardianService {
  private readonly db = new JsonDB(new Config('db/guardian', false, false, '/'));

  constructor(@InjectPinoLogger(GuardianService.name) private readonly logger: PinoLogger) {
    const interval = 15 * 1000;
    setInterval(() => {
      this.logger.debug(`db.reload - interval ${interval}`);
      this.db.reload();
    }, interval).unref();
  }

  isDenied(fqdn: string): boolean {
    const isDenied = this.db.getData('/denyFqdn').includes(fqdn);
    this.logger.debug(`isDenied ${fqdn} ${isDenied}`);
    return isDenied;
  }
}
