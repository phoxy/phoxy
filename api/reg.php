<?php

class reg extends api
{  
  protected function Reserve( )
  {
    $form = array(
      "email" => "text",
      "pass" => "password",
      "capcha" => "text",
      "capcha_id" => "hidden",
      );
    $capcha = $this->GenCapcha();
    global $_SESSION;
    $_SESSION['capcha'][$capcha["id"]] = $capcha["val"];
    $val = array(
      "capcha_id" => $capcha['id'],
      "capcha" => $capcha["val"]
    );
    $ret = array(
      "design" => "reg/form",
      "headers" => array("cache" => "public, 30m"),
      "data" => array("form" => $form, "values" => $val),
      "script" => array("reg"),
      "routeline" => "LoadRegForm",
      "result" => "reg_place"
      );
    return $ret;
  }
  
  private function GenCapcha()
  {
    return array("id" => rand(), "val" => "aaa");
  }
  
  private function Capcha( $id, $value )
  {
    global $_SESSION;
    return $_SESSION['capcha'][$id] == $value;
  }
  
  private function SafeEmail( $e )
  {
    list($name, $domain) = explode("@", $e);
    $ret = $name[0];
    for ($i = 1; $i < strlen($name); $i++)
      $ret .= "*";
    $ret .= "@";
    $ret .= $domain[0];
    for ($i = 1; $i < strlen($domain); $i++)
      $ret .= "*";
    return $ret;
  }
  
  protected function Request( )
  {
    $id = $_POST['capcha_id'];
    $value = $_POST['capcha'];
    if (!$this->Capcha($id, $value))
      return array("error" => "Capcha not match");
    $login = IncludeModule('api', 'login');      
    $code = md5(rand());

    /*
    $row = db::Query("INSERT INTO users.request(email, pass, ip, code) VALUES ($1, $2, $3, $4) RETURNING id;",
      array($_POST["email"],
      $login->PasswordHash($_POST['pass']),
      conf()["ip"],
      $code), true);
      */
    $row = array('id' => 5);
    if (!count($row))
      return array("error" => "Failed to create account");
      
    $id = $row['id'];
    
    $url = conf()["site"]."?a=api&b=reg&c=email&m=html";
    $url .= "&id={$id}&code={$code}";
    
    return array(
      "design" => "reg/request",
      "data" => array(
        "email" => $this->SafeEmail($_POST['email']),
        "url" => $url
          )
      );
  }
  
  protected function Email( )
  {
    $id = $_GET['id'];
    $code = $_GET['code'];
    $res = db::Query("SELECT * FROM users.request WHERE id = $1 AND code = $2", array($id, $code), 1);
    if (!count($res))
      return array("error" => "Record not found");
    if ($res['mail_verified'])
      return array("error" => "Mail already verified");
    
    $uid_row = db::Query("INSERT INTO users.logins(email, pass)
      SELECT email, pass FROM users.request WHERE id = $1 AND code = $2 RETURNING id", 
      array($id, $code), 1);
    if (!count($uid_row))
      return array("error" => "Cant create user(already exsist?)");
    db::Query("DELETE FROM users.request WHERE id = $1 AND code = $2", array($id, $code));
    
    return array(
      "design" => "reg/email",
      "data" => array("status" => "Success")
        );
  }
}
