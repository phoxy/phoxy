<?php

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