import os from 'os'
import StatisticService from '../services/statistic.service'
import config from '../config'

/* Router callback */
const getPublicPage = async (req, res) => {
  const statistics = await new StatisticService(req).overview()
  return res.render('index.ejs', {
    config: config,
    uptime: os.uptime(),
    statistics: statistics
  })
}

const allPageNotFound = (req, res) => {
  return res.status(404).send('Not Found')
}

export { getPublicPage, allPageNotFound }
