<?php

function NameParsedArray( $a, $b, $c )
{
  return array("dir" => $a, "class" => $b, "method" => $c);
}

function ParseLazy( $str )
{
  $res = explode("/", $str);
  if (end($res) == '')
    array_pop($res);
  if (count($res) <= 3)
  {
    if (count($res) == 1)
      return NameParsedArray("", $res[0], false);
    if (count($res) == 2)
      return NameParsedArray("", $res[0], $res[1]);
    return NameParsedArray($res[0], $res[1], $res[2]);
  }
  $func = array_pop($res);
  $class = array_pop($res);
  return NameParsedArray(implode("/", $res), $class, $func);
}

function ParseGreedy( $str )
{
  $res = ParseLazy($str);
  if (!$res['method'])
  {
    $res['method'] = 'Reserve';
    return $res;
  }
  return NameParsedArray(implode("/", array($res["dir"], $res["class"])), $res["method"], "Reserve");
}

function GetRpcObject( $str, $get )
{
  $greedy = ParseGreedy($str);
  $lazy = ParseLazy($str);
  
  if (!$lazy['method'])
    $lazy['method'] = 'Reserve';
  $try = array($greedy, $lazy);
    
  include_once('include.php');

  foreach ($try as $t)
  {
    if (!$t['class'] || !$t['method'])
      continue;
    
    if ($t['class'] == 'phoxy') // reserved module name
      $target_dir = realpath(dirname(__FILE__));
    else
      $target_dir = phoxy_conf()["api_dir"];
    
    $obj = IncludeModule($target_dir.'/'.$t["dir"], $t["class"]);
    if (!is_null($obj))
      return
      [
        "obj" => $obj,
        "method" => $t["method"],
        "args" => $_GET,
      ];
  }
  exit(json_encode(["error" => 'Module not found']));
}
