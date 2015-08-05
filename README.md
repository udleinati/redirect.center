redirect.center
===============
Redirecionamento de DNS sem a necessidade do cliente contratar um 
servidor de hospedagem ou um servidor de dns com este recurso.

Por exemplo, o dominio pode ser redirecionado de forma simples:
meuamigopet.com.br para www.meuamigopet.com.br
somente alterando o DNS.

O sistema será instalado no dominio http://redirect.center,
como este dominio está para liberação, temporariamente funcionando
em http://toma.ai. Substitua todas as referencias de redirect.center
para toma.ai no DNS.

===============

What do you want?

- Redirect domain.com to www.domain.com
.domain.com IN A 54.84.55.102
redirect.domain.com IN CNAME www.domain.com.redirect.center

- Redirect www.domain.com to www.otherdomain.com without uri
www.domain.com IN CNAME www.otherdomain.com.redirect.center

- Redirect www.domain.com to www.otherdomain.com with uri
www.domain.com IN CNAME www.otherdomain.com.opts-uri.redirect.center

- Redirect test.domain.com to www.otherdomain.com without querystring
test.domain.com IN CNAME www.otherdomain.com.redirect.center

- Redirect URL http://jobs.domain.com to http://www.domain.com/jobs
jobs.domain.com IN CNAME www.domain.com.opts-slash.jobs.redirect.center

- Redirect URL http://www.domain.com/test to http://test.domain.com
Its not possible