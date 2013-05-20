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
