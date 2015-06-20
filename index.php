<?php
header('Lain: Hot');
if (strnatcmp(phpversion(),'5.5') < 0)
  exit("PHP 5.5 or newer is required");

if (!count($_GET))
{
  $expires = 60*60;
  header("Pragma: public");
  header("Cache-Control: maxage=".$expires);
  header('Expires: ' . gmdate('D, d M Y H:i:s', time()+$expires) . ' GMT');
  include_once('index.html');
  exit();
}

include('config.php');

function PhoxyStart()
{
  $get_param = phoxy_conf()["get_api_param"];

  global $_GET;
  if (isset($_GET[$get_param]))
  {
    $file = $_GET[$get_param];
    unset($_GET[$get_param]);
    if ($file == 'htaccess')
      exit('Rewrite engine work SUCCESS');
      
    include_once('rpc_string_parser.php');
    $parser = new \phoxy\rpc_string_parser();

    global $_phoxy_process_obj;
    $_phoxy_process_obj = $obj = $parser->GetRpcObject($file, $_GET);
    $a = $obj['obj'];

    $method = $obj['method'];
    if (is_string($method))
      $method = [$method, []];

    try
    {
      echo $a->APICall($method[0], $method[1]);
    } catch (phoxy_protected_call_error $e)
    {
      echo new phoxy_return_worker($e->result);
    }
    
  }
}

if (phoxy_conf()['autostart'])
  PhoxyStart();
