<?php

function IncludeModule( $dir, $module )
{
  $file = $dir."/".$module.".php";

  if (!file_exists($file))
    return null;

  include_once($dir.".php");
  include_once($file);
  return new $module;
}

function LoadModule( $dir, $module, $force_raw = false )
{
  $module = IncludeModule($dir, $module);
  return new phoxy_sys_api($module, $force_raw);
}
