<?php

$uptime = shell_exec("cut -d. -f1 /proc/uptime");

?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>REDIRECT ZONE</title>
    <meta name="description" content="DNS Redirect, Domain redirects with CNAME, how to redirect"/>
    <meta name="author" content="Udlei Nati / udlei@nati.biz">
    <link href='http://fonts.googleapis.com/css?family=Open+Sans:300,400|Inconsolata:400' rel='stylesheet' type='text/css'>
    <script src="http://code.jquery.com/jquery-1.11.0.min.js"></script>
    <script type="text/javascript">

    $(document).ready(function() {

        $('.change').on('click',function() {

            $('.change').removeClass('bold');

            if($(this).hasClass('to-en')) {
                $(this).addClass('bold');
                $('.en').show();
                $('.pt-br').hide();
            } else {
                $(this).addClass('bold');
                $('.en').hide();
                $('.pt-br').show();
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
    
    <style>

body{
    color: #000;
    font-family: Georgia, 'Open Sans', sans-serif;
    margin: 0;
    padding: 0;
}

.bold { 
    font-weight: bold;
}

.container{
    margin: auto;
    width: 800px;
}

#header{
    background-color: #f6f6f6;
    height: auto;
    padding: 20px 0;
    width: 100%;
}

#header h1, 
#footer h1{
    color: #fc5a44;
    font-family: 'Inconsolata', Georgia, sans-serif;
    font-size: 50px;
    font-weight: bold;
    margin: 0;
    text-align: justify;
    text-transform: uppercase;
}

#header h1 a, 
#footer h1 a{
    color: #fc5a44;
}

#header h1 a:hover, 
#footer h1 a:hover{
    color: #FF350D;
}

#header h5{
    color: #A9A9A9;
    font-family: 'Inconsolata', Georgia, sans-serif;
    font-size: 20px;
    font-weight: bold;
    margin: 10px 0;
}

#header .language {
    color: #999999;
    font-size: 12px;
}

.pt-br { display: none;}

#intro{
    background-color: #ffe9e3;
    height: auto;
    padding: 20px 0;
    width: 100%;
}

#intro code{
    background-color: #FFF;
}

.container h1, 
.container h2, 
.container h3, 
.container h4, 
.container h5, 
.container h6{
    font-family: 'Inconsolata', Georgia, sans-serif;
    text-transform: uppercase;
}

.container h1 a, 
.container h2 a, 
.container h3 a, 
.container h4 a, 
.container h5 a, 
.container h6 a{
    color: #000;
}

.container h1 a:hover, 
.container h2 a:hover, 
.container h3 a:hover, 
.container h4 a:hover, 
.container h5 a:hover, 
.container h6 a:hover{
    color: #999;
    text-decoration: none;
}

.container p{
    font-size: 16px;
    line-height: 22px;
    margin: 0 0 0 0;
    width: 600px;
}

.container a{
    color: #025D8C;
    text-decoration: none;
}

.container a:hover{
    text-decoration: underline;
}

.container code{
    background-color: #F6F6F6;
    display: block;
    font-family: 'Inconsolata';
    line-height: 22px;
    padding: 10px;
}

.container code .code-sub{
    display: inline-block;
    font-weight: bold;
    text-transform: uppercase;
    width: 80px;
}

.container hr{
    background-color: #CDCDCD;
    border: 0;
    height: 1px;
}

#content p{
    font-size: 16px;
    line-height: 22px;
    margin: 20px 0;
    width: 600px;
}

#footer{
    background-color: #ffe9e3;
    margin-top: 40px;
    padding: 30px 0 40px 0;
    width: 100%;
}

#footer h1{
    margin-bottom: 10px;
}

.redirect-zone{
    color: #fc5a44;
}

    </style>
</head>
<body>
    <div id="header">
        <div class="container">
            <h1><a href="/">REDIRECT.ZONE</a></h1>
            <h5><span id="uptime">...</span></h5>
            <div class="language">
                <a href="javascript:;" class="change to-en bold">english</a></span> . <a href="javascript:;" class="change to-pt-br">portugu&ecirc;s</a>
            </div>
        </div>
    </div>
    <div id="intro">
        <div class="container">
            <p class="en">
                Redirect a domain using only a DNS record.
            </p>
            <p class="pt-br">
                Redirecione um dom&iacute;nio usando apenas o DNS.
            </p>
        </div>
    </div>
    <div id="content" class="container">
        <h1 id="usage">
            <a href="#usage" class="en">Usage</a>
            <a href="#usage" class="pt-br">Uso</a>
        </h1>
        <p id="overview">
            <span class="en">
            Point a domain to the <span class="redirect-zone">redirect.zone</span> server
            and <span class="redirect-zone">redirect.zone</span> will perform a DNS lookup and
            redirect the user to your specified destination. Throughout this documentation 
            "nati.biz" will be used as a placeholder for your domain, you can visit 
            any nati.biz example to see the redirect in action. 
            </span>
            <span class="pt-br">
            Aponte um dom&iacute;nio para o servidor do <span class="redirect-zone">redirect.zone</span>
            e o <span class="redirect-zone">redirect.zone</span> far&aacute; o redirecionamento
            do usu&aacute;rio para o destino especificado. No decorrer desta documentação o dom&iacute;nio 
            "nati.biz" ser&aacute; usado como exemplo, voc&ecirc; pode visitar todos os exemplos para ver o 
            redirecionamento em a&ccedil;&atilde;o.
            </span>
        </p>
        <h2 id="usage:cname"><a href="#usage:cname">CNAME</a></h2>
        <p>
            <span class="en">
            Specify the destination domain as a subdomain of nati.biz. A 
            simple subdomain redirect of <a href="http://google.nati.biz">google.nati.biz</a>
            to github.com:
            </span>
            <span class="pt-br">
            Especifique o dom&iacute;nio destino como um subdom&iacute;nio de nati.biz. Um redirecionamento
            simples de subdom&iacute;nio do <a href="http://google.nati.biz">google.nati.biz</a>
            para github.com:
            </span>
        </p>
        <code>
            github.nati.biz. CNAME github.com.redirect.zone.
        </code>
        <h2 id="usage:a"><a href="#usage:a">A Record</a></h2>
        <p>
            <span class="en">
            A root domain (eg: nati.biz) cannot be a CNAME, a workaround for
            this is supported: point the A record for the root domain to the 
            <span class="redirect-zone">redirect.zone</span> server (54.84.55.102) 
            and then create a CNAME matching the root domain (using CNAME or TXT 
            options as described above). For example to redirect 
            <a href="http://nati.biz">nati.biz</a> to 
            github.com:
            </span>
            <span class="pt-br">
            O dom&iacute;nio principal (ex: nati.biz) n&atilde;o pode ser do tipo CNAME, a alternativa
            para suportar o redirecionamento: apontar o dom&iacute;nio principal com tipo A para o IP do 
            <span class="redirect-zone">redirect.zone</span> (54.84.55.102) 
            e criar uma entrada do tipo CNAME apontando para o lugar que deseja redirecionar.
            Por exemplo para redirecionar <a href="http://nati.biz">nati.biz</a> para github.com:
            </span>
        </p>
        <code>
            <span class="code-sub">A</span> nati.biz. IN A 54.84.55.102            <br/>
            <span class="code-sub">CNAME</span> redirect.zone.nati.biz. CNAME github.com.redirect.zone.        
        </code>
    </div>
    <div id="footer">
        <div class="container">
            <h1 id="about">
                <a href="#about" class="en">About</a>
                <a href="#about" class="pt-br">Sobre</a>
            </h1>
            <p class="en">
                <span class="redirect-zone">REDIRECT.ZONE</span> is 
                <a href="https://github.com/unattis/redirect.zone">open source</a>, code contributions, 
                general feedback and ideas are greatly appreciated via either 
                the <a href="https://github.com/unattis/redirect.zone/issues">GitHub issues</a>, 
                <a href="mailto:udlei@nati.biz">email</a> (udlei@nati.biz). 
            </p>
            <p class="pt-br">
                <span class="redirect-zone">REDIRECT.ZONE</span> é 
                <a href="https://github.com/unattis/redirect.zone">open source</a>, code contributions, 
                feedback no geral de idéias s&atilde;o muito bem vindas, postar via
                <a href="https://github.com/unattis/redirect.zone/issues">GitHub issues</a>, 
                <a href="mailto:udlei@nati.biz">email</a> (udlei@nati.biz).
            </p>
        </div>
    </div>
</body>
</html>
