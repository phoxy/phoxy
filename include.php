<?php

function IncludeModule( $dir, $module )
{
  $file = $dir."/".$module.".php";

  if (!file_exists($file))
    return null;

  include_once("api.php");
  include_once($file);
  return new $module;
}

function LoadModule( $dir, $module, $force_raw = false, $expect_simple_result = false )
{
  $module = IncludeModule($dir, $module);
  return new phoxy_sys_api($module, $force_raw, $expect_simple_result);
}
