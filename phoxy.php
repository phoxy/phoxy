<?php

class phoxy extends api
{
  protected function Reserve()
  {
    $ret = phoxy_conf();
    return $ret;
  }
}
