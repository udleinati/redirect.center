[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors)
[![Backers on Open Collective](https://opencollective.com/redirectcenter/backers/badge.svg)](#backers)
[![Sponsors on Open Collective](https://opencollective.com/redirectcenter/sponsors/badge.svg)](#sponsors)

# redirect.center
Redirect domains using DNS only.

### How do I install?

```sh
$ cd /opt
$ git clone https://github.com/udleinati/redirect.center.git
$ cd redirect.center
$ npm install
$ npm run start:dev:pretty
```

### Environment Variables
Look at the file ./src/config.js to configure others environment variables.
You must set at least these three variables:

```sh
export FQDN=redirect.center
export PORT=80
export ENTRY_IP=54.84.55.102
```

### How do I run in production?

```sh
$ npm run start:prod
```

### Last but not least
Create an * entry in your DNS.

```sh
*.redirect.center CNAME TO redirect.center
```

## Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
| [<img src="https://avatars0.githubusercontent.com/u/302277?v=4" width="100px;"/><br /><sub><b>Udlei Nati</b></sub>](https://github.com/udleinati)<br />[💻](https://github.com/udleinati/redirect.center/commits?author=udleinati "Code") [📖](https://github.com/udleinati/redirect.center/commits?author=udleinati "Documentation") [🤔](#ideas-udleinati "Ideas, Planning, & Feedback") [🚇](#infra-udleinati "Infrastructure (Hosting, Build-Tools, etc)") |
| :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->


## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/redirectcenter#backer)]

<a href="https://opencollective.com/redirectcenter#backers" target="_blank"><img src="https://opencollective.com/redirectcenter/backers.svg?width=890"></a>


## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/redirectcenter#sponsor)]

<a href="https://opencollective.com/redirectcenter/sponsor/0/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/1/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/2/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/3/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/4/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/5/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/6/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/7/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/8/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/9/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/9/avatar.svg"></a>


