<?php

$uptime = shell_exec("cut -d. -f1 /proc/uptime");

$redis = new Redis();
$redis->connect('127.0.0.1', 6379);
$count_24h = $redis->eval('return table.getn(redis.call("keys", "24h_*"))');
$count_ever = $redis->eval('return table.getn(redis.call("keys", "ever_*"))');

?>
<!DOCTYPE html>
<!--[if lt IE 9]> <html class="lt-ie9" lang="en"> <![endif]-->
<!--[if !IE] -->
<html lang='en'>
  <!-- <![endif] -->
  <head>
    <title>REDIRECT.CENTER</title>
    <meta name="description" content="DNS Redirect, Domain redirects with CNAME, how to redirect"/>
    <meta name="author" content="Udlei Nati / udlei@nati.biz">
    <meta content='all' name='robots'>
    <meta content='text/html; charset=utf-8' http-equiv='Content-Type'>
    <meta content='width=device-width, initial-scale=1.0' name='viewport'>
    <!--[if IE]> <meta http-equiv='X-UA-Compatible' content='IE=edge,chrome=1'> <![endif]-->
    <!-- <link href='assets/images/meta_icons/favicon.ico' rel='shortcut icon' type='image/x-icon'> -->
    <!-- <link href='assets/images/meta_icons/apple-touch-icon.png' rel='apple-touch-icon-precomposed'> -->
    <!-- / required stylesheets -->
    <link href="assets/stylesheets/bootstrap/bootstrap.min.css" media="all" id="bootstrap" rel="stylesheet" type="text/css" />
    <link href="assets/stylesheets/jednotka_blue.css" media="all" id="colors" rel="stylesheet" type="text/css" />
    <!-- <link href="assets/stylesheets/demo.css" media="all" rel="stylesheet" type="text/css" /> -->
    <link href="assets/stylesheets/custom.css" media="all" rel="stylesheet" type="text/css" />
    <!--[if lt IE 9]>
      <script src="assets/javascripts/ie/html5shiv.js" type="text/javascript"></script>
      <script src="assets/javascripts/ie/respond.min.js" type="text/javascript"></script>
    <![endif]-->
  </head>
  <body class='homepage'>
    <div id='wrapper'>
      <header id='header'>
        <div class='container'>
          <nav class='navbar navbar-collapsed-sm navbar-default' id='nav' role='navigation'>
            <div class='navbar-header'>
              <button class='navbar-toggle' data-target='.navbar-header-collapse' data-toggle='collapse' type='button'>
                <span class='sr-only'>Toggle navigation</span>
                <span class='icon-bar'></span>
                <span class='icon-bar'></span>
                <span class='icon-bar'></span>
              </button>
              <a class='navbar-brand' href='index.html'>
                <h1>REDIRECT.CENTER</h1>
              </a>
            </div>
            <div class='collapse navbar-collapse navbar-header-collapse'>
              <ul class='nav navbar-nav navbar-right en'>
                <li class=''>
                  <a class='' href='#usage'>
                    <span>USAGE</span>
                  </a>
                </li>
                <li class='dropdown'>
                  <a class='dropdown-toggle' data-delay='50' data-hover='dropdown' data-toggle='dropdown' href='#cname'>
                    <span>
                      CNAME
                      <i class='fa-icon-angle-down'></i>
                    </span>
                  </a>
                  <ul class='dropdown-menu' role='menu'>
                    <li class='dropdown-submenu'>
                      <a href='#cname'>CNAME</a>
                    </li>
                    <li class='dropdown-submenu'>
                      <a href='#options'>Options</a>
                    </li>
                  </ul>
                </li>
                <li class=''>
                  <a class='' href='#arecord'>
                    <span>A RECORD</span>
                  </a>
                </li>
              </ul>
              <ul class='nav navbar-nav navbar-right pt-br'>
                <li class=''>
                  <a class='' href='#usage'>
                    <span>USO</span>
                  </a>
                </li>
                <li class='dropdown'>
                  <a class='dropdown-toggle' data-delay='50' data-hover='dropdown' data-toggle='dropdown' href='#cname'>
                    <span>
                      CNAME
                      <i class='fa-icon-angle-down'></i>
                    </span>
                  </a>
                  <ul class='dropdown-menu' role='menu'>
                    <li class='dropdown-submenu'>
                      <a href='#cname'>CNAME</a>
                    </li>
                    <li class='dropdown-submenu'>
                      <a href='#options'>Opções</a>
                    </li>
                  </ul>
                </li>
                <li class=''>
                  <a class='' href='#arecord'>
                    <span>A RECORD</span>
                  </a>
                </li>
              </ul>
              <div class="language">
                <a href="javascript:;" class="change to-en bold"><img src="assets/images/flag-en.png" alt="English" /></a>
                <a href="javascript:;" class="change to-pt-br"><img src="assets/images/flag-pt-br.png" alt="Portugu&ecirc;s" /></a>
              </div>
            </div>
          </nav>
        </div>
      </header>
      <div id='main' role='main'>
        <!-- / carousel blur -->
        <div class='hero-carousel carousel-blur flexslider'>
          <ul class='slides'>
            <li class='item'>
              <div class='container'>
                <div class='row'>
                  <div class='col-lg-12 animate en'>
                    <h1 class='big fadeInUp animated'>
                      Redirect a domain
                    </h1>
                    <p class='normal fadeInUp animated'>using only a DNS record.</p>
                  </div>
                  <div class='col-lg-12 animate pt-br'>
                    <h1 class='big fadeInUp animated'>
                      Redirecione um dom&iacute;nio
                    </h1>
                    <p class='normal fadeInUp animated'>usando apenas o DNS.</p>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
        <div id='main-content'>
          <div class='container'>
            <div class='row' id='usage'>
              <div class='col-sm-12'>
                <div class='page-header page-header-with-icon'>
                  <i class='fa-icon-info'></i>
                  <h2 class="en">
                    Usage
                  </h2>
                  <h2 class="pt-br">
                    Usage
                  </h2>
                </div>
              </div>
              <div class='col-sm-12'>
                <p class='lead lead-lg text-center en'>Point a domain to the <span class="text-primary">redirect.center</span> server and <span class="text-primary">redirect.center</span> will perform a DNS lookup and redirect the user to your specified destination. Throughout this documentation "nati.biz" will be used as a placeholder for your domain, you can visit any nati.biz example to see the redirect in action.</p>
                <p class='lead lead-lg text-center pt-br'>Aponte um dom&iacute;nio para o servidor do <span class="text-primary">redirect.center</span> e o <span class="text-primary">redirect.center</span> far&aacute; o redirecionamento do usu&aacute;rio para o destino especificado. No decorrer desta documentação o dom&iacute;nio "nati.biz" ser&aacute; usado como exemplo, voc&ecirc; pode visitar todos os exemplos para ver o redirecionamento em a&ccedil;&atilde;o.</p>
              </div>
            </div>
            <div class='row' id='cname'>
              <div class='col-sm-12'>
                <div class='page-header page-header-with-icon'>
                  <i class='fa-icon-location-arrow'></i>
                  <h2>
                    CNAME
                  </h2>
                </div>
              </div>
              <div class='col-sm-12'>
                <p class='lead lead-lg text-center'>
                  <span class="en">
                    Specify the destination domain as a subdomain of nati.biz. A 
                    simple subdomain redirect of <a href="http://google.nati.biz">google.nati.biz</a>
                    to <a href="http://google.com">google.com</a>:
                  </span>
                  <span class="pt-br">
                    Especifique o dom&iacute;nio destino como um subdom&iacute;nio de nati.biz. Um redirecionamento
                    simples de subdom&iacute;nio do <a href="http://google.nati.biz">google.nati.biz</a>
                    para <a href="http://google.com">google.com</a>:
                  </span>
                </p>
                <div class="text-center lead lead-md">
                  <span class="well well-sm"><strong class="text-danger">google.nati.biz.</strong> CNAME <span class="text-success"><strong>google.com</strong>.redirect.center.</span></span>
                </div>
              </div>
              <div class='col-sm-12' id="options">
                <div class='page-header page-header-with-icon'>
                  <h2 class="en">
                    Options
                  </h2>
                  <h2 class="pt-br">
                    Opções
                  </h2>
                </div>
                <p class='lead lead-lg text-center'>
                  <span class="en">
                    <span class="text-primary">redirect.center</span> provides options to allow
                    for the flexibility most situations will need.
                  </span>
                  <span class="pt-br">
                    <span class="text-primary">redirect.center</span> tem opções para permitir os tipos
                    mais flexíveis de situações que você precisará.
                  </span>
                </p>
                <div class="table-responsive">
                  <table class="table table-bordered table-striped">
                    <thead>
                      <tr>
                        <th class="en">
                          Option
                        </th>
                        <th class="en">
                          Description
                        </th>
                        <th class="pt-br">
                          Opções
                        </th>
                        <th class="pt-br">
                          Descrição
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="">
                        <td>
                          opts-statuscode-{code}
                        </td>
                        <td class="en">
                          HTTP Status Code to be used in the redirect. <strong>302</strong>, <a href="http://httpstatus.es">HTTP Status Code</a>
                        </td>
                        <td class="pt-br">
                          HTTP Status Code usado para o redirecionamento. <strong>302</strong>, <a href="http://httpstatus.es">HTTP Status Code<
                        </td>
                      </tr>
                      <tr class="">
                        <td>
                          opts-uri
                        </td>
                        <td class="en">
                          Append URI (if any) to the target URL
                        </td>
                        <td class="pt-br">
                          Adiciona a URI (se existir) na URL de redirecionamento.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <br /><br />
                <p class='lead lead-lg text-center margin-sm'>
                  <span class="en">
                    Options can be specified as part of a cname.<br />
                    For example to redirect <span class="text-danger">www.oldwebsite.com</span> to <span class="text-success">www.newwebsite.com</span> with 
                    a <span class="text-warning">302 status code</span>:
                  </span>
                  <span class="pt-br">
                    Opções podem ser usadas como parte do cpane.<br />
                    Por exemplo para redirecionar <span class="text-danger">www.oldwebsite.com</span> para <span class="text-success">www.newwebsite.com com</span> com
                    <span class="text-warning">status code 302</span>:
                  </span>
                </p>
                <div class="text-center lead lead-md">
                  <span class="well well-sm">
                    <strong class="text-danger">www.oldwebsite.com.</strong> CNAME <strong><span class="text-success">www.newwebsite.com.</span></strong><span class="text-warning">opts-statuscode-302</span>.redirect.center
                  </span>
                </div>
                <br /><br /><br />
                <p class='lead lead-lg text-center margin-sm'>
                  <span class="en">
                    Example to redirect with a path:
                  </span>
                  <span class="pt-br">
                    Exemplo para redirecionar com o path:
                  </span>
                </p>
                <div class="text-center lead lead-md">
                  <span class="well well-sm">
                    <strong class="text-danger">www.oldwebsite.com.</strong> CNAME <strong><span class="text-success">www.newwebsite.com.</span></strong><span class="text-warning">opts-uri</span>.redirect.center
                  </span>
                </div>
                <br /><br /><br />
                <p class='lead lead-lg text-center margin-sm'>
                  <span class="en">
                    Example to redirect for a different path:
                  </span>
                  <span class="pt-br">
                    Exemplo para redirecionar para um path diferente:
                  </span>
                </p>
                <div class="text-center lead lead-md">
                  <span class="well well-sm">
                    <strong class="text-danger">www.oldwebsite.com.</strong> CNAME <strong><span class="text-success">www.newwebsite.com.</span></strong><span class="text-warning">slash.contact</span>.redirect.center
                  </span>
                </div>
              </div>
            </div>
            <div class='row' id='arecord'>
              <div class='col-sm-12'>
                <div class='page-header page-header-with-icon'>
                  <i class='fa-icon-mail-forward'></i>
                  <h2>
                    A RECORD
                  </h2>
                </div>
              </div>
              <div class='col-sm-12'>
                <p class='lead lead-lg text-center'>
                  <span class="en">
                    A root domain (eg: nati.biz) cannot be a CNAME, a workaround for
                    this is supported:<br />
                    Point the A record for the root domain to the 
                    <span class="text-primary">redirect.center</span> server (<strong>54.84.55.102</strong>)
                    and then create a CNAME matching the root domain (using CNAME or TXT 
                    options as described above).<br />
                    For example to redirect <a href="http://nati.biz">nati.biz</a> to <a href="http://www.nati.biz">www.nati.biz</a>:
                  </span>
                  <span class="pt-br">
                    O dom&iacute;nio principal (ex: nati.biz) n&atilde;o pode ser do tipo CNAME, a alternativa
                    para suportar o redirecionamento:<br />
                    Apontar o dom&iacute;nio principal com tipo A para o IP do 
                    <span class="text-primary">redirect.center</span> (<strong>54.84.55.102</strong>) 
                    e criar uma entrada do tipo CNAME apontando para o lugar que deseja redirecionar.
                    Por exemplo para redirecionar <a href="http://nati.biz">nati.biz</a> para <a href="http://www.nati.biz">www.nati.biz</a>:
                  </span>
                </p>
                <div class="text-center lead lead-md">
                  <table>
                    <tr>
                      <td width="45%" class="text-right" style="padding-right: 20px;">A</td>
                      <td class="text-left">
                        <span class="well well-sm">
                          <span class="text-danger">nati.biz.</span> IN A <span class="text-success">54.84.55.102</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2">&nbsp;</td>
                    </tr>
                    <tr>
                      <td width="45%" class="text-right" style="padding-right: 20px;">CNAME</td>
                      <td class="text-left">
                        <span class="well well-sm">
                          <span class="text-danger">redirect.nati.biz.</span> CNAME <span class="text-success">www.nati.biz</span>.redirect.center.    
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>
            <div class='row' id='stats'>
              <div class='col-sm-12'>
                <div class='page-header page-header-with-icon'>
                  <i class='fa-icon-bar-chart'></i>
                  <h2 class="en">
                    STATS
                  </h2>
                  <h2 class="pt-br">
                    Estat&iacute;sticas
                  </h2>
                </div>
              </div>
              <div class='col-sm-12'>
                <p class='lead lead-lg margin-sm text-center'><span id="uptime">...</span></p>
                <p class="lead lead-lg margin-sm text-center">
                  <span class="en">
                    <strong>Domains using:</strong>
                    <br />
                    Last 24h: <?php echo $count_24h ?>
                    <br />
                    Ever: <?php echo $count_ever ?></span>
                  <span class="pt-br">
                    <strong>Dom&iacute;nios utilizando:</strong>
                    <br />
                    &Uacute;ltimas 24h: <?php echo $count_24h ?>
                    <br />
                    Total: <?php echo $count_ever ?></span>
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class='fade' id='scroll-to-top'>
          <i class='fa-icon-chevron-up'></i>
        </div>
      </div>
      <footer id='footer'>
        <div id='footer-main'>
          <div class='container'>
            <div class='row'>
              <div class='col-md-12 info-box'>
                <p class="en">
                  <span class="redirect-center">REDIRECT.CENTER</span> is 
                  <a href="https://github.com/unattis/redirect.center">open source</a>, code contributions, 
                  general feedback and ideas are greatly appreciated via either 
                  the <a href="https://github.com/unattis/redirect.center/issues">GitHub issues</a>, 
                  <a href="mailto:udlei@nati.biz">email</a> (udlei@nati.biz). 
                </p>
                <p class="pt-br">
                  <span class="redirect-center">REDIRECT.CENTER</span> é 
                  <a href="https://github.com/unattis/redirect.center">open source</a>, code contributions, 
                  feedback no geral de idéias s&atilde;o muito bem vindas, postar via
                  <a href="https://github.com/unattis/redirect.center/issues">GitHub issues</a>, 
                  <a href="mailto:udlei@nati.biz">email</a> (udlei@nati.biz).
                </p>
                <ul class="google-keywords list-unstyled">
                  <li>Leiten Sie von DNS, Domain-Weiterleitung, Umleitung dns cname</li>
                  <li>redirigida por dns, redireccionamiento de dominio, redirigir cname dns</li>
                  <li>Перенаправление на DNS, домен перенаправления, перенаправлять DNS CNAME</li>
                  <li>إعادة توجيه من قبل نظام أسماء النطاقات، إعادة توجيه المجال توجيه DNS CNAME</li>
                  <li>הפניה על ידי DNS, הפניה תחום, להפנות CNAME DNS</li>
                  <li>डीएनएस, डोमेन अनुप्रेषित द्वारा पुन: निर्देशित DNS CNAME अनुप्रेषित</li>
                  <li>DNS, 도메인 리디렉션으로 리디렉션의 DNS CNAME 리디렉션</li>
                  <li>DNSは、ドメインリダイレクトによってリダイレクト、DNSのCNAMEのリダイレクト</li>
                  <li>通过DNS，域名重定向重定向，重定向DNS CNAME</li>
                  <li>通過DNS，域名重定向重定向，重定向DNS CNAME</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div id='footer-copyright'>
          <div class='container'>
            <div class='row'>
              <div class='col-lg-12 clearfix'>
                <p class='copyright'>
                  Copyright
                  &copy;
                  2015 REDIRECT.CENTER
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
    <!-- / required javascripts -->
    <script src="assets/javascripts/jquery/jquery.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/jquery/jquery.mobile.custom.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/bootstrap/bootstrap.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/plugins/modernizr/modernizr.custom.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/plugins/hover_dropdown/twitter-bootstrap-hover-dropdown.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/plugins/retina/retina.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/plugins/knob/jquery.knob.js" type="text/javascript"></script>
    <script src="assets/javascripts/plugins/isotope/jquery.isotope.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/plugins/isotope/jquery.isotope.sloppy-masonry.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/plugins/validate/jquery.validate.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/plugins/flexslider/jquery.flexslider.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/plugins/countdown/countdown.js" type="text/javascript"></script>
    <script src="assets/javascripts/plugins/nivo_lightbox/nivo-lightbox.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/plugins/cycle/jquery.cycle.all.min.js" type="text/javascript"></script>
    <script src="assets/javascripts/jednotka.js" type="text/javascript"></script>
    
    <script type="text/javascript">
      function activeEn() {
        $('.change').removeClass('bold');
        $('.change.to-en').addClass('bold');
        $('.en').show();
        $('.pt-br').hide();
        location.hash = 'en';
      }
      function activePtBr() {
        $('.change').removeClass('bold');
        $('.change.to-pt-br').addClass('bold');
        $('.en').hide();
        $('.pt-br').show();
        location.hash = 'pt-br';
      }
      $(document).ready(function() {
        if(location.hash == '#en') {
          activeEn();
        } else if(location.hash == '#pt-br') {
          activePtBr();
        };
        $('.change').on('click',function() {
          if($(this).hasClass('to-en')) {
            activeEn();
          } else {
            activePtBr();
          }
        });
        doUptime();
      });
      var upSeconds=<?php echo $uptime ?>;
      function doUptime() {
        var uptimeString = "Server Uptime: ";
        var secs = parseInt(upSeconds % 60);
        var mins = parseInt(upSeconds / 60 % 60);
        var hours = parseInt(upSeconds / 3600 % 24);
        var days = parseInt(upSeconds / 86400);
        if (days > 0) {
          uptimeString += days;
          uptimeString += ((days == 1) ? " day" : " days");
        }
        if (hours > 0) {
          uptimeString += ((days > 0) ? ", " : "") + hours;
          uptimeString += ((hours == 1) ? " hour" : " hours");
        }
        if (mins > 0) {
          uptimeString += ((days > 0 || hours > 0) ? ", " : "") + mins;
          uptimeString += ((mins == 1) ? " minute" : " minutes");
        }
        if (secs > 0) {
          uptimeString += ((days > 0 || hours > 0 || mins > 0) ? ", " : "") + secs;
          uptimeString += ((secs == 1) ? " second" : " seconds");
        }
        var span_el = document.getElementById("uptime");
        var replaceWith = document.createTextNode(uptimeString);
        span_el.replaceChild(replaceWith, span_el.childNodes[0]);
        upSeconds++;
        setTimeout("doUptime()",1000);
      }
    </script>
    <script>
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

      ga('create', 'UA-51158860-1', 'redirect.center');
      ga('send', 'pageview');
    </script>
  </body>
</html>
