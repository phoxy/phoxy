<?php

function InstanceClassByName($classname, $args)
{
  $reflection = new \ReflectionClass($classname);
  $obj = $reflection->newInstanceArgs($args);
  $obj->phoxy_api_init();
  return $obj;
}

$_phoxy_loaded_classes = [];
function IncludeModule( $dir, $module )
{
  $args = [];
  if (is_array($module))
  {
    $args = $module[1];
    $module = $module[0];
  }

  if (substr($dir, 0, 2) === './')
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

    $classname = $module;
    $cross_include = class_exists($classname);


    if ($cross_include)
      include('virtual_namespace_helper.php');
    else
      include_once($file);

    phoxy_protected_assert(class_exists($classname), "Failed to locate class {$dir} {$module}");
    $obj = InstanceClassByName($classname, $args);

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
    phoxy_protected_assert(false, ["error" => "Uncaught script exception at module load", "exception" => $e]);
  }
}

function LoadModule( $dir, $module, $force_raw = false, $expect_simple_result = true )
{
  $obj = IncludeModule($dir, $module);
  phoxy_protected_assert(!is_null($obj), "Failed to load module {$dir} {$module}");
  return $obj->fork($force_raw, $expect_simple_result);
}
