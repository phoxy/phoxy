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
  private $skip_post_process;
  private $expect_simple_result;

  public function __construct( $obj, $skip_post_process = false, $expect_simple_result = true )
  {
    $this->obj = $obj;
    $this->skip_post_process = $skip_post_process;
    $this->expect_simple_result = $expect_simple_result;
  }

  public function __call( $name, $arguments )
  {
    $ret = $this->Call($name, $arguments);

    if (!$this->skip_post_process && empty($ret['data']))
      if ($this->Reflect($name)->isProtected())
        throw new phoxy_protected_call_error("Protected method executed with phoxy::Load, but no _data_ were found. Check return values of {$name}");
      else
        throw new phoxy_protected_call_error("Probably internal inconsistence inside phoxy, please bug report. Failed to detect data of {$name}");


    // raw calls do not affects restrictions
    if ($this->ShouldSkipPostProcess($name))
      return $ret;
    else
      phoxy_return_worker::NewCache($ret['cache']);

    if (!isset($ret['data']))
      return phoxy_protected_assert(empty($ret['error']), $ret);

    $d = $ret['data'];

    // Reverse public method translation
    if (is_array($d) && array_key_exists($name, $d))
      $d = $d[$name];

    if ($this->expect_simple_result
         && $this->Reflect($name)->isProtected() // all public results are simple
         && is_array($d)
         && count($d) === 1)
      return reset($d);

    return $d;
  }

  private function Call( $name, $arguments )
  {
    $this->obj->json = false;
    $result = call_user_func_array(array($this->obj, $name), $arguments);

    if (is_a($result, 'phoxy_return_worker'))
      $result = $result->obj;

    if (!$this->Reflect($name)->isPublic())
      return $result;

    return
    [
      "data" => [$name => $result]
    ];
  }

  private function Reflect($name)
  {
    return new ReflectionMethod($this->obj, $name);
  }

  private function ShouldSkipPostProcess( $name )
  {
    return $this->skip_post_process;
  }
}

include_once('phoxy_return_worker.php');

class api
{
  private $default_addons;
  protected $addons;
  public $json;

  public function __construct()
  { // Otherwise we will get php segfault

  }

  public function phoxy_api_init()
  {
    $this->json = true;

    if (!is_array($this->addons))
      $this->addons = [];

    global $phoxy_loading_module;
    $compiled = default_addons($phoxy_loading_module);

    $this->default_addons = array_merge_recursive($compiled, $this->addons);

    $this->default_addons =
      $this->override_addons_on_init($this->default_addons);
  }

  public function override_addons_on_init($addons)
  {
    return $addons;
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

    $ret = array_merge_recursive($this->addons, $ret);

    $conf = phoxy::Config();

    return new phoxy_return_worker($ret);
  }

  private function Call( $name, $arguments )
  {
    if (!method_exists($this, $name))
      return
      [
        "error" => "Unexpected RPC call (Module handler not found)",
        "description" => htmlentities($name),
      ];

    $reflection = new ReflectionMethod($this, $name);
    if (!$reflection->isProtected())
      return
      [
        "error" => "Security violation (Module handler not protected)",
        "description" => htmlentities($name),
      ];

    $ret = call_user_func_array([$this, $name], $arguments);

    return $ret;
  }

  private function AddPrefix( &$where, $what )
  {
    $where = "{$what}{$where}";
  }

  public function fork($force_raw = false, $expect_simple_result = false)
  {
    return new phoxy_sys_api($this, $force_raw, $expect_simple_result);
  }
};
