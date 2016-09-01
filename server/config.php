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
    "cache_global" => null,
    "cache_session" => null,
    "cache_local" => null,
    "autostart" => true,
    "api_xss_prevent" => true,
  ];
}

if (!function_exists("phoxy_conf"))
{
  function phoxy_conf()
  {
    return phoxy_default_conf();
  }
}
