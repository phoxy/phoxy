<?php
$code = file_get_contents($file);
$obj = null;

$tempns = 'tempns_'.md5(microtime());
//$new_source = preg_replace("/class(\s+)({$module})/", "class /".tempns."/$module", $code);
$code = str_replace('<?php', 'namespace '.$tempns.';', $code);
$code = preg_replace('/ api\s*\n/', '\\api', $code);

eval($code);

$classname = "\\".$tempns."\\$module";
$reflection = new ReflectionClass($classname);
$obj = $reflection->newInstanceArgs($args);