<?php

function IncludeModule( $dir, $module )
{
  $file = "{$dir}/{$module}.php";

  if (stripos($file, "..") !== false)
    return null;

  if (!file_exists($file))
    return null;

  include_once(__DIR__ . "/api.php");
  try
  {
    include_once($file);
    return new $module;
  } catch (Exception $e)
  {
    phoxy_protected_assert(false, ["error" => "Uncaught script exception at module load"]);
  }
}

function LoadModule( $dir, $module, $force_raw = false, $expect_simple_result = false )
{
  $module = IncludeModule($dir, $module);
  return new phoxy_sys_api($module, $force_raw, $expect_simple_result);
}
