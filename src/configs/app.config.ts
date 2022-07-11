export const appConfig = (): AppConfig => ({
  fqdn: process.env.FQDN || 'localhost',
  entryIp: process.env.ENTRY_IP || '127.0.0.1',
  ip: process.env.IP || '0.0.0.0',
  port: Number(process.env.PORT) || 3000,
  environment: process.env.ENVIRONMENT || 'dev1',
  nodeEnv: process.env.NODE_ENV || 'development',
  projectName: process.env.PROJECT_NAME || 'redirect.center',
  loggerLevel: process.env.LOGGER_LEVEL || 'debug',
});

interface AppConfig {
  fqdn: string;
  ip: string;
  port: number;
  environment: string;
  nodeEnv: string;
  projectName: string;
  entryIp: string;
  loggerLevel: string;
}
