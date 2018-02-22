<?php

function phoxy_default_conf()
{
  return
  [
    "ip" => $_SERVER['REMOTE_ADDR'],
    "site" => "http" . ["","s"][!!$_SERVER['HTTPS']] . "://".$_SERVER['HTTP_HOST'],
    "debug_api" => true,
    "is_ajax_request" => @$_SERVER['HTTP_X_LAIN'] === 'Wake up',
    "ejs_dir" => "ejs",
    "js_dir" => "js",
    "api_dir" => "api",
    "get_api_param" => "api",
    "js_prefix" => null,
    "ejs_prefix" => null,
    "api_prefix" => null,
    "cache_global" => null,
    "cache_session" => null,
    "cache_local" => null,
    "autostart" => true,
    "autoload" => true,
    "api_csrf_prevent" => true,
    "sync_cascade" => false,
    "buffered_output" => true,
    "rethrow_phoxy_exception" => false,
  ];
}

if (!function_exists("phoxy_conf"))
{
  function phoxy_conf()
  {
    return phoxy_default_conf();
  }
}
