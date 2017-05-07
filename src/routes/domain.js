import Router from 'express'
import vhost from 'vhost'
import os from 'os'
import config from '../config'
import StatisticService from '../services/statistic.service'

const router = Router()

router.get('/', (req, res) => {
  new StatisticService(req).overview().then((statistics) => {
    res.render('index.ejs', {
      config: config,
      uptime: os.uptime(),
      statistics: statistics
    })
  })
})

router.get('*', (req, res) => {
  res.status(404).send('Not Found')
})

export default vhost(config.fqdn, router)
