function LoadLoginForm( data )
{
  var opt = {
    beforeSubmit: CheckLoginForm,
    success: LoginResult,
    url: "api/login/request",
    type: "post",
    dataType: "json"
  };
  $('#login_form').ajaxForm(opt);  
}

function LoginResult( data )
{
  ApiAnswer(data);
}

function CheckLoginForm(form)
{
  return true;
}

function PrefferRegister()
{
  $('#login_form').parent().html('');
  SimpleApiRequest("api/reg");
}
