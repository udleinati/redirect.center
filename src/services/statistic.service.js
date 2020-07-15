const { parseDomain } = require('parse-domain')
const redis = require('redis')
const bluebird = require('bluebird')
const config = require('../config')
const LoggerHandler = require('../handlers/logger.handler')

module.exports = class StatisticService {
  constructor(req) {
    if (config.activateCounter !== 'true') return

    if (!global.redisClient) {
      bluebird.promisifyAll(redis.RedisClient.prototype)
      bluebird.promisifyAll(redis.Multi.prototype)
      global.redisClient = redis.createClient({
        host: config.redisHost,
        port: config.redisPort
      })
    }
    this.redisClient = global.redisClient
    this.req = req
    this.logger = new LoggerHandler()
    this.path = `${this.req.requestId} StatisticService`
  }

  async put(hostname) {
    if (config.activateCounter !== 'true') return true

    let parse = parseDomain(hostname)
    const everDomains = this.redisClient.setAsync(`ever_domains_${parse.domain}.${parse.topLevelDomains}`, '1')
    const periodHosts = this.redisClient.setAsync(`24h_hosts_${parse.subDomains}.${parse.domain}.${parse.topLevelDomains}`, '1', 'EX', 86400)
    const periodDomains = this.redisClient.setAsync(`24h_domains_${parse.domain}.${parse.topLevelDomains}`, '1', 'EX', 86400)
    parse = null

    try {
      await Promise.all([everDomains, periodHosts, periodDomains])
      this.logger.info(`${this.path} put ${hostname}`)
      return true
    } catch (err) {
      this.logger.error(`${this.path} overview catch ${err.message}`)
      throw err
    }
  }

  async overview() {
    if (config.activateCounter !== 'true') return {}

    const everDomains = this.redisClient.send_commandAsync('eval', ['return table.getn(redis.call("keys", "ever_domains_*"))', 0])
    const periodHosts = this.redisClient.send_commandAsync('eval', ['return table.getn(redis.call("keys", "24h_hosts_*"))', 0])
    const periodDomains = this.redisClient.send_commandAsync('eval', ['return table.getn(redis.call("keys", "24h_domains_*"))', 0])

    try {
      const result = await Promise.all([everDomains, periodHosts, periodDomains])
      this.logger.info(`${this.path} overview then`)
      return {
        everDomains: result[0],
        periodHosts: result[1],
        periodDomains: result[2]
      }
    } catch (err) {
      this.logger.error(`${this.path} overview catch ${err.message}`)
      throw err
    }
  }
}
