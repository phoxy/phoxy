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

function TryExtractParams( $str )
{
  $length = strlen($str);
  $i = -1;

  while (++$i < $length)
    if ($str[$i] == '(')
      break;
  if ($i >= $length)
    return null;

  $ConstructParameter = function($str, $start, $end)
  {
    $param = stripslashes(substr($str, $start, $end));
    if (strlen($param) < 2)
      return $param;
    if ($param[0] != "\"" && $param[1] != "'")
      return $param;
    return substr($param, 1, strlen($param) - 2);
  };


  $began = $i + 1;

  $escape = 0;
  $mode = 0;
  $args = [];
  $argbegin = $began;
  while (++$i < $length)
  {
    $ch = $str[$i];
    if ($escape)
      $escape = 0;
    else if ($ch == "\"" || $ch == "'")
    {
      if ($mode == 1)
        $mode = 0;
      else
        $mode = 1;
    }
    else if ($ch == "\\" && $mode == 1)
      $escape = 1;
    else if ($ch == ')' && !$mode)
      break;
    else if ($ch == ',' && !$mode)
    {
      $args[] = $ConstructParameter($str, $argbegin, $i - $argbegin);
      $argbegin = $i + 1;
    }
  }
  if (@$str[$i] != ')')
    return null;

  if ($i != $argbegin)
    $args[] = $ConstructParameter($str, $argbegin, $i - $argbegin);
  $end = $i + 1;

  return
  [
    "module" => substr($str, 0, $began - 1),
    "arguments" => $args,
    "ending" => substr($str, $end),
  ];
}

function GetRpcObject( $str, $get )
{
  $args = TryExtractParams($str);
  if ($args != null)
  {
    $str = $args['module'];
    $get = $args['arguments'];
  }

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
        "original_str" => $str,
        "obj" => $obj,
        "method" => $t["method"],
        "args" => $get,
      ];
  }
  exit(json_encode(["error" => 'Module not found']));
}
