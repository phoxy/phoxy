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
          phoxy.ApiRequest($(this).attr("phoxy"));
        });      
      });
    }
  );
  
function PhoxyHashChangeCallback()
{
  if (phoxy.ChangeHash(location.hash))
    phoxy.ApiRequest(phoxy.hash);
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
        phoxy.ApiRequest(hash);
      $(window).bind('hashchange', PhoxyHashChangeCallback);
    }
  ,
  Defer : function(callback, time)
  {
    if (time == undefined)
      time = 0;
    setTimeout(callback, time);
  }
  ,
  WaitFor : function(callback_condition, callback, timeout, check_every)
    {
      var
        check_timeout = 60, // 1 minute for render to complete
        check_delay = 500; // check every 500ms
      
      if (timeout != undefined)
        check_timeout = timeout;
      if (check_every != undefined)
        check_delay = check_every;
      
      var func = function()
      {
        if (!callback_condition())
          return;
        phoxy.Defer(callback, delay);
      }

      function WaitAndCallCountDown( i )
      {
        if (i <= 0)
          return func();

        phoxy.Defer(function()
        {
          if (callback_condition())
            i = 0;
          WaitAndCallCountDown(i - 1);
        }, check_delay);
      }

      WaitAndCallCountDown(check_timeout * 1000 / check_delay);
    }
  ,
  Appeared : function(jquery_selector, callback, timeout, call_delay)
    {
      jquery_selector = phoxy.OptimiseSelector(jquery_selector);
      function IsDivAppeared()
      {
        return $(jquery_selector)[0] != undefined;
      }    
    
      phoxy.WaitFor(IsDivAppeared, function()
      {
        phoxy.Defer(callback, call_delay);
      }, timeout);
    }
  ,
  Disappeared : function(jquery_selector, callback, timeout, call_delay)
    {
      jquery_selector = phoxy.OptimiseSelector(jquery_selector);
      function IsDivDisappeared()
      {
        return $(jquery_selector)[0] == undefined;
      }    
    
      phoxy.WaitFor(IsDivDisappeared, function()
      {
        phoxy.Defer(callback, call_delay);
      }, timeout);
    }
  ,
  DeferRender : function (ejs, data)
    {
      function GenerateIniqueID()
      {
        var ret = "";
        var dictonary = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 10; i++)
          ret += dictonary.charAt(Math.floor(Math.random() * dictonary.length));

        return ret;
      }

      function GetElementCode( el )
      {
        return $(el).wrapAll('<div></div>').parent().html();
      }

      var id = GenerateIniqueID();
      var div = GetElementCode($('<div/>').attr('id', id).attr("data-debug_comment", "Staged for defer loading. Will be anigilated soon."));

      var replace_callback = function()
      {
        $("#" + id).replaceWith($("#" + id).html());
      };

      var func;
      
      if (typeof(data) == 'undefined')
      { // single param call
        if (typeof(ejs) == 'object')
        { // called as constructed object
          func = function()
          {
            ejs.result = id;
            phoxy.ApiAnswer(ejs, replace_callback);
          };
        }
        else
        { // called as phoxy rpc
          func = function()
          {
            phoxy.AJAX(ejs, function( ata, callback)
            {
              data.result = id;
              phoxy.ApiAnswer(data, callback);
            }, [replace_callback]);
          };
        }
      }
      else
      { // called as design submodule (only ejs string and that data)
        func = function()
        {
          phoxy.ApiAnswer({design : ejs, "data" : data, result : id}, replace_callback);
        };
      }

      phoxy.Appeared('#' + id, func);
      return div;
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
  AJAX : function( url, callback, params )
    {
      $(function()
      {
        $.getJSON(phoxy.Config()['api_dir'] + "/" + url, function(data)
          {         
            if (params == undefined)
              params = [];
            params.unshift(data);
            callback.apply(this, params);
          });
      });
    }  ,
  ApiRequest : function( url, callback )
    {
      if (callback == undefined)
        phoxy.AJAX(url, phoxy.ApiAnswer);
      else
        phoxy.AJAX(url, phoxy.ApiAnswer, [callback]);
    }
  ,
  MenuCall : function( url, callback )
    {
        $(function()
        {
          $.getJSON(phoxy.Config()['api_dir'] + "/" + url, function(data)
          {
            phoxy.ChangeHash(url);
            phoxy.ApiAnswer(data, callback);
          });
        });	  
    }
  ,
  Config : function()
    {
      return this.config;
    }
  ,
  OptimiseSelector : function( str )
    { // http://learn.jquery.com/performance/optimize-selectors/
      if (typeof(str) != 'string')
        return str;

      var last_id_tag = str.lastIndexOf('#');
      if (last_id_tag > 0)
        str = str.substr(last_id_tag);
      var elements = str.split(" ");
      var ret = $(elements[0]);
      var i = 0;
      while (++i < elements.length)
        if (elements[i].length != 0)
          ret = ret.find(elements[i]);
      return ret;
    }    
}
