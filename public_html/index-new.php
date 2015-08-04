<?php

$uptime_visible = getenv("UPTIME_VISIBLE");
$uptime = 0;

if ($uptime_visible == "true") {
    $uptime = shell_exec("cut -d. -f1 /proc/uptime");

    if (!$uptime) {
        $uptime = shell_exec("sysctl -n kern.boottime | cut -c14-18");
    }
}

$counter_visible = getenv("COUNTER_VISIBLE");
$counter_redis_host = getenv("COUNTER_REDIS_HOST");
$counter_redis_port = getenv("COUNTER_REDIS_PORT");

if ($counter_visible == "true") {
    $redis = new Redis();
    $redis->connect($counter_redis_host, $counter_redis_port);
    $count_24h = $redis->eval('return table.getn(redis.call("keys", "24h_*"))');
    $count_ever = $redis->eval('return table.getn(redis.call("keys", "ever_*"))');
}

$site_domain = getenv("SITE_DOMAIN");
$site_name = getenv("SITE_NAME");

$test_domain_origin = getenv("TEST_DOMAIN_ORIGIN");
$test_domain_destination = getenv("TEST_DOMAIN_DESTINATION");

?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title><?php echo $site_name ?></title>
    <meta name="description" content="DNS Redirect, Domain redirects with CNAME, how to redirect"/>
    <meta name="author" content="Udlei Nati / udlei@nati.biz">
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-1.11.3.min.js"></script>
    <style>

        ul { padding-left: 0px; }
        ul.redirect-models li:first-child { margin-top: 25px; }
        ul.redirect-models li { margin-top: 75px; }

        header { padding-bottom: 10px; }
        footer { margin-top: 75px; }
        footer p { margin-top: 5px; margin-bottom: 5px; }

        header, footer { background-color: #A60808; }
        header a, header small, header span, footer p, footer a { color: #fff; }

        div#content { margin-top: 10px; }

    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1><a href="/"><?php echo $site_name ?></a> <small>Redirecione domínios usando somente o DNS</small></h1>

            <?php if ($uptime) { ?>
            <h5><span id="uptime">...</span></h5>
            <?php } ?>

            <?php if ($count_24h or $count_ever) { ?>
            <p class="domains">
                 <span class="en">Domains using - last 24h <?php echo $count_24h ?> - ever <?php echo $count_ever ?></span>
                 <span class="pt-br">Dom&iacute;nios usando - &uacute;ltimas 24h <?php echo $count_24h ?> - desde sempre <?php echo $count_ever ?></span>
            </p>
            <?php } ?>

        </div>
    </header>
    <div id="content" class="container">

        <p>
            <span class="pt-br">Para facilitar o entendimento, todas as situações possíveis são ilustradas através de exemplos, onde o domínio <code><?php echo $test_domain_origin ?></code> deve ser o domínio que será redirecionado e <code><?php echo $test_domain_destination ?></code> o domínio que receberá o acesso final.
        <p>

        <p>
            <span class="pt-br">O que você quer fazer?</span>
        </p>

        <ul class="anchor-to-redirect-models">

        </ul>

        <hr />

        <ul class="redirect-models">
            <li class="pr-br">
                <a name="redirect-model-1"></a>
                <h4>Redirecionar <code class="test_origin">http://<?php echo $test_domain_origin ?></code> para <code class="test_destination">http://www.<?php echo $test_domain_origin ?></code></h4>
                <div class="hightlight">
                <p>Configura seu DNS da seguinte forma:</p>
<pre>
Host Record: &lt;deixe-vazio&gt;  Type: A      To: 54.84.55.102
Host Record: redirect       Type: CNAME  To: www.<?php echo $test_domain_origin ?>.<?php echo $site_domain ?>
</pre>

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
</pre>
                </div>
            </li>
            <li class="pr-br">
                <a name="redirect-model-2"></a>
                <h4>Redirecionar <code class="test_origin">http://www.<?php echo $test_domain_origin ?>/&lt;qualquer-coisa&gt;</code> para <code class="test_destination">http://www.<?php echo $test_domain_destination ?></code></h4>
                <div class="hightlight">
                <p>Configura seu DNS da seguinte forma:</p>
<pre>
Host Record: www            Type: CNAME  To: www.<?php echo $test_domain_destination ?>.<?php echo $site_domain ?>
</pre>

<!--

- - Veja funcionando:

$ host www.<?php echo $test_domain_origin ?>

www.<?php echo $test_domain_origin ?> is an alias for www.<?php echo $test_domain_destination ?>.<?php echo $site_domain ?>.

$ curl -I -s http://www.<?php echo $test_domain_origin ?> | grep "HTTP\|location"
HTTP/1.1 301 Moved Permanently
location: http://www.<?php echo $test_domain_destination ?>/
-->
                </div>
            </li>
            <li class="pr-br">
                <a name="redirect-model-3"></a>
                <h4>Redirecionar <code class="test_origin">http://www.<?php echo $test_domain_origin ?>/&lt;qualquer-coisa&gt;</code> para <code class="test_destination">http://www.<?php echo $test_domain_destination ?>/&lt;mesma-coisa&gt;</code></h4>
                <div class="hightlight">
                <p>Configura seu DNS da seguinte forma:</p>

<pre>
Host Record: www            Type: CNAME  To: www.<?php echo $test_domain_destination ?>.opts-uri.<?php echo $site_domain ?>
</pre>

<span class="label label-danger">ATENÇÃO</span>
<span>
O parâmetro <code>.opts-uri.</code> é o responsável por repassar o caminhodo da URL origem para a URL destino.
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
            </li>
            <li class="pr-br">
                <a name="redirect-model-4"></a>
                <h4>Redirecionar <code class="test_origin">http://jobs.<?php echo $test_domain_origin ?></code> para <code class="test_destination">http://www.<?php echo $test_domain_origin ?>/jobs</code></h4>
                <div class="hightlight">
                <p>Configura seu DNS da seguinte forma:</p>
<pre>
Host Record: jobs           Type: CNAME  To: www.<?php echo $test_domain_destination ?>.opts-slash.jobs.<?php echo $site_domain ?>
</pre>
<span class="label label-danger">ATENÇÃO</span>
<span>
O parâmetro <code>.opts-slash.</code> é o responsável por repassar por transformar <code>.jobs</code> para <code>/jobs</code> e repassar para a URL destino.
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
            </li>
        </ul>

    </div>
    <footer>
        <div class="container">
            <!--
            <p id="about" class="title-h1">
                <a href="#about" class="pt-br title-h1">Sobre</a>
            </p>
            -->

            <p class="pt-br">
                <span class="redirect-center"><?php echo $site_name ?></span> é
                <a href="https://github.com/unattis/redirect.center">open source</a>, code contributions, 
                feedback no geral de idéias s&atilde;o muito bem vindas, postar via
                <a href="https://github.com/unattis/redirect.center/issues">GitHub issues</a>, 
                <a href="mailto:udlei@<?php echo $test_domain_origin ?>">email</a> (udlei@nati.biz).
            </p>

            <!--
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
            -->

        </div>
    </footer>

<a href="https://github.com/you"><img style="position: absolute; top: 0; right: 0; border: 0;" src="https://camo.githubusercontent.com/a6677b08c955af8400f44c6298f40e7d19cc5b2d/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f677261795f3664366436642e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_gray_6d6d6d.png"></a></body>

<script type="text/javascript">

doUptime();

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

$('ul.redirect-models li').each(function(index) {
    anchor = $(this).find("a").attr("name");
    text = $(this).find("h4").html();
    $('ul.anchor-to-redirect-models').append('<li><a href="#' + anchor + '">' + text + '</a></li>');
});

</script>
</html>
