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
  private $prepared;
  
  public function __construct( $obj )
  {
    $this->obj = $obj;
    $this->prepared = $this->Prepare();
  }
  
  private function Prepare()
  {
    $func_list = array("ScriptToArray", "JSPrefix", "EJSPrefix", "Cache");
    
    foreach ($func_list as $func_name)
      $this->$func_name();
    return json_encode($this->obj);
  }
  
  public function __toString()
  {
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
    foreach ($this->obj[$a] as $key => $val)
      $this->AddPrefix($this->obj[$a][$key], $conf[$b]);
  }
  
  private function JSPrefix()
  {
    $this->Prefix('script', 'js_prefix');
  }
  
  private function EJSPrefix()
  {
    $this->Prefix('design', 'ejs_prefix');
  }
  
  private function Cache()
  {
    if (!isset($this->obj['cache']))
      return;
    $cache = $this->obj['cache'];
    if (isset($cache['global']))
    {
      header('Expires: ' . gmdate('D, d M Y H:i:s', time() + $this->ParseCache($cache['global'])) . ' GMT');
    }
    // session, local, global
  }
  
  private function ParseCache( $str )
  {
    //dhms
    return 0;
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

    return new phoxy_return_worker($ret);
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
