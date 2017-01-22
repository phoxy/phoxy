<?php

class phoxy extends api
{
  // Calling api/phoxy returning server configuration for current session
  protected function Reserve()
  {
    return self::Config();
  }

  // For user phoxy configuration overload we using phoxy_conf method redefine
  public static function Config()
  {
    return phoxy_conf();
  }

  // Calling phoxy::Load immediately loading or using preloaded module object
  public static function Load($name, $force_raw_return = false)
  {
    $dir = phoxy::Config()['api_dir'];
    $names = explode('/', $name);

    $module = array_pop($names);
    $directory = $dir.'/'.implode('/', $names);

    return LoadModule($directory, $module, $force_raw_return);
  }

  // Begin default phoxy behaviour
  public static function Start()
  {
    global $_SERVER;
    if (!phoxy_conf()["is_ajax_request"] && phoxy_conf()["api_csrf_prevent"])
      die("Request aborted due API direct CSRF warning");

    if (phoxy_conf()["buffered_output"])
      ob_start();

    global $_GET;
    $get_param = phoxy::Config()["get_api_param"];
    $file = $_GET[$get_param];
    unset($_GET[$get_param]);

    if ($file === 'htaccess')
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

      $result = $a->APICall($method[0], $method[1]);
    } catch (phoxy_protected_call_error $e)
    {
      $result = new phoxy_return_worker($e->result);
    }

    $prepared = (string)$result;

    if (phoxy_conf()["buffered_output"])
    {
      $buffered_output = ob_get_contents();
      ob_end_clean();
    }

    if (phoxy_conf()["debug_api"] && !phoxy_conf()["is_ajax_request"])
    {
      echo "<h1>Result</h1>\n";
      var_dump($result->obj);
    }
    else
      header('Content-Type: application/json; charset=utf-8');

    if (!phoxy_conf()["debug_api"] || phoxy_conf()["is_ajax_request"])
      echo $prepared;
    else if (phoxy_conf()["buffered_output"])
      echo "\n<hr><h1>Log</h1>\n{$buffered_output}";
  }

  public static function SetCacheTimeout($scope, $timeout)
  {
    if (is_integer($timeout))
      return phoxy::SetCacheTimeout($scope, "{$timeout}s");

    phoxy_return_worker::NewCache([$scope => $timeout]);
  }

  public static function SetCacheTimeoutTimestamp($scope, $timeout_timestamp)
  {
    if (!is_numeric($timeout_timestamp))
    {
      $dt = new DateTime($timeout_timestamp);
      $unix_time = $dt->format('U'); // in server timezone

      $timeout_timestamp = $unix_time;
    }

    $timeout = $timeout_timestamp - time();

    if ($timeout < 0)
      $timeout = 0;

    phoxy::SetCacheTimeout($scope, $timeout);
  }
}
