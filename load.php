<?php namespace phoxy;
header('Lain: Hot');
if (strnatcmp(phpversion(),'5.5') < 0)
  exit("PHP 5.5 or newer is required");

include('config.php');
include('include.php');

LoadModule('phoxy', 'phoxy');


if (\phoxy::Config()['autostart'])
  \phoxy::Start();
