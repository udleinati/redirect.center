const express = require('express')
const middlewares = require('./middlewares')
const routes = require('./routes')
const config = require('./config')

const app = exports.app = express()
app.set('view engine', 'ejs')

app.use(middlewares())
app.use(routes())

const listen = exports.listen = () => {
  return app.listen(config.port, () => {
    console.log(`App listening on port ${config.port}!`)
  })
}

if (!module.parent) listen()
