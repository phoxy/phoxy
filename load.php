<?php
header('Lain: Hot');
if (strnatcmp(phpversion(),'5.5') < 0)
  exit("PHP 5.5 or newer is required");

include('config.php');



include('api.php');
include('phoxy.php');

if (phoxy_conf()['autostart'])
  phoxy::Start();
