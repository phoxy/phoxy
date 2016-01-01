<?php

function phoxy_default_conf()
{
  return
  [
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
    "autostart" => true,
    "api_xss_prevent" => true,
    "cache" => ["session" => "1h"]
  ];
}

if (!function_exists("phoxy_conf"))
{
  function phoxy_conf()
  {
    return phoxy_default_conf();
  }
}