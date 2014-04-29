<?php

$redirect_domain = "redirect.center";

$r = dns_get_record($_SERVER['HTTP_HOST'],DNS_A + DNS_CNAME);

if ($r[0]['type'] == "A") {

	# Verifica se existe a entrada redirect.center.HTTP_HOST
	$record = "redirect.".$_SERVER['HTTP_HOST'];
	$rr = dns_get_record($record,DNS_CNAME);

	redirect($rr[0]['type'],$record,$rr[0]['target']);

}

elseif ($r[0]['type'] == "CNAME") {

	redirect($r[0]['type'],$_SERVER['HTTP_HOST'],$r[0]['target']);

}

function redirect ($type,$record,$target) {

	global $redirect_domain;

	if ($type == "CNAME") {
		
		$target = str_replace(".".$redirect_domain,"",$target);
		Header('location: http://' . $target , true, 301);

	}

	else {

		// ERRO INDICANDO QUE DEVERIA SER DO TIPO CNAME
        print "<html><head><title>error</title></head><body><pre>\n";
        print "I can't resolve record: ".$record.".\n\n";
        print "Add in your dns server this entry:\n";
        print $redirect_domain.".".$_SERVER['HTTP_HOST']." CNAME your_redirect.".$redirect_domain.".\n\n";
        print "If it is already done, may you need wait to try again.\n\n";
        print "<a href='http://".$redirect_domain."'>".$redirect_center."</a>";
        print "</pre></body></html>";	
   	}

}
?>
