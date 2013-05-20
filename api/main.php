<?php

class main extends api
{  
  protected function Reserve( )
  {
    global $_SESSION;
    if (isset($_SESSION['uid']))
      $uid = $_SESSION['uid'];
    else
      $uid = 0;
    $ret = array(
      "design" => "main/body.ejs",
      "headers" => array("cache" => "public, 30m"),
      "data" => array("uid" => $uid, "title" => "Default page title"),
      "script" => array("main"),
      "routeline" => "Init"
      );

    return $ret;
  }
}

