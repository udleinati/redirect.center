export const appConfig = (): AppConfig => ({
  fqdn: process.env.FQDN || 'localhost',
  entryIp: process.env.ENTRY_IP || '127.0.0.1',
  listenPort: Number(process.env.LISTEN_PORT) || 3000,
  listenIp: process.env.LISTEN_IP || '0.0.0.0',
  environment: process.env.ENVIRONMENT || 'dev1',
  nodeEnv: process.env.NODE_ENV || 'development',
  projectName: process.env.PROJECT_NAME || 'redirect.center',
  loggerLevel: process.env.LOGGER_LEVEL || 'debug',
});

interface AppConfig {
  fqdn: string;
  listenPort: number;
  listenIp: string;
  environment: string;
  nodeEnv: string;
  projectName: string;
  entryIp: string;
  loggerLevel: string;
}
