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
      $('script[phoxy]').each(function()
      {
        phoxy.SimpleApiRequest($(this).attr("phoxy"));
      });
      var hash = location.hash.substring(1);
      if (hash.length)
        setTimeout(function()
        {
          phoxy.SimpleApiRequest(hash);
        }, 1000);
    }
  );

var phoxy =
{
  Render : function (design, result, data)
    {
      var source = design;

      if (data === undefined)
        data = new Array();

      if (result)
        new EJS({url: source}).update(result, data);
      else
        $('body').append(new EJS({url: source}).render(data));
    }
  ,
  ApiAnswer : function( answer, callback )
    {
      if (answer.hash !== undefined)
      {
        if (answer.hash === null)
          answer.hash = "";
        location.hash = answer.hash;
      }      
      if (answer.error)
      {
        alert(answer.error);
        if (answer.reset !== undefined)
          location.reload(answer.reset);
        return;
      }
      if (answer.reset !== undefined)
        location.reload(answer.reset);      
      if (answer.script)
      {
        require(answer.script,
          function()
          {
            phoxy.Render("ejs/" + answer.design, answer.result, answer.data);
            if (answer.routeline)
              window[answer.routeline](answer.data);
            if (callback)
              callback(answer.data);
          }
        );  
      }
      else
      {
        phoxy.Render("ejs/" + answer.design, answer.result, answer.data);
        if (callback)
          callback(answer);
      }
    }
  ,
  SimpleApiRequest : function( url )
    {
      $(function()
      {
        $.getJSON(url, function(data) { phoxy.ApiAnswer(data); });
      });
    }
  
}
