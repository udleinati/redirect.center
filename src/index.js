import express from 'express'
import vhosts from './vhosts'
import config from './config'

const app = express()
app.set('view engine', 'ejs')

app.use(vhosts())

app.listen(config.port, () => {
  console.log(`Example app listening on port ${config.port}!`)
})
