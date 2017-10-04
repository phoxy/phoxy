<?php
$code = file_get_contents($file);
$obj = null;

if ($classname != 'phoxy')
{
  $tempns = uniqid('phoxy\fork_');

  $header = <<<END
  namespace $tempns;

  use \phoxy as phoxy;
END;

  $code = str_replace('<?php', $header, $code);
  $code = preg_replace('/ api\s*\n/', ' \\api', $code);

  eval($code);

  $classname = "\\".$tempns."\\$module";
}
