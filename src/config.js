module.exports = {
  publicIP: process.env.PUBLIC_IP || '127.0.0.1',
  port: process.env.PORT || 3000,
  fqdn: process.env.FQDN || 'localhost.com',
  loggerLevel: process.env.LOGGER_LEVEL || 'debug',
  projectName: process.env.PROJECT_NAME || 'REDIRECT.CENTER',
  activateUptime: process.env.ACTIVATE_UPTIME || 'true',
  activateCounter: process.env.ACTIVATE_COUNTER || 'true',
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: process.env.REDIS_PORT || '6379',
  githubProjectAddress: process.env.GITHUB_PROJECT_ADDRESS || 'udleinati/redirect.center',
  githubProjectAuthorEmail: process.env.GITHUB_PROJECT_AUTHOR_EMAIL || 'udlei@nati.biz',
  googleAnalyticsCode: process.env.GOOGLE_ANALYTICS_CODE || 'UA-51158860-1',
  alertMessage: process.env.ALERT_MESSAGE || ''
}
