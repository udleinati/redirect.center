import express from 'express'
import vhost from 'vhost'
import config from './config'

const app = express()

app.use(vhost(config.fqdn, (req, res) => {
  res.status(200).send('Public page')
}))

app.use(vhost(`*.${config.fqdn}`, (req, res) => {
  res.status(200).send('Redirect page')
}))

app.listen(config.port, () => {
  console.log(`Example app listening on port ${config.port}!`)
})
