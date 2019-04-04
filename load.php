<?php namespace phoxy;

header('Lain: Hot');
if (strnatcmp(phpversion(),'5.5') < 0)
  exit("PHP 5.5 or newer is required");

include('server/config.php');
include('server/include.php');

if (\phoxy_conf()['autoload'])
  LoadModule('phoxy/server', 'phoxy');

if (\phoxy_conf()['autostart'])
  \phoxy::Start();
