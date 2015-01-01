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

    if (count($d) === 1)
    {
      if (isset($d[$name])) // directly return [function: data] values
        return $d[$name];
      if ($this->expect_simple_result)
        foreach ($d as $val)
          return $val;
    }

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

include_once('phoxy_return_worker.php');

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
