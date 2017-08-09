const Router = require('express')
const vhost = require('vhost')
const config = require('../config')
const { getPublicPage, allPageNotFound } = require('./page.callback')

module.exports = () => {
  const router = Router()

  router.get('/', getPublicPage)
  router.all('*', allPageNotFound)
  return vhost(config.fqdn, router)
}
