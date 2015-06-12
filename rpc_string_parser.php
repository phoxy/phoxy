<?php namespace phoxy;

class rpc_string_parser
{
  public function NameParsedArray( $a, $b, $c )
  {
    return array("dir" => $a, "class" => $b, "method" => $c);
  }

  public function ParseLazy( $str )
  {
    $res = explode("/", $str);
    if (end($res) == '')
      array_pop($res);
    if (count($res) <= 3)
    {
      if (count($res) == 1)
        return $this->NameParsedArray("", $res[0], false);
      if (count($res) == 2)
        return $this->NameParsedArray("", $res[0], $res[1]);
      return $this->NameParsedArray($res[0], $res[1], $res[2]);
    }
    $func = array_pop($res);
    $class = array_pop($res);
    return $this->NameParsedArray(implode("/", $res), $class, $func);
  }

  public function ParseGreedy( $str )
  {
    $res = $this->ParseLazy($str);
    if (!$res['method'])
    {
      $res['method'] = 'Reserve';
      return $res;
    }
    return $this->NameParsedArray(implode("/", array($res["dir"], $res["class"])), $res["method"], "Reserve");
  }

  public function DecodeStrings( &$obj )
  {
    foreach ($obj as &$arg)
    {
      if (is_array($arg))
        $this->DecodeStrings($arg);
      if (is_string($arg))
      {
        $res = base64_decode($arg);
        if ($res != false)
          $arg = $res;
      }
    }
  }

  public function TryExtractParams( $str, $support_array = false)
  {
    $length = strlen($str);
    $i = -1;

    while (++$i < $length)
      if ($str[$i] == '(')
        break; // if we found arguments begin
      else if ($support_array && $str[$i] == '[')
        break; // or array begin, if it recusion
    if ($i >= $length)
      return null;

    $began = $i + 1;
    $end = strpos($str, ')');
    $args = [];

    if ($end != $began + 1)
    {
      $raw_args_str = substr($str, $began, $end - $began);
        // deprecated. backward compatibility
        $args_str = preg_replace('/\|(.)/', '$1', $raw_args_str);
      $args = json_decode("[$args_str]", true);
      if (is_null($args))
        die("JSON decode failure");
      $this->DecodeStrings($args);
    }

    if ($str[$end] != ')')
      return null;

    $ret = 
    [
      "module" => substr($str, 0, $began - 1),
      "arguments" => $args,
      "ending" => substr($str, $end),
    ];

    return $ret;
  }

  public function GetRpcObject( $str, $get )
  {
    $args = $this->TryExtractParams($str);
    if ($args != null)
    {
      $str = $args['module'];
      $get = $args['arguments'];
    }

    $greedy = $this->ParseGreedy($str);
    $lazy = $this->ParseLazy($str);
    
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
}