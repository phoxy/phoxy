<?php

class phoxy_sys_api
{
  private $obj;
  public function phoxy_sys_api( $obj )
  {
    $this->obj = $obj;
  }
  
  public function __call( $name, $arguments )
  {
    $ret = $this->Call($name, $arguments);
    if (!is_array($ret))
      return $ret;

    if (!isset($ret['data']))
    {
      //var_dump($ret);
      //debug_print_backtrace();
      assert(isset($ret['data']));
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
}

class api
{
  protected $addons;
  public $json;

  public function api()
  {
    $this->json = true;
  }
  

  public function __call( $name, $arguments )
  {
    $this->addons = array();
    $ret = $this->Call($name, $arguments);
    if (!is_array($ret))
      $ret = array("data" => $ret);
    $ret = array_merge($this->addons, $ret);

    $conf = phoxy_conf();
    if (!is_null($conf['js_prefix']) && isset($ret['script']) && count($ret['script']))
      foreach ($ret['script'] as $key => $val)
        $this->AddPrefix($ret['script'][$key], $conf['js_prefix']);
    if (!is_null($conf['ejs_prefix']) && isset($ret['design']))
      $this->AddPrefix($ret['design'], $conf['ejs_prefix']);

    if (!$this->json)
      return $ret;
    return json_encode($ret);
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
    $a = $ret['headers'];
    unset($ret['headers']);
  }
  private function AddPrefix( &$where, $what )
  {
    $where = "{$what}{$where}";
  }
};
