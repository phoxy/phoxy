<?php

error_reporting(E_ALL); ini_set('display_errors', '1');

include_once('connect.php');

if (!count($_GET))
{
  include_once('index.html');
  exit();
}
  
function conf()
{
  return array(
    "ip" => $_SERVER['REMOTE_ADDR'],
    "site" => "http://localhost/phoxy/"
    );
}

if (isset($_GET['api']))
{
  $file = $_GET['api'];
  if ($file == 'htaccess')
    exit('Rewrite engine work SUCCESS');
  if (strpos($file, "/") > -1)
    list($file, $func) = explode("/", $_GET['api']);

  if (!isset($func) || !$func)
    $func = 'Reserve';
    
  session_start();
  
  include_once('include.php');
  $a = IncludeModule('api', $file);
  $f = $func;
  echo $a->$f();
}

