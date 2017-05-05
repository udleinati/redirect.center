import Router from 'express'
import vhost from 'vhost'
import os from 'os'
import config from '../config'

const router = Router()

router.get('/', (req, res) => {
  const context = {
    config: config,
    uptime: os.uptime()
  }
  res.render('index.ejs', context)
})

router.get('*', (req, res) => {
  res.status(404).send('Not Found')
})

export default vhost(config.fqdn, router)
