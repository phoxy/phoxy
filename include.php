<?php

$_phoxy_loaded_classes = [];
function IncludeModule( $dir, $module )
{
  $module_file = str_replace('\\', '/', $module);
  $file = "{$dir}/{$module_file}.php";

  if (stripos($file, "..") !== false)
    return null;

  if (!file_exists($file))
    return null;

  global $phoxy_loading_module;
  $phoxy_loading_module = $module;

  include_once(__DIR__ . "/api.php");
  try
  {
    global $_phoxy_loaded_classes;
    if (isset($_phoxy_loaded_classes[$dir][$module]))
      return $_phoxy_loaded_classes[$dir][$module];

    if (class_exists($module))
    {
      if (defined('tempns'))
        if (!function_exists('uopz_undefine'))
          die('You need uopz pecl extension for complex class cross includes');
        else
          uopz_undefine('tempns');

      define('tempns', 'tempns_'.md5(microtime()));
      include('virtual_namespace_helper.php');

      if (!isset($_phoxy_loaded_classes[$dir]))
        $_phoxy_loaded_classes[$dir] = [];
      $_phoxy_loaded_classes[$dir][$module] = $obj;
      return $obj;
    }

    include_once($file);
    $obj = new $module;

    if (!isset($_phoxy_loaded_classes[$dir]))
      $_phoxy_loaded_classes[$dir] = [];
    $_phoxy_loaded_classes[$dir][$module] = $obj;
    return $obj;
  } catch (Exception $e)
  {
    phoxy_protected_assert(false, ["error" => "Uncaught script exception at module load"]);
  }
}

function LoadModule( $dir, $module, $force_raw = false, $expect_simple_result = true )
{
  $obj = IncludeModule($dir, $module);
  return $obj($force_raw, $expect_simple_result);
}
