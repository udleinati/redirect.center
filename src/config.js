const config = {
  'publicIP': process.env.PUBLIC_IP || '127.0.0.1',
  'port': process.env.PORT || 3000,
  'fqdn': process.env.FQDN || 'localhost',
  'loggerLevel': process.env.LOGGER_LEVEL || 'debug'
}

export default config
