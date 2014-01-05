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

      $.getJSON("api/phoxy", function(data)
      {
        phoxy.config = data;
        requirejs.config({baseUrl: phoxy.Config()['js_dir']});

        $('script[phoxy]').each(function()
        {
          phoxy.SimpleApiRequest($(this).attr("phoxy"));
        });      
      });
    }
  );
  
function PhoxyHashChangeCallback()
{
  if (phoxy.ChangeHash(location.hash))
    phoxy.SimpleApiRequest(phoxy.hash);
}

var phoxy =
{
  loaded : false,
  hash : false,
  Load : function( )
    {
      this.loaded = true;
      var hash = location.hash.substring(1);
      if (hash.length)
        phoxy.SimpleApiRequest(hash);
      $(window).bind('hashchange', PhoxyHashChangeCallback);
    }
  ,
  DeferRender : function (design, result, data)
    {
      setTimeout(function() {
        phoxy.Render(design, result, data);
      }, 10);
    }
  ,
  ChangeHash : function (hash)
    {
      var t;
      t = hash.split(location.origin)[1];
      if (t !== undefined)
        hash = t;
      var t = hash.split('#')[1];
      if (t !== undefined)
        hash = t;
      var ret = phoxy.hash != hash;
      phoxy.hash = hash;
      location.hash = hash;
      return ret;
    }
  ,
  Reset : function (url)
    {
      if (url == true || url == "true")
        location.reload();
      var parts = url.split('#');
      if (parts[1] == undefined)
        phoxy.ChangeHash('');
      else
        phoxy.ChangeHash("#" + parts[1]);
      var host = parts[0];
      if (host.length)
        location = host;
      else
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
        this.ChangeHash(answer.hash);
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
            phoxy.ScriptsLoaded(answer, callback);
          }
        );  
      }
      else
        phoxy.ScriptsLoaded(answer, callback);
    }
  ,
  ScriptsLoaded : function( answer, callback )
    {
      if (answer.design !== undefined)
        phoxy.Render(phoxy.Config()['ejs_dir'] + "/" + answer.design, answer.result, answer.data);
      if (answer.routeline !== undefined)
        window[answer.routeline](answer.data);
      if (callback)
        callback(answer.data);
      if (!phoxy.loaded)
        phoxy.Load();
    }
  ,
  SimpleApiRequest : function( url )
    {
      $(function()
      {
        $.getJSON(phoxy.Config()['api_dir'] + "/" + url, function(data) { phoxy.ApiAnswer(data); });
      });
    }
  ,
  MenuCall : function( url )
    {
        $(function()
        {
          $.getJSON(phoxy.Config()['api_dir'] + "/" + url, function(data)
          {
            phoxy.ChangeHash(url)  ;
            phoxy.ApiAnswer(data);
          });
        });	  
    }
  ,
  Config : function()
    {
      return this.config;
    }
}
