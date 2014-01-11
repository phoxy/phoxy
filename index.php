<?php

if (strnatcmp(phpversion(),'5.4') < 0)
  exit("PHP 5.4 or newer is required");

if (!count($_GET))
{
  $expires = 60*60;
  header("Pragma: public");
  header("Cache-Control: maxage=".$expires);
  header('Expires: ' . gmdate('D, d M Y H:i:s', time()+$expires) . ' GMT');
  include_once('index.html');
  exit();
}

if (!function_exists("phoxy_conf"))
  include_once("config.php");
  
function phoxy_default_conf()
{
  return array(
    "ip" => $_SERVER['REMOTE_ADDR'],
    "site" => "http://".$_SERVER['HTTP_HOST']."/",
    "ejs_dir" => "ejs",
    "js_dir" => "js",
    "api_dir" => "api",
    "get_api_param" => "api",
    "js_prefix" => null,
    "ejs_prefix" => null,
    "api_prefix" => null,
    "cache_global" => "1d",
    "cache_session" => null,
    "cache_local" => null,
    );
}

$get_param = phoxy_conf()["get_api_param"];
if (isset($_GET[$get_param]))
{
  $file = $_GET[$get_param];
  if ($file == 'htaccess')
    exit('Rewrite engine work SUCCESS');
  if (strpos($file, "/") > -1)
    list($file, $func) = explode("/", $file);

  if (!isset($func) || !$func)
    $func = 'Reserve';
    
  session_start();
  
  include_once('include.php');
  
  if ($file == 'phoxy') // reserved module name
    $target_dir = realpath(dirname(__FILE__));
  else
    $target_dir = phoxy_conf()["api_dir"];
  $a = IncludeModule($target_dir, $file);
  if (is_null($a))
    exit(json_encode(array("error" => 'Undefined api handler required')));

  $get = $_GET;
  unset($get[$get_param]);
  try
  {
    echo $a->APICall($func, $get);
  } catch (phoxy_protected_call_error $e)
  {
    echo json_encode($e->result);
  }
  
}

