<?php namespace phoxy;

class rpc_string_parser
{
  public function GetRpcObject( $str, $get )
  {
    $t = $this->GetOrganizedTokens($str);
    $args = $this->ExplodeTokensToCallee($t);
    $try = $this->GetAllCallVariations($args);

    include_once('include.php');

    if (!count($try))
      die('Error at rpc resolve: All variations were invalid. Unable to resolve');

    foreach ($try as $t)
    {
      $target_dir = ".";
      if ($t['class'] == 'phoxy') // reserved module name
      {
        $target_dir = realpath(dirname(__FILE__));
        $t["scope"] = str_replace(phoxy_conf()["api_dir"], "", $t["scope"]);
      }

      $file_location = $target_dir.$t["scope"];
      $obj = IncludeModule($file_location, $t["class"]);

      if (!is_null($obj))
        return
        [
          "original_str" => $str,
          "obj" => $obj,
          "method" => $t["method"],
        ];
    }
    exit(json_encode(["error" => 'Module not found']));
  }

  private function GetAllCallVariations($callee)
  {
    $lazy = $this->FormCallable($callee);

    // Greedy also inherit last token arguments:
    // api/main(5) become /api/main/Reserve(5)
    // not /api/main(5)/Reserve which is obnoxious

    $last = array_pop($callee);
    if (is_string($last))
    {
      $callee[] = $last;
      $callee[] = "Reserve";
    }
    else
    {
      $callee[] = $last[0];
      $callee[] = ["Reserve", $last[1]];
    }

    $greedy = $this->FormCallable($callee);

    $ret = [];

    if ($greedy)
      $ret[] = $greedy;

    if ($lazy)
      $ret[] = $lazy;

    return $ret;
  }

  private function FormCallable($callee)
  {
    $method = array_pop($callee);
    $object = array_pop($callee);

    if (!$object || !$method)
      return null;

    $scope = [];
    foreach ($callee as $token)
      if (is_array($token))
        return null; // scope cant be complex (have arguments)
      else
        $scope[] = $token;

    return
    [
      "scope" => implode('/', $scope),
      "class" => $object,
      "method" => $method,
    ];
  }

  private function ExplodeTokensToCallee($tokens)
  {
    $ret = [];

    foreach ($tokens as $token)
      $ret[] = $this->ExtractParamsFromToken($token);

    return $ret;
  }

  private function ExtractParamsFromToken($token)
  {
    $length = strlen($token);

    $pos = strpos($token, '(');
    if ($pos == false)
      return $token;

    if ($token[$length - 1] != ')')
      die("Error at rpc resolve: Complex token found. Expecting ')' at the end");

    $method = substr($token, 0, $pos);
    $pos++;
    $argstring = substr($token, $pos, $length - $pos - 1);

    $unescaped = str_replace(
      ["%28", "%29", "%3F", "%23", "%5C"],
      ["(", ")", "?", "#", "\\"], $argstring);
    $args = json_decode("[$unescaped]");

    if ($args === null && strlen($unescaped) > 0)
      die("Error at rpc resolve: Failure at params decode. Is json valid?");

    return [$method, $args];
  }

  private function GetOrganizedTokens($string)
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
      else if (strpos("()", $ch) !== false)
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
      ["("],
      [")"],
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
