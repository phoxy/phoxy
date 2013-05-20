function LoadRegForm()
{
  var opt = {
    beforeSubmit: CheckRegForm,
    success: RegResult,
    url: "api/reg/request",
    type: "post",
    dataType: "json"
};
  $('#reg_form').ajaxForm(opt);
}

function RegResult( data )
{
  ApiAnswer(data);
}

function CheckRegForm(form)
{
  return true;
}

function PrefferLogin()
{
  $('#reg_form').parent().html('');
  SimpleApiRequest("api/login");
}
