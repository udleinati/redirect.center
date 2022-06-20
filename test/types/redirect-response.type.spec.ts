import { Destination, RedirectResponse } from '../../src/types';

describe('RedirectResponse', () => {
  describe('new', () => {
    it('test 1', async () => {
      const destination: Destination = {
        protocol: 'https',
        host: 'www.youtube.com',
        pathnames: ['/watch'],
        queries: ['a=b'],
        status: 302,
        port: 8080,
      };

      const response = new RedirectResponse(destination);
      expect(response).toEqual({
        fqdn: 'www.youtube.com',
        status: 302,
        url: 'https://www.youtube.com:8080/watch?a=b',
      });
    });

    it('test 2', async () => {
      const destination: Destination = {
        protocol: 'https',
        pathnames: ['/'],
        status: 301,
        host: '127.0.0.1',
        queries: ['AaBbCc'],
        port: 0,
      };

      const response = new RedirectResponse(destination);
      expect(response).toEqual({
        fqdn: '127.0.0.1',
        status: 301,
        url: 'https://127.0.0.1/?AaBbCc',
      });
    });

    it('test 3', async () => {
      const destination: Destination = {
        protocol: 'http',
        pathnames: [],
        status: 301,
        host: '127.0.0.1',
        queries: [],
        port: 0,
      };

      const response = new RedirectResponse(destination);
      expect(response).toEqual({
        fqdn: '127.0.0.1',
        status: 301,
        url: 'http://127.0.0.1/',
      });
    });
  });
});
