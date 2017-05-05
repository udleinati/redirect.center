import Router from 'express'
import dns from 'dns'
import parseDomain from 'parse-domain'

import RedirectService from '../services/redirect.service'
import LoggerHandler from '../handlers/logger.handler'

export default () => {
  const router = Router()
  const logger = LoggerHandler

  router.all('*', (req, res) => {
    let host = req.headers.host.split(':')[0]
    let targetHost = host
    const path = `Host ${host}`
    logger.info(path)

    host = 'nati.biz'
    if (!parseDomain(host).subdomain) {
      logger.info(`${path} A:ROOT DOMAIN`)
      targetHost = `redirect.${host}`
    }

    dns.resolve(targetHost, 'CNAME', (err, records) => {
      logger.info(`Host ${targetHost} resolve CNAME`)
      if (err) console.error(err)

      const redirectService = new RedirectService(req, res)
      redirectService.perform(records[0]).then((returns) => {
        const url = `${returns.protocol}://${returns.hostname}/${returns.path}`
        logger.info(`${path} redirect ${returns.statusCode} to ${url}`)
        return res.status(returns.statusCode).send(url)
      })
    })
  })

  return router
}
