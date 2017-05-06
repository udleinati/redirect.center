<?php

function createTLD($cache_filename, $max_tl=2) {
    $cache_folder = str_replace(basename($cache_filename), '', $cache_filename);
    $cache_folder = "./";
    if (!file_exists($cache_folder) || !is_writable($cache_folder)) {
        throw new Exception($cache_folder . ' is not writable!');
    }
    // feel free to use "fsockopen()" or "curl_init()" if "fopen wrappers" are disabled or "memory_limit" is to low
    $tlds = @file('https://publicsuffix.org/list/effective_tld_names.dat');
    if ($tlds === false) {
        throw new Exception('effective_tld_names.dat is not readable!');
    }
    $i = 0;
    // remove unnecessary lines
    foreach ($tlds as $tld) {
        $tlds[ $i ] = trim($tld);
        //     empty          comments           top level domains                   this is overboard
        if (!$tlds[ $i ] || $tld[0] == '/' || strpos($tld, '.') === false || substr_count($tld, '.') >= $max_tl) {
            unset($tlds[ $i ]);
        }
        $i++;
    }
    $tlds = array_values($tlds);
    file_put_contents($cache_filename, "<?php\n" . '$tlds = ' . str_replace(array(' ', "\n"), '', var_export($tlds, true)) . ";\n?" . ">");
    // feel free to split the file into multiple and smaller files f.e. by first char of the domain-level-name to reduce memory usage
}

createTLD('TLDs.php');

?>
