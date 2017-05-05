import Router from 'express'
import vhost from 'vhost'
import os from 'os'
import config from '../config'
import StatisticService from '../services/statistic.service'

const router = Router()
const statisticService = new StatisticService()

router.get('/', (req, res) => {
  statisticService.overview().then((statistics) => {
    const context = {
      config: config,
      uptime: os.uptime(),
      statistics: statistics
    }

    res.render('index.ejs', context)
  })
})

router.get('*', (req, res) => {
  res.status(404).send('Not Found')
})

export default vhost(config.fqdn, router)
