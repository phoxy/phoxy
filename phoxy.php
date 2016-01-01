<?php

class phoxy extends api
{
  protected function Reserve()
  {
    $ret = phoxy_conf();
    return $ret;
  }

  public static __callStatic($name, $arguments)
  {
    $dir = phoxy_conf()['api_dir'];
    $names = explode('/', $name);

    $module = array_pop($names);
    $directory = $dir.'/'.implode('/', $names);

    return LoadModule($directory, $module);
  }
}
