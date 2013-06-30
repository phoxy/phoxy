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
    }
  );

var phoxy =
{
  loaded : false,
  Load : function( )
  {
	  this.loaded = true;
	  var hash = location.hash.substring(1);
      if (hash.length)
          phoxy.SimpleApiRequest(hash);
  }
  ,
  DeferRender : function (design, result, data)
    {
		setTimeout(function() {
			phoxy.Render(design, result, data);
		}, 10);
    }
  ,
  Reset : function (url)
  {
	if (url == true || url == "true")
	  location.reload();
	var parts = url.split('#');
	if (parts[1] == undefined)
	  window.location.hash = '';
	else
	  window.location.hash = "#" + parts[1];
	location.reload(parts[0]);
  }
  ,
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
          phoxy.Reset(answer.reset);
        return;
      }
      if (answer.reset !== undefined)
        phoxy.Reset(answer.reset);      
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
      if (!this.loaded)
		  this.Load();
    }
  ,
  SimpleApiRequest : function( url )
    {
      $(function()
      {
        $.getJSON(url, function(data) { phoxy.ApiAnswer(data); });
      });
    }
  ,
  MenuCall : function( url )
  {
      $(function()
      {
        $.getJSON(url, function(data) {
			window.location.hash = url;
			phoxy.ApiAnswer(data); });
      });	  
  }
}
