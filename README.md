redirect.center
===============
Why PHP with Apache HTTPD?
Because every server has.

Why not use node.js, go, python...?
For a simple redirect? No. Any server can run with minimal effort.

How do I install?
$ cd /opt
$ git clone https://github.com/udlei/redirect.center.git
$ sudo yum install php55-pecl-redis
$ sudo yum install php55
$ sudo yum install redis
$ sudo vim /etc/httpd/conf.d/redirect.conf

<VirtualHost *:80>
    DocumentRoot /opt/redirect.center/public_html
    ServerName redirect.center

    <Directory /opt/redirect.center/public_html>
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>

<VirtualHost *:80>
    DocumentRoot /opt/redirect.center/redirect
    ServerName alias.redirect.center
    ServerAlias *.redirect.center

    <Directory /opt/redirect.center/redirect>
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>

$ sudo /etc/init.d/httpd restart
$ sudo /etc/init.d/redis restart

Environment Variables:

export SITE_NAME='REDIRECT.CENTER'
export SITE_DOMAIN='redirect.center'
export SITE_REDIRECT_IP='54.84.55.102'
export SITE_DEFAULT_LANGUAGE='en'

export TEST_DOMAIN_ORIGIN='my-domain.com'
export TEST_DOMAIN_DESTINATION='my-other-domain.com'

export UPTIME_VISIBLE='true'

export COUNTER_VISIBLE='true'
export COUNTER_REDIS_HOST=127.0.0.1
export COUNTER_REDIS_PORT=6379

export GITHUB_FORKME_VISIBLE='true'
export GITHUB_PROJECT_ADDRESS='udlei/redirect.center'
export GITHUB_PROJECT_AUTHOR_EMAIL='udlei@nati.biz'

export GOOGLE_KEYWORDS_VISIBLE='true'
export GOOGLE_ANALYTICS_CODE='UA-51158860-1'

export CREDIT_VISIBLE='true'