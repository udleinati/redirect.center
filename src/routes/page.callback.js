import os from 'os'
import StatisticService from '../services/statistic.service'
import config from '../config'

/* Router callback */
const getPublicPage = (req, res) => {
  new StatisticService(req).overview().then((statistics) => {
    res.render('index.ejs', {
      config: config,
      uptime: os.uptime(),
      statistics: statistics
    })
  })
}

const allPageNotFound = (req, res) => {
  res.status(404).send('Not Found')
}

export { getPublicPage, allPageNotFound }
