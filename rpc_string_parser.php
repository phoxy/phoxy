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
    var_dump($str);
    $t = $this->GetOrganizedTokens($str);
    var_dump($t);

    $args = $this->ExplodeTokensToCallee($t);
    var_dump($args);
    exit('todo');
    return;

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

  public function ExplodeTokensToCallee($tokens)
  {
    $ret = [];

    foreach ($tokens as $token)
      $ret[] = $this->ExtractParamsFromToken($token);

    return $ret;
  }

  public function ExtractParamsFromToken($token)
  {
    $length = strlen($token);

    $pos = strpos($token, '(');
    if ($pos == false)
      return [$token, null];

    if ($token[$length - 1] != ')')
      die("Error at rpc resolve: Complex token found. Expecting ')' at the end");

    $method = substr($token, 0, $pos);
    $pos++;
    $argstring = substr($token, $pos, $length - $pos - 1);

    $args = json_decode("[$argstring]");
    return [$method, $args];
  }

  public function GetOrganizedTokens($string)
  {
    $raw_tokens = explode('/', $string);
    $ret = [];

    $lastpath = null;
    foreach ($raw_tokens as $raw_token)
    {
      $res = $this->PathFromToken($raw_token);

      if ($lastpath > 0)
      {
        $ref = &$ret[count($ret) - 1];
        $ref[0] .= '/'.$raw_token;
        $ref[1] = array_merge($ref[1], $res);
        $res = $ref[1];
      }
      else
      {
        $ret[] = [$raw_token, $res];
      }

      $symmetric_check = $this->IsSymmetric($res);

      if ($symmetric_check === false)
        die("Error at rpc resolve: Braces symmetric check failed");
      $lastpath = $symmetric_check;
    }

    $return = [];
    foreach ($ret as $token)
      $return[] = $token[0];
    return $return;
  }

  private function PathFromToken($token)
  {
    $path = [];
    $in_string = false;

    $length = strlen($token);
    for ($i = 0; $i < $length; $i++)
    {
      $ch = $token[$i];
      if ($in_string)
        if ($ch != $in_string)
          continue;
        else
          $in_string = false;
      else if ($ch == '"' || $ch == "'")
        $in_string = $ch;
      else if (strpos("()[]{}", $ch) !== false)
        $path[] = $ch;
    }

    if ($in_string)
      $path[] = $in_string;

    return $path;
  }

  private function IsSymmetric($path)
  {
    $mirroring =
    [
      ["(", "{", "["],
      [")", "}", "]"],
    ];

    $expect = [];

    foreach ($path as $ch)
    {
      $pos = array_search($ch, $mirroring[0]);
      if ($pos !== false)
      {
        $expect[] = $mirroring[1][$pos];
        continue;
      }
      if (!in_array($ch, $mirroring[1]))
        continue; // ignore for path resolve

      if (end($expect) != $ch)
        return false;
      array_pop($expect);
    }

    return count($expect);
  }
}