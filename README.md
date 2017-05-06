# redirect.center
Redirect domains using DNS only.

### How do I install?

```sh
$ cd /opt
$ git clone https://github.com/udleinati/redirect.center.git
$ cd redirect.center
$ npm install
$ npm test
```

### Environment Variables
Look at the file ./src/config.js to configure others environment variables.
You must set at least these three variables:

```sh
export FQDN=redirect.center
export PORT=80
export PUBLIC_IP=54.84.55.102
```

### How do I run in production?

```sh
$ npm install pm2 babel-cli -g
$ pm2 start --interpreter babel-node src/index.js
```

### Last but no least
Create an * entry in your DNS.

```sh
*.redirect.center CNAME TO redirect.center
```
