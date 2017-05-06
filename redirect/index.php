<?php

$counter_visible = getenv("COUNTER_VISIBLE") ? getenv("COUNTER_VISIBLE") : 'true';
$counter_redis_host = getenv("COUNTER_REDIS_HOST") ? getenv("COUNTER_REDIS_HOST") : '127.0.0.1';
$counter_redis_port = getenv("COUNTER_REDIS_PORT") ? getenv("COUNTER_REDIS_PORT") : '6379';

$redirect_domain = getenv("SITE_DOMAIN") ? getenv("SITE_DOMAIN") : 'redirect.center';
$GLOBALS['redirect_domain'] = $redirect_domain;

$r = dns_get_record($_SERVER['HTTP_HOST'],DNS_A + DNS_CNAME);
$found = $r[0];

foreach ($r as $x) {

    if (strtolower($x['host']) == strtolower($_SERVER['HTTP_HOST'])) {
        $found = $x;
    }

}

if ($found['type'] == "A") {

	# Verifica se existe a entrada redirect.center.HTTP_HOST
	$record = "redirect.".$_SERVER['HTTP_HOST'];
	$rr = dns_get_record($record,DNS_CNAME);

	redirect($rr[0]['type'],$record,$rr[0]['target']);

}

elseif ($found['type'] == "CNAME") {

	redirect($found['type'],$_SERVER['HTTP_HOST'],$found['target']);

}

function redirect ($type,$record,$target) {
    global $counter_visible, $counter_redis_host, $counter_redis_port;
    $record = strtolower($record);
    $target = strtolower($target);

	if ($type == "CNAME") {

        $code = 301;
        $protocol = "http";

        $target = str_replace(".".$GLOBALS['redirect_domain'],"",$target);

        # Verifica redirecionamento por URI
        if (strstr($target,".opts-uri")) {
            $target = str_replace(".opts-uri","",$target);
            $target .= $_SERVER['REQUEST_URI'];
        }

        # Verifica redirecionamento por HTTPS
        if (strstr($target,".opts-https")) {
            $target = str_replace(".opts-https","",$target);
            $protocol = "https";
        }

        # Redirect to specific path when there are slashes
        $target = str_replace(".slash.","/",$target);
        $target = str_replace(".opts-slash.","/",$target);

        # Muda codigo de redirect
        if (strstr($target,".opts-statuscode-")) {
            $code = strstr($target,".opts-statuscode-");
            $code = str_replace(".opts-statuscode-","",$code);
            $target = str_replace(".opts-statuscode-".$code,"",$target);
            $code = filter_var($code, FILTER_SANITIZE_NUMBER_INT);
        }

        if ($counter_visible == "true") {
            $redis = new Redis();
            $redis->connect($counter_redis_host, $counter_redis_port);
            $redis->set('ever_hosts_'.strtolower($_SERVER['HTTP_HOST']), '1');
            $redis->setex('24h_hosts_'.strtolower($_SERVER['HTTP_HOST']), 86400, '1');
            $redis->set('ever_domains_'.strtolower(getDomain($_SERVER['HTTP_HOST'])), '1');
            $redis->setex('24h_domains_'.strtolower(getDomain($_SERVER['HTTP_HOST'])), 86400, '1');
        }

        Header('location: '.$protocol.'://'.$target,true,$code);
        return;

	}

	// ERRO INDICANDO QUE DEVERIA SER DO TIPO CNAME
    print "<html><head><title>error</title></head><body><pre>\n";
    print "I can't resolve record: ".$record.".\n\n";
    print "Add in your dns server this entry:\n";
    print "redirect.".$_SERVER['HTTP_HOST']." CNAME your_redirect.".$GLOBALS['redirect_domain'].".\n\n";
    print "If it is already done, may you need wait to try again.\n\n";
    print "<a href='http://".$GLOBALS['redirect_domain']."'>".$GLOBALS['redirect_domain']."</a>";
    print "</pre></body></html>";

}

// http://stackoverflow.com/questions/2679618/get-domain-name-not-subdomain-in-php
function getDomain($dom='', $fast=false) {
    // general
    $dom = !$dom ? $_SERVER['SERVER_NAME'] : $dom;
    // for parse_url()                  ftp://           http://          https://
    $dom = !isset($dom[5]) || ($dom[3] != ':' && $dom[4] != ':' && $dom[5] != ':') ? 'http://' . $dom : $dom;
    // remove "/path/file.html", "/:80", etc.
    $dom = parse_url($dom, PHP_URL_HOST);
    // replace absolute domain name by relative (http://www.dns-sd.org/TrailingDotsInDomainNames.html)
    $dom = trim($dom, '.');
    // for fast check
    $dom = $fast ? str_replace(array('www.', 'ww.'), '', $dom) : $dom;
    // separate domain level
    $lvl = explode('.', $dom);// 0 => www, 1 => example, 2 => co, 3 => uk
    // fast check
    if ($fast) {
        if (!isset($lvl[2])) {
            return isset($lvl[1]) ? $dom : false;
        }
    }

    krsort($lvl);// 3 => uk, 2 => co, 1 => example, 0 => www
    $lvl = array_values($lvl);// 0 => uk, 1 => co, 2 => example, 3 => www
    $_1st = $lvl[0];
    $_2nd = isset($lvl[1]) ? $lvl[1] . '.' . $_1st : false;
    $_3rd = isset($lvl[2]) ? $lvl[2] . '.' . $_2nd : false;
    $_4th = isset($lvl[3]) ? $lvl[3] . '.' . $_3rd : false;
    // tld check
    require('../libs/TLDs.php'); // includes "$tlds"-Array or feel free to use this instead of the cache version:
    //$tlds = array('co.uk', 'co.jp');
    $tlds = array_flip($tlds);// needed for isset()
    // fourth level is TLD
    if ($_4th && !isset($tlds[ '!' . $_4th ]) && (isset($tlds[ $_4th ]) || isset($tlds[ '*.' . $_3rd ]))) {
        $dom = isset($lvl[4]) ? $lvl[4] . '.' . $_4th : false;
    }
    // third level is TLD
    else if ($_3rd && !isset($tlds[ '!' . $_3rd ]) && (isset($tlds[ $_3rd ]) || isset($tlds[ '*.' . $_2nd ]))) {
        $dom = $_4th;
    }
    // second level is TLD
    else if (!isset($tlds[ '!' . $_2nd ]) && (isset($tlds[ $_2nd ]) || isset($tlds[ '*.' . $_1st ]))) {
        $dom = $_3rd;
    }
    // first level is TLD
    else {
        $dom = $_2nd;
    }
    return $dom ? $dom : false;
}

?>
