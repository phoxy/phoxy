<?php

class db
{
  public function __construct( $str )
  {
    $db = pg_connect($str); 
  } 
  
  public static function Query( $q, $p, $allow_one_row = false )
  {
    $res = pg_query_params($q, $p);
    $ret = array();
    while (($row = pg_fetch_assoc($res)) != false)
      array_push($ret, $row);
    if ($allow_one_row && count($ret))
      return $ret[0];
    return $ret;
  }
}


//new db("dbname=phoxy host=localhost user=postgres");
