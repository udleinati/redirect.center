import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { join } from 'path';
import * as psl from 'psl';

@Injectable()
export class GuardianService {
  private readonly filepath = join(__dirname, '..', '..', 'db', 'guardian.json');
  private fileContent: Record<string, any>;

  constructor(@InjectPinoLogger(GuardianService.name) private readonly logger: PinoLogger) {
    const interval = 60 * 1000;

    this.openAndParse();

    setInterval(() => {
      this.logger.debug(`db.reload - interval ${interval}`);
      this.openAndParse();
    }, interval).unref();
  }

  isDenied(fqdn: string): boolean {
    let isDenied;

    try {
      isDenied = this.getFileContent().denyFqdn?.includes(fqdn);

      if (!isDenied) {
        const domain = psl.get(fqdn);
        if (domain) isDenied = this.getFileContent().denyFqdn?.includes(domain);
      }
    } catch (err) {
      throw err;
    }

    return isDenied;
  }

  openAndParse(): void {
    this.fileContent = JSON.parse(readFileSync(this.filepath).toString('utf8') || '{}');
  }

  getFileContent(): Record<string, any> {
    return this.fileContent;
  }
}
