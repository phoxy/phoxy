<?php

if (strnatcmp(phpversion(),'5.4') < 0)
  exit("PHP 5.4 or newer is required");

if (!count($_GET))
{
  include_once('index.html');
  exit();
}

if (!function_exists("phoxy_conf"))
  include_once("config.php");
  
function phoxy_default_conf()
{
  return array(
    "ip" => $_SERVER['REMOTE_ADDR'],
    "site" => "http://localhost/phoxy/",
    "ejs_dir" => "ejs",
    "js_dir" => "js",
    "api_dir" => "api",
    "get_api_param" => "api",
    "js_prefix" => null,
    "ejs_prefix" => null,
    "api_prefix" => null,
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
  $a = IncludeModule(phoxy_conf()["api_dir"], $file);
  if (is_null($a))
    exit('Undefined api handler required');
  $f = $func;
  echo $a->$f();
}

