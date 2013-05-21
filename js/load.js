require([
  "libs/text", // part of require js
  "//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js",
  "libs/ejs_production"
  ],
  function(until)
  {
    require([
    "//ajax.googleapis.com/ajax/libs/jqueryui/1.10.2/jquery-ui.min.js",
    "libs/jquery.form"]);
    
  }
  );

var phoxy =
{
  ApiAnswer : function ApiAnswer( answer, callback )
    {
      if (answer.reset)
        location.reload(answer.reset);
      if (answer.error)
      {
        alert(answer.error);
        return;
      }
      var source = "ejs/" + answer.design;

      if (answer.result)
        new EJS({url: source}).update(answer.result, answer.data);
      else
        $('body').append(new EJS({url: source}).render(answer.data));
      if (answer.script)
      {
        require(answer.script,
          function()
          {
          if (answer.routeline)
            window[answer.routeline](answer.data);
          if (callback)
            callback(answer.data);
          }
        );  
      }
      else
        if (callback)
          callback(answer);
    }
  ,
  SimpleApiRequest : function( url )
    {
      $(function()
      {
        $.getJSON(url, function(data) { ApiAnswer(data); });
      });
    }
}
