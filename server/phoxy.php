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

    return LoadModule($directory, $module, $raw_include);
  }

  // Begin default phoxy behaviour
  public static function Start()
  {
    global $_SERVER;
    if (phoxy_conf()["api_xss_prevent"] && $_SERVER['HTTP_X_LAIN'] !== 'Wake up')
      die("Request aborted due API direct XSS warning");

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

      echo $a->APICall($method[0], $method[1]);
    } catch (phoxy_protected_call_error $e)
    {
      echo new phoxy_return_worker($e->result);
    }
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
