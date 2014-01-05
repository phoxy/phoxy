<?php

class phoxy extends api
{
  protected function Reserve()
  {
    $ret = phoxy_conf();
    $ret['cache']['global'] = "1d";
    $ret['cache']['local'] = "1h";
    return $ret;
  }
}
