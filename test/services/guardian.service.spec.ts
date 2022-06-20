import { createMock } from 'ts-auto-mock';
import { PinoLogger } from 'nestjs-pino';
import { GuardianService } from '../../src/services';
import { Logger } from '@nestjs/common';

describe('GuardianService', () => {
  let logger: PinoLogger;
  let service: GuardianService;

  beforeEach(async () => {
    logger = createMock<Logger>() as any;
    service = createMock<GuardianService>();

    service = new GuardianService(logger);

    jest.spyOn((service as any).db, 'reload').mockReturnValue(true);
  });

  describe('isDenied', () => {
    it('true', () => {
      const spyDbGetData = jest.spyOn((service as any).db, 'getData').mockReturnValue(['www.github.com']);
      const isDenied = service.isDenied('www.github.com');
      expect(isDenied).toBe(true);
    });

    it('false', () => {
      const spyDbGetData = jest.spyOn((service as any).db, 'getData').mockReturnValue(['www.github.com']);
      const isDenied = service.isDenied('www.bitbucket.com');
      expect(isDenied).toBe(false);
    });
  });
});
