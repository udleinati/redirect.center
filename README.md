[![Codacy Badge](https://api.codacy.com/project/badge/Grade/abc13f71309e44cab6779b079ca2e5e0)](https://www.codacy.com/app/udlei/redirect.center?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=udleinati/redirect.center&amp;utm_campaign=Badge_Grade) [![Codacy Badge](https://api.codacy.com/project/badge/Coverage/abc13f71309e44cab6779b079ca2e5e0)](https://www.codacy.com/app/udlei/redirect.center?utm_source=github.com&utm_medium=referral&utm_content=udleinati/redirect.center&utm_campaign=Badge_Coverage) [![CircleCI](https://circleci.com/gh/udleinati/redirect.center.svg?style=svg)](https://circleci.com/gh/udleinati/redirect.center)

# redirect.center

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/abc13f71309e44cab6779b079ca2e5e0)](https://www.codacy.com/app/udlei/redirect.center?utm_source=github.com&utm_medium=referral&utm_content=udleinati/redirect.center&utm_campaign=badger)

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
