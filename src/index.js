import express from 'express'
import routes from './routes'
import config from './config'

const app = express()
app.set('view engine', 'ejs')

app.use(routes())

app.listen(config.port, () => {
  console.log(`Example app listening on port ${config.port}!`)
})
