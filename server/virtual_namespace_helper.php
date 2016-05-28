<?php
$code = file_get_contents($file);
$obj = null;

$tempns = uniqid('phoxy\fork_');

$code = str_replace('<?php', 'namespace '.$tempns.';', $code);
$code = preg_replace('/ api\s*\n/', '\\api', $code);

eval($code);

$classname = "\\".$tempns."\\$module";
