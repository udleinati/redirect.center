import Router from 'express'
import vhost from 'vhost'
import config from '../config'
import { getPublicPage, allPageNotFound } from './page.callback'

const router = Router()

router.get('/', getPublicPage)
router.all('*', allPageNotFound)

export default vhost(config.fqdn, router)
