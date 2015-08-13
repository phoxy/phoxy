<?php

$_phoxy_loaded_classes = [];
function IncludeModule( $dir, $module )
{
  $args = [];
  if (is_array($module))
  {
    $args = $module[1];
    $module = $module[0];
  }

  if (substr($dir, 0, 2) == './')
    $dir = substr($dir, 2);

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

    if (!class_exists($module))
      die('Class include failed. File do not carrying that');

    $reflection = new ReflectionClass($module);
    $obj = $reflection->newInstanceArgs($args);
    $obj->phoxy_api_init();

    if (!isset($_phoxy_loaded_classes[$dir]))
      $_phoxy_loaded_classes[$dir] = [];
    $_phoxy_loaded_classes[$dir][$module] = $obj;
    return $obj;
  }
  catch (phoxy_protected_call_error $e)
  {
    throw $e;
  }
  catch (Exception $e)
  {
    phoxy_protected_assert(false, ["error" => "Uncaught script exception at module load"]);
  }
}

function LoadModule( $dir, $module, $force_raw = false, $expect_simple_result = true )
{
  $obj = IncludeModule($dir, $module);
  return $obj($force_raw, $expect_simple_result);
}
