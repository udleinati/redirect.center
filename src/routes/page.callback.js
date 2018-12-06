const os = require('os')
const StatisticService = require('../services/statistic.service')
const config = require('../config')

/* Router callback */
exports.getPublicPage = async (req, res) => {
  const statistics = await new StatisticService(req).overview()

  return res.render('index.ejs', {
    config: config,
    uptime: os.uptime(),
    statistics: statistics
  })
}

exports.allPageNotFound = (req, res) => {
  return res.status(404).send('Not Found')
}
