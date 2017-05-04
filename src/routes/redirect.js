import Router from 'express'
import dns from 'dns'
import RedirectService from '../services/redirect.service'

export default () => {
  let router = Router()

  router.all('*', (req, res) => {
    const host = req.headers.host.split(':')[0]
    dns.resolve(host, 'CNAME', (err, records) => {
      if (err) console.error(err)
      // records = ['www.uol.com.br.opts-uri.opts-slash.test.opts-https.opts-statuscode-302.localhost']
      const redirectService = new RedirectService(req, res)
      redirectService.perform(records[0]).then((returns) => {
        const url = `${returns.protocol}://${returns.hostname}/${returns.path}`
        return res.status(returns.statusCode).send(`${returns.protocol}//${url}`)
      })
    })

    res.status(200).send('Redirect page')
  })

  return router
}
