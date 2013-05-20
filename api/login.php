<?php

class login extends api
{  
  protected function Reserve( )
  {
    $form = array(
      "email" => "text",
      "pass" => "password",
      );
    $ret = array(
      "design" => "login/form",
      "headers" => array("cache" => "public, 30m"),
      "data" => array("form" => $form),
      "script" => array("login"),
      "routeline" => "LoadLoginForm",
      "result" => "login_place"
      );
    return $ret;
  }
  
  protected function Request( )
  {
    $email = $_POST['email'];
    $pass = $this->PasswordHash($_POST['pass']);
    //$ret = db::Query("SELECT id FROM users.logins WHERE email=$1 AND pass=$2", array($email, $pass), true);
    $ret = array('id' => 5);
    if (!count($ret))
     return array("error" => "Login failed");
    $id = $ret['id'];
    global $_SESSION;
    $_SESSION['uid'] = $id;
    return array("reset" => true);
  }
  
  protected function Logout()
  {
    return array("error" => "TODO: Logout");
  }
  
  public function PasswordHash( $pass )
  {
    return md5($pass."dfhskfjhasdl");
  }
}
