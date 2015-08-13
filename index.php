<?php
header('Lain: Hot');
if (strnatcmp(phpversion(),'5.5') < 0)
  exit("PHP 5.5 or newer is required");

include('config.php');

function PhoxyStart()
{
  global $_SERVER;
  if (phoxy_conf()["api_xss_prevent"] && $_SERVER['HTTP_X_LAIN'] !== 'Wake up')
    die("Requiest aborted due API direct XSS warning");

  global $_GET;
  $get_param = phoxy_conf()["get_api_param"];
  $file = $_GET[$get_param];
  unset($_GET[$get_param]);

  if ($file == 'htaccess')
    exit('Rewrite engine work SUCCESS');

  try
  {
    include_once('rpc_string_parser.php');
    $parser = new \phoxy\rpc_string_parser();

    global $_phoxy_process_obj;
    $_phoxy_process_obj = $obj = $parser->GetRpcObject($file, $_GET);
    $a = $obj['obj'];

    $method = $obj['method'];
    if (is_string($method))
      $method = [$method, []];

    echo $a->APICall($method[0], $method[1]);
  } catch (phoxy_protected_call_error $e)
  {
    echo new phoxy_return_worker($e->result);
  }
}

if (phoxy_conf()['autostart'])
  PhoxyStart();
