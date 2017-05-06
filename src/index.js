import express from 'express'
import middlewares from './middlewares'
import routes from './routes'
import config from './config'

const app = exports.app = express()
app.set('view engine', 'ejs')

app.use(middlewares())
app.use(routes())

const listen = exports.listen = () => {
  return app.listen(config.port, () => {
    console.log(`Example app listening on port ${config.port}!`)
  })
}

if (!module.parent) listen()
