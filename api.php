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
  throw new phoxy_protected_call_error($message);
}

class phoxy_sys_api
{
  private $obj;
  private $f;
  public function phoxy_sys_api( $obj, $force_raw = false )
  {
    $this->obj = $obj;
    $this->f = $force_raw;
  }
  
  public function __call( $name, $arguments )
  {
    $ret = $this->Call($name, $arguments);
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
    if (count($d) == 1)
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
    $reflection = new ReflectionMethod($this->obj, $name);
    return $reflection->isPublic() || $this->f;
  }
}

class phoxy_return_worker
{
  private $obj;
  
  public function __construct( $obj )
  {
    $this->obj = $obj;
  }
  
  public function __toString()
  {
    $func_list = array();
    
    foreach ($func_list as $func_name)
      $this->$func_name();
    return json_encode($this->obj);
  }
}

class api
{
  protected $addons;
  public $json;

  public function api()
  {
    $this->json = true;
  }
  
  public function APICall( $name, $arguments )
  {
    return $this->__call($name, $arguments);
  }

  public function __call( $name, $arguments )
  {
    assert($this->json !== null, "API constuctor should be called");

    $this->addons = array();
    $ret = $this->Call($name, $arguments);
    if (!is_array($ret))
      $ret = array("data" => $ret);
    $ret = array_merge($this->addons, $ret);

    $conf = phoxy_conf();
    if (isset($ret['script']))
      if (!is_array($ret['script']))
      {
        assert(is_string($ret['script']));
        $ret['script'] = array($ret['script']);
      }
    if (!is_null($conf['js_prefix']) && isset($ret['script']) && count($ret['script']))
      foreach ($ret['script'] as $key => $val)
        $this->AddPrefix($ret['script'][$key], $conf['js_prefix']);
    if (!is_null($conf['ejs_prefix']) && isset($ret['design']))
      $this->AddPrefix($ret['design'], $conf['ejs_prefix']);

    //if (!$this->json)
    //  return $ret;
    return new phoxy_return_worker($ret);
    //json_encode($ret);
  }
  private function Call( $name, $arguments )
  {
    if (!method_exists($this, $name))
      return array("error" => "Unexpected RPC call");
    $reflection = new ReflectionMethod($this, $name);
    if (!$reflection->isProtected())
      return array("error" => "Security violation");
    $ret = call_user_func_array(array($this, $name), $arguments);    
    return $ret;
  }
  private function Headers( &$ret )
  {
    if (!isset($ret['headers']))
      return;
    $h = $ret['headers'];
    unset($ret['headers']);
    if (isset($h['cache']))
      header('Expires: ' . gmdate('D, d M Y H:i:s', time()+$h['cache']) . ' GMT');
  }
  private function AddPrefix( &$where, $what )
  {
    $where = "{$what}{$where}";
  }
};
