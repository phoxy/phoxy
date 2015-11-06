<?php

class phoxy_return_worker
{
  public $obj;
  private $prepared;
  public $hooks = [];
  public static $add_hook_cb;
  private static $minimal_cache = [];

  public function __construct( $obj )
  {
    $this->obj = $obj;

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
      $this->hooks[$func_name] = function($me) use ($func_name)
      {
        $me->$func_name();
      };

    if (isset(self::$add_hook_cb))
        call_user_func(self::$add_hook_cb, $this);
  }

  private function Prepare()
  {
    foreach ($this->hooks as $hook)
        $hook($this);
    return $this->prepared = json_encode($this->obj, JSON_UNESCAPED_UNICODE);
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

    self::NewCache($this->obj['cache']);
    $this->obj['cache'] = $cache = self::$minimal_cache;

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
      if ($scope === 'all')
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
    $cache = $this->obj['cache'];

    if (isset($cache['no']))
    {
      if (in_array('global', $cache['no'])
          || in_array('all', $cache['no']))
        header('Cache-Control: no-cache, no-store');
    }
    else if (isset($cache['session']))
    {
      header('Cache-Control: private, max-age='.self::ParseCache($cache['session']));
    }
    else if (isset($cache['global']))
    {
      header('Cache-Control: public, max-age='.self::ParseCache($cache['global']));
    }
    // session, local, global
  }

  static private function ParseCache( $str )
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
      if ($modifyer === '')
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

  static public function NewCache( $array )
  {
    if (!is_array($array))
      return self::ProcessCache('global', $array);
    foreach ($array as $key => $value)
      self::ProcessCache($key, $value);
  }

  static private function ProcessCache( $key, $value )
  {
    if ($key === 'no')
    {
      if (is_array($value))
      {
        foreach ($value as $scope)
          self::ProcessCache('no', $scope);
        return;
      }
      if (!isset(self::$minimal_cache['no']))
        self::$minimal_cache['no'] = [];
      if (!in_array($value, self::$minimal_cache['no']))
        self::$minimal_cache['no'][] = $value;
      return;
    }

    if (is_array($value)) // assuming that user tried to overload
      return self::ProcessCache($key, end($value));
    if ($value === 'no')
    {
      if ($key === 0)
        return self::$minimal_cache = ['no' => 'all'];
      self::$minimal_cache[$key] = 'no';
      return;
    }

    $curmin = &self::$minimal_cache[$key];

    if (!isset($curmin))
     $curmin = $value;
    if (self::ParseCache($curmin) > self::ParseCache($value))
      $curmin = $value;
  }
}