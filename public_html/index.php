<?php

$uptime_visible = getenv("UPTIME_VISIBLE") ? getenv("UPTIME_VISIBLE") : 'true';

$uptime = 0;

if ($uptime_visible == "true") {

    $uptime = shell_exec("cut -d. -f1 /proc/uptime");

    if (!$uptime) {
        $uptime = shell_exec("sysctl -n kern.boottime | cut -c14-18");
    }
}

$counter_visible = getenv("COUNTER_VISIBLE") ? getenv("COUNTER_VISIBLE") : 'true';
$counter_redis_host = getenv("COUNTER_REDIS_HOST") ? getenv("COUNTER_REDIS_HOST") : '127.0.0.1';
$counter_redis_port = getenv("COUNTER_REDIS_PORT") ? getenv("COUNTER_REDIS_PORT") : '6379';

if ($counter_visible == "true") {
    $redis = new Redis();
    $redis->connect($counter_redis_host, $counter_redis_port);
    $count_24h = $redis->eval('return table.getn(redis.call("keys", "24h_*"))');
    $count_ever = $redis->eval('return table.getn(redis.call("keys", "ever_*"))');
}

$google_analytics_code = getenv("GOOGLE_ANALYTICS_CODE") ? getenv("GOOGLE_ANALYTICS_CODE") : 'UA-51158860-1' ;
$google_keywords_visible = getenv("GOOGLE_KEYWORDS_VISIBLE") ? getenv("GOOGLE_KEYWORDS_VISIBLE") : 'true';

$site_domain = getenv("SITE_DOMAIN") ? getenv("SITE_DOMAIN") : 'redirect.center';
$site_name = getenv("SITE_NAME") ? getenv("SITE_NAME") : 'REDIRECT.CENTER';
$site_redirect_ip = getenv("SITE_REDIRECT_IP") ? getenv("SITE_REDIRECT_IP") : '54.84.55.102';
$site_default_language = getenv("SITE_DEFAULT_LANGUAGE") ? getenv("SITE_DEFAULT_LANGUAGE") : 'en';

$test_domain_origin = getenv("TEST_DOMAIN_ORIGIN") ? getenv("TEST_DOMAIN_ORIGIN") : 'my-domain.com';
$test_domain_destination = getenv("TEST_DOMAIN_DESTINATION") ? getenv("TEST_DOMAIN_DESTINATION") : 'my-other-domain.com';

$github_forkme_visible = getenv("GITHUB_FORKME_VISIBLE") ? getenv("GITHUB_FORKME_VISIBLE") : 'true';
$github_project_address = getenv("GITHUB_PROJECT_ADDRESS") ? getenv("GITHUB_PROJECT_ADDRESS") : 'udlei/redirect.center';
$github_project_author_email = getenv("GITHUB_PROJECT_AUTHOR_EMAIL") ? getenv("GITHUB_PROJECT_AUTHOR_EMAIL") : 'udlei@nati.biz';

?><!DOCTYPE html>
<html lang="<?php echo $site_default_language ?>">
<head>
    <meta charset="utf-8" />
    <title><?php echo $site_name ?></title>
    <meta name="description" content="DNS Redirect, Domain redirects with CNAME, how to redirect"/>
    <meta name="author" content="Udlei Nati / udlei@nati.biz">
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-1.11.3.min.js"></script>
    <style>

        body { background-color: #F8F8F8; }

        header a, footer a { color: #fff; }
        header a:hover, footer a:hover { color: #BBD4E4 !important; }

        .margin-lg { margin: 40px 0; }
        .list-group-item .glyphicon, .panel .panel-heading .glyphicon { vertical-align: -1px; margin-right: 5px; }
        .bold { font-weight: bold; }
        .well { margin: 0; }
        
        header { padding-bottom: 10px; }
        footer { margin-top: 75px; }
        footer p { margin-top: 5px; margin-bottom: 5px; }

        header, footer { background-color: #2980b9; }
        header a, header small, header span, footer p, footer a { color: #fff; }

        div#content { margin-top: 10px; }

        footer .google-keywords { list-style-type: none; font-size: 10px; padding-left:0px; color: #ccc; margin-top: 10px; }

        .pt-br { display: none;}
        .en { display: none; }

        .<?php echo $site_default_language ?> { display: inline-block; }

    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>
                <a href="/"><?php echo $site_name ?></a>
                <small class="pt-br">Redirecione domínios usando somente o DNS</small>
                <small class="en">Redirect domains using DNS only</small>
            </h1>

            <?php if ($uptime_visible == "true") { ?>
            <p><span id="uptime">...</span></p>
            <?php } ?>

            <?php if ($counter_visible == "true") { ?>
            <p class="domains">
                 <span class="en">Domains using - Last 24h: <?php echo $count_24h ?> - Ever: <?php echo $count_ever ?></span>
                 <span class="pt-br">Dom&iacute;nios usando - &Uacute;ltimas 24h: <?php echo $count_24h ?> - Desde sempre: <?php echo $count_ever ?></span>
            </p>
            <?php } ?>

            <p class="languages">
                <span><a href="javascript:;" class="change-language to-en">English</a> - <a class="change-language to-pt-br" href="javascript:;">Português</a></span>
            </p>

        </div>
    </header>
    <div id="content" class="container">
        <br />
        <p class="lead">
            <span class="pt-br">O que você quer fazer?</span>
            <span class="en">What do you want to do?</span>
        </p>
        <div class="anchor-to-redirect-models list-group">
        </div>
        <hr class="margin-lg" />
        <div class="panel panel-default">
          <a name="redirect-model-1"></a>
          <div class="panel-heading">
            <span class="glyphicon glyphicon-console"></span>
            <strong>
              <span class="pt-br">Redirecionar <code class="test_origin">http://<?php echo $test_domain_origin ?></code> para <code class="test_destination">http://www.<?php echo $test_domain_origin ?></code></span>
              <span class="en">Redirect <code class="test_origin">http://<?php echo $test_domain_origin ?></code> to <code class="test_destination">http://www.<?php echo $test_domain_origin ?></code></span>
            </strong>
          </div>
          <div class="panel-body">
            <p>
              <span class="pt-br">Configure seu DNS da seguinte forma:</span>
              <span class="en">Configure your DNS Zone as follows:</span>
            </p>
            <div class="row">
              <div class="col-lg-9">
                <div class="en" style="width: 100%;">
                  <div class="well well-sm">
                    <div class="row">
                      <div class="col-xs-4">Host Record: <strong>&lt;leave-empty&gt;</strong></div>
                      <div class="col-xs-2">Type: <strong>A</strong></div>
                      <div class="col-xs-6">To: <strong><?php echo $site_redirect_ip ?></strong></div>
                    </div>
                    <div class="row">
                      <div class="col-xs-4">Host Record: <strong>redirect</strong></div>
                      <div class="col-xs-2">Type: <strong>CNAME</strong></div>
                      <div class="col-xs-6">To: <strong>www.<?php echo $test_domain_origin ?>.<?php echo $site_domain ?></strong></div>
                    </div>
                  </div>
                </div>
                <div class="pt-br" style="width: 100%;">
                  <div class="well well-sm">
                    <div class="row">
                      <div class="col-xs-4">Host Record: <strong>&lt;deixe-vazio&gt;</strong></div>
                      <div class="col-xs-2">Type: <strong>A</strong></div>
                      <div class="col-xs-6">To: <strong><?php echo $site_redirect_ip ?></strong></div>
                    </div>
                    <div class="row">
                      <div class="col-xs-4">Host Record: <strong>redirect</strong></div>
                      <div class="col-xs-2">Type: <strong>CNAME</strong></div>
                      <div class="col-xs-6">To: <strong>www.<?php echo $test_domain_origin ?>.<?php echo $site_domain ?></strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!--

            - - Veja funcionando:

            $ host <?php echo $test_domain_origin ?>

            <?php echo $test_domain_origin ?> has address 54.84.55.102

            $ host redirect.<?php echo $test_domain_origin ?>

            redirect.<?php echo $test_domain_origin ?> is an alias for www.<?php echo $test_domain_origin ?>.<?php echo $site_domain ?>.

            $ curl -I -s http://<?php echo $test_domain_origin ?> | grep "HTTP\|location"
            HTTP/1.1 301 Moved Permanently
            location: http://<?php echo $test_domain_origin ?>/
            -->
          </div>
        </div>
        <br />
        <div class="panel panel-default">
          <a name="redirect-model-2"></a>
          <div class="panel-heading">
            <span class="glyphicon glyphicon-console"></span>
            <strong>
              <span class="pt-br">Redirecionar <code class="test_origin">http://www.<?php echo $test_domain_origin ?>/&lt;qualquer-coisa&gt;</code> para <code class="test_destination">http://www.<?php echo $test_domain_destination ?></code></span>
              <span class="en">Redirect <code class="test_origin">http://www.<?php echo $test_domain_origin ?>/&lt;anything&gt;</code> to <code class="test_destination">http://www.<?php echo $test_domain_destination ?></code></span>
            </strong>
          </div>
          <div class="panel-body">
            <p>
              <span class="pt-br">Configure seu DNS da seguinte forma:</span>
              <span class="en">Configure your DNS Zone as follows:</span>
            </p>
            <div class="row">
              <div class="col-lg-9">
                <div class="well well-sm">
                  <div class="row">
                    <div class="col-xs-4">Host Record: <strong>www</strong></div>
                    <div class="col-xs-2">Type: <strong>CNAME</strong></div>
                    <div class="col-xs-6">To: <strong>www.<?php echo $test_domain_destination ?>.<?php echo $site_domain ?></strong></div>
                  </div>
                </div>
              </div>
            </div>

            <!--

            - - Veja funcionando:

            $ host www.<?php echo $test_domain_origin ?>

            www.<?php echo $test_domain_origin ?> is an alias for www.<?php echo $test_domain_destination ?>.<?php echo $site_domain ?>.

            $ curl -I -s http://www.<?php echo $test_domain_origin ?> | grep "HTTP\|location"
            HTTP/1.1 301 Moved Permanently
            location: http://www.<?php echo $test_domain_destination ?>/
            -->
          </div>
        </div>
        <br />
        <div class="panel panel-default">
          <a name="redirect-model-3"></a>
          <div class="panel-heading">
            <span class="glyphicon glyphicon-console"></span>
            <strong>
              <span class="pt-br">Redirecionar <code class="test_origin">http://www.<?php echo $test_domain_origin ?>/&lt;qualquer-coisa&gt;</code> para <code class="test_destination">http://www.<?php echo $test_domain_destination ?>/&lt;mesma-coisa&gt;</code></span>
              <span class="en">Redirect <code class="test_origin">http://www.<?php echo $test_domain_origin ?>/&lt;anything&gt;</code> to <code class="test_destination">http://www.<?php echo $test_domain_destination ?>/&lt;same-thing&gt;</code></span>
            </strong>
          </div>
          <div class="panel-body">
            <p>
              <span class="pt-br">Configure seu DNS da seguinte forma:</span>
              <span class="en">Configure your DNS Zone as follows:</span>
            </p>
            <div class="row">
              <div class="col-lg-9">
                <div class="well well-sm">
                  <div class="row">
                    <div class="col-xs-4">Host Record: <strong>www</strong></div>
                    <div class="col-xs-2">Type: <strong>CNAME</strong></div>
                    <div class="col-xs-6">To: <strong>www.<?php echo $test_domain_destination ?>.opts-uri.<?php echo $site_domain ?></strong></div>
                  </div>
                </div>
              </div>
            </div>
            <br />
            <span class="label label-danger pt-br">ATENÇÃO</span>
            <span class="label label-danger en">ATTENTION</span>

            <span class="pt-br">
                O parâmetro <code>.opts-uri.</code> é o responsável por repassar o caminhodo da URL origem para a URL destino.
            </span>
            <span class="en">
                The <code>.opts-uri.</code> parameter is responsible for passing the path of the source URL to the destination URL.
            </span>

            <!--
            - - Veja funcionando:

            $ host www.<?php echo $test_domain_origin ?>

            www.<?php echo $test_domain_origin ?> is an alias for www.<?php echo $test_domain_destination ?>.opts-uri.<?php echo $site_domain ?>.

            $ curl -I -s http://www.<?php echo $test_domain_origin ?>/testxyz | grep "HTTP\|location"
            HTTP/1.1 301 Moved Permanently
            location: http://www.<?php echo $test_domain_destination ?>/testxyz
            -->
          </div>
        </div>
        <br />
        <div class="panel panel-default">
          <a name="redirect-model-4"></a>
          <div class="panel-heading">
            <span class="glyphicon glyphicon-console"></span>
            <strong>
              <span class="pt-br">Redirecionar <code class="test_origin">http://jobs.<?php echo $test_domain_origin ?></code> para <code class="test_destination">http://www.<?php echo $test_domain_origin ?>/jobs</code></span>
              <span class="en">Redirect <code class="test_origin">http://jobs.<?php echo $test_domain_origin ?></code> to <code class="test_destination">http://www.<?php echo $test_domain_origin ?>/jobs</code></span>
            </strong>
          </div>
          <div class="panel-body">
            <p>
              <span class="pt-br">Configure seu DNS da seguinte forma:</span>
              <span class="en">Configure your DNS Zone as follows:</span>
            </p>
            <div class="row">
              <div class="col-lg-10">
                <div class="well well-sm">
                  <div class="row">
                    <div class="col-xs-3">Host Record: <strong>jobs</strong></div>
                    <div class="col-xs-2">Type: <strong>CNAME</strong></div>
                    <div class="col-xs-7">To: <strong>www.<?php echo $test_domain_destination ?>.opts-slash.jobs.<?php echo $site_domain ?></strong></div>
                  </div>
                </div>
              </div>
            </div>
            <br />
            <span class="label label-danger pt-br">ATENÇÃO</span>
            <span class="label label-danger en">ATTENTION</span>
            <span class="pt-br">
                O parâmetro <code>.opts-slash.</code> é o responsável por transformar <code>.jobs</code> para <code>/jobs</code> e repassar para a URL destino.
            </span>
            <span class="en">
                The <code>.opts-slash.</code> parameter is responsible to tuning <code>.jobs</code> to <code>/jobs</code> and pass on to the destination URL.
            </span>

            <!--
            - - Veja funcionando:

            $ host jobs.<?php echo $test_domain_origin ?>

            jobs.<?php echo $test_domain_origin ?> is an alias for www.<?php echo $test_domain_destination ?>.opts-slash.jobs.<?php echo $site_domain ?>.

            $ curl -I -s http://jobs.<?php echo $test_domain_origin ?> | grep "HTTP\|location"
            HTTP/1.1 301 Moved Permanently
            location: http://www.<?php echo $test_domain_destination ?>/jobs
            -->
          </div>
        </div>
    </div>
    <footer>
        <div class="container">
            <p class="pt-br">
                <span><?php echo $site_name ?></span> é
                <a href="https://github.com/<?php echo $github_project_address ?>">open source</a>, code contributions,
                feedback no geral de idéias s&atilde;o muito bem vindas, postar via
                <a href="https://github.com/<?php echo $github_project_address ?>/issues">GitHub issues</a>,
                <a href="mailto:<?php echo $github_project_author_email ?>">email</a> (<?php echo $github_project_author_email ?>).
            </p>
            <p class="en">
                <span><?php echo $site_name ?></span> is
                <a href="https://github.com/<?php echo $github_project_address ?>">open source</a>, code contributions,
                general feedback and ideas are greatly appreciated via either
                the <a href="https://github.com/<?php echo $github_project_address ?>/issues">GitHub issues</a>,
                <a href="mailto:<?php echo $github_project_author_email ?>">email</a> (<?php echo $github_project_author_email ?>).
            </p>
            <?php if ($google_keywords_visible == 'true') { ?>
            <ul class="google-keywords">
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
            <?php } ?>

        </div>
    </footer>

<?php if ($github_forkme_visible == "true") { ?>
<a href="https://github.com/<?php echo $github_project_address ?>"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://camo.githubusercontent.com/a6677b08c955af8400f44c6298f40e7d19cc5b2d/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f677261795f3664366436642e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_gray_6d6d6d.png"></a></body>
<?php } ?>

<script type="text/javascript">
function activeEn() {
  $('.change-language').removeClass('bold');
  $('.change-language.to-en').addClass('bold');
  $('.en').show();
  $('.pt-br').hide();
  location.hash = 'en';
}
function activePtBr() {
  $('.change-language').removeClass('bold');
  $('.change-language.to-pt-br').addClass('bold');
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
  $('.change-language').on('click',function() {
    if($(this).hasClass('to-en')) {
      activeEn();
    } else {
      activePtBr();
    }
  });
});

<?php if ($uptime_visible == 'true') { ?>

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

doUptime();

<?php } ?>

$('.panel').each(function(index) {
    anchor = $(this).find("a").attr("name");
    text = $(this).find(".panel-heading strong").html();
    $('.anchor-to-redirect-models').append('<a href="#' + anchor + '" class="list-group-item"><span class="glyphicon glyphicon-share-alt"></span>' + text + '</a>');
});

</script>

<?php if ($google_analytics_code) { ?>
<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', '<?php echo $google_analytics_code ?>', '<?php echo $site_domain ?>');
  ga('send', 'pageview');
</script>
<?php } ?>

</html>
