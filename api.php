<?php

assert_options(ASSERT_BAIL,     true);
assert_options(ASSERT_CALLBACK, 'phoxy_assert_debug');

function phoxy_assert_debug()
{
  debug_print_backtrace();
}

class phoxy_protected_call_error extends Exception
{
  public $result;
  public function __construct( $result )
  {
    $this->result = $result;
  }
}

function phoxy_protected_assert( $cond, $message, $debug_message = null )
{
  if ($cond)
    return true;
  if (is_string($message))
    $message = ["error" => $message];
  throw new phoxy_protected_call_error($message);
}

if (!function_exists("default_addons"))
{
  function default_addons( $name )
  {
    return [];
  }
}

class phoxy_sys_api
{
  private $obj;
  private $f;
  private $expect_simple_result;

  public function phoxy_sys_api( $obj, $force_raw = false, $expect_simple_result = false )
  {
    $this->obj = $obj;
    $this->f = $force_raw;
    $this->expect_simple_result = $expect_simple_result;
  }
  
  public function __call( $name, $arguments )
  {
    $ret = $this->Call($name, $arguments);
    if (is_a($ret, 'phoxy_return_worker'))
      $ret = $ret->obj;

    if (is_array($ret) && isset($ret['data'])
        && count($ret['data']) == 1 && isset($ret['data'][$name]))
      $ret = $ret['data'][$name];

    if (!is_array($ret))
      return $ret;
    if ($this->ShouldRawReturn($name))
      return $ret;
    if (!isset($ret['data']))
    {
      if (isset($ret['error']))
        throw new phoxy_protected_call_error($ret);
      return;
    }
    $d = $ret['data'];

    if (!is_array($d))
      return $d;

    if (count($d) == 1 && $this->expect_simple_result)
      foreach ($d as $val)
        return $val;
    return $d;
  }
  private function Call( $name, $arguments )
  {
    $this->obj->json = false;
    return call_user_func_array(array($this->obj, $name), $arguments);
  }
  private function ShouldRawReturn( $name )
  {
    if ($this->f)
      return true;

    $reflection = new ReflectionMethod($this->obj, $name);
    return $reflection->isPublic();
  }
}

class phoxy_return_worker
{
  public $obj;
  private $prepared;
  
  public function __construct( $obj )
  {
    $this->obj = $obj;
  }
  
  private function Prepare()
  {
    $func_list = 
    [
      "ScriptToArray",
      "JSPrefix",
      "EJSPrefix",
      "NoCache",
      "DefaultCacheTiming",
      "Cache"
    ];
    
    foreach ($func_list as $func_name)
      $this->$func_name();
    return $this->prepared = json_encode($this->obj);
  }  
  
  public function __toString()
  {
    if (!isset($this->prepared))
      $this->Prepare();
    return $this->prepared;
  }
  
  private function ScriptToArray()
  {
    if (!isset($this->obj['script']))
      return;
    if (is_array($this->obj['script']))
      return;
    assert(is_string($this->obj['script']));
    $this->obj['script'] = array($this->obj['script']);
  }
  
  private function Prefix($a, $b) // sorry
  {
    if (!isset($this->obj[$a]) || !count($this->obj[$a]))
      return;
    $conf = phoxy_conf();
    if (is_null($conf[$b]))
      return;
    if (is_array($this->obj[$a]))
      foreach ($this->obj[$a] as $key => $val)
        $this->AddPrefix($this->obj[$a][$key], $conf[$b]);
    else
      $this->AddPrefix($this->obj[$a], $conf[$b]);
  }

  private function AddPrefix(&$a, $b)
  {
    $a = "{$b}{$a}";
  }
  
  private function JSPrefix()
  {
    $this->Prefix('script', 'js_prefix');
  }
  
  private function EJSPrefix()
  {
    $this->Prefix('design', 'ejs_prefix');
  }
  
  private function DefaultCacheTiming()
  {
    $conf = phoxy_conf();
    if (!isset($this->obj['cache']))
      $this->obj['cache'] = [];
    $cache = $this->obj['cache'];

    //var_dump($this->obj);
    if (isset($cache['no']))
      if (in_array("all", $cache['no']))
        return;

    $dictionary = ["global", "session", "local"];
    foreach ($dictionary as $scope)
      if (!isset($cache[$scope]) && !is_null($conf["cache_{$scope}"]))
        if (!isset($cache['no']) || !in_array($scope, $cache['no']))
          $this->obj['cache'][$scope] = $conf["cache_{$scope}"];
  }
  
  private function NoCache()
  {
    if (!isset($this->obj['cache']))
      $this->obj['cache'] = [];
    $cache = $this->obj['cache'];
    
    $simple_mode = in_array("no", $cache);
    if (!$simple_mode && !isset($this->obj['cache']['no']))
      return;

    if (!isset($cache['no']))
      $no = [];
    else
      $no = explode(',', $cache['no']);
    $dictionary = ["global", "session", "local"];

    foreach ($dictionary as $scope)
      if (!isset($cache[$scope]) && !in_array($scope, $no))
        $no[] = $scope;

    foreach ($no as $scope)
      if ($scope == 'all')
      {
        unset($this->obj['cache']);
        break;
      }
      else
        unset($this->obj['cache'][$scope]);

    $this->obj['cache']['no'] = $no;
  }
  
  private function Cache()
  {
    if (!isset($this->obj['cache']))
      return;
    $cache = $this->obj['cache'];
    if (isset($cache['global']))
    {
      header('Cache-Control: public, max-age='.$this->ParseCache($cache['global']));
    }
    else if (isset($cache['no']['global']))
    {
	  header('Cache-Control: no-cache');
    }
    // session, local, global
  }
  
  private function ParseCache( $str )
  {
    $str = trim($str);
    $arr = preg_split('/([0-9]+)([dhms]?)/', $str, -1, PREG_SPLIT_DELIM_CAPTURE);
    phoxy_protected_assert(count($arr) > 1, "Cache string parse error");
    
    $base = 0;
    $ret = 0;
    while (true)
    {
      $amount = $arr[$base + 1];
      $modifyer = $arr[$base + 2];
      if ($modifyer == '')
        $modifyer = 's';
      $mult = 1;
      switch ($modifyer)
      {
      case 'd':
        $mult *= 24;       
      case 'h':
        $mult *= 60;
      case 'm':
        $mult *= 60;
      case 's':
        $mult *= 1;
      }
      $ret += (int)$amount * $mult;
      $base += 3;
      if ($base + 2 >= count($arr))
        break;
    }
    return $ret;
  }
}

class api
{
  private $default_addons;
  protected $addons;
  public $json;

  public function __construct()
  {
    $this->json = true;
    
    if (!is_array($this->addons))
      $this->addons = [];

    global $phoxy_loading_module;
    $compiled = default_addons($phoxy_loading_module);

    $this->default_addons = array_merge_recursive($compiled, $this->addons);
  }
  
  public function APICall( $name, $arguments )
  {
    return $this->__call($name, $arguments);
  }

  public function __call( $name, $arguments )
  {
    assert($this->json !== null, "API constuctor should be called");

    $this->addons = $this->default_addons;
    $ret = $this->Call($name, $arguments);
    if (!is_array($ret))
    {
      $ret = [$name => $ret];
      $ret = array("data" => $ret);
    }

    $ret = array_merge($this->addons, $ret);

    $conf = phoxy_conf();

    return new phoxy_return_worker($ret);
  }
  
  private function Call( $name, $arguments )
  {
    if (!method_exists($this, $name))
      return ["error" => "Unexpected RPC call (Module handler not found)"];
    $reflection = new ReflectionMethod($this, $name);
    if (!$reflection->isProtected())
      return ["error" => "Security violation (Module handler not protected)"];
    $ret = call_user_func_array([$this, $name], $arguments);    
    return $ret;
  }

  private function AddPrefix( &$where, $what )
  {
    $where = "{$what}{$where}";
  }
};
