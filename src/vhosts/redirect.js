import vhost from 'vhost'
import config from '../config'

export default vhost(`*.${config.fqdn}`, (req, res) => {
  res.status(200).send('Redirect page')
})
