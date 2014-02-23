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
      phoxy.ApiRequest(hash);
      this.hash = hash;
      $(window).bind('hashchange', PhoxyHashChangeCallback);
    }
  ,
  Defer : function(callback, time)
  {
    if (time == undefined)
      time = 0;
    var th = this;
    setTimeout(function()
    {
      callback.call(th);
    }, time);
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
        callback();
      }
      if (callback_condition())
        return func();

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
      function Div()
      {
        return $(phoxy.OptimiseSelector(jquery_selector));
      }
      function IsDivAppeared()
      {
        return Div()[0] != undefined;
      }    
      
      phoxy.Defer(function()
      {
        phoxy.WaitFor(IsDivAppeared, function()
        {
          phoxy.Defer.call(Div(), callback, call_delay);
        }, timeout)
      });
    }
  ,
  Disappeared : function(jquery_selector, callback, timeout, call_delay)
    {
      function IsDivDisappeared()
      {
        return $(phoxy.OptimiseSelector(jquery_selector))[0] == undefined;
      }    
    
      phoxy.Defer(function()
      {
        phoxy.WaitFor(IsDivDisappeared, function()
        {
          phoxy.Defer(callback, call_delay);
        }, timeout);
      });
    }
  ,
  GenerateUniqueID : function()
    {
      var ret = "";
      var dictonary = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < 10; i++)
        ret += dictonary.charAt(Math.floor(Math.random() * dictonary.length));

      return ret;
    }
  ,
  DeferRender : function (ejs, data, rendered_callback)
    {
      function GetElementCode( el )
      {
        return $(el).wrapAll('<div></div>').parent().html();
      }

      var id = phoxy.GenerateUniqueID();
      var div = GetElementCode($('<div/>').attr('id', id).attr("data-debug_comment", "Staged for defer loading. Will be anigilated soon."));

      var func;
      
      if (typeof(data) == 'undefined')
      { // single param call
        if (typeof(ejs) == 'object')
        { /* Called as constructed object
             Render RPC answer in this div.
           */
          func = function()
          {
            ejs.replace = id;
            phoxy.ApiAnswer(ejs, rendered_callback);
          };
        }
        else
        { /* Called as RPC
            PARAMS:
              ejs - string with RPC command
              data - undefined
            NOTE:
              target other simular commands ignored.
              result will be rendered in this div.
           */
          func = function()
          {
            phoxy.AJAX(ejs, function( data, callback)
            {
              data.replace = id;
              phoxy.ApiAnswer(data, callback);
            }, [rendered_callback]);
          };
        }
      }
      else
      { /*
          Called as design submodule
          PARAMS:
            ejs  - URL to .ejs file
            data - additional
          NOTE:
            all next comments include this params description
         */
        function DataLoadedCallback(data)
        {
          phoxy.ApiAnswer({design : ejs, "data" : data, replace : id}, rendered_callback);
        }

        if (typeof(data) == 'function')
        { /*
            data(callback) - function, with one parameter:
            PURPOSE:
              Data currently unavailable and will be generated.
            PARAMS:
              callback(ret_data) - callback method, should be called when data loaded
          */
          func = function()
          {
            data(DataLoadedCallback);
          }
        }
        else if (typeof(data) == 'string')
        { /*
            data - string with RPC command
            PURPOSE:
              Data stored on the server, and should be requested
            NOTE:
              Only `data` will be extracted from server answer
           */
          func = function()
          {
            phoxy.AJAX(data, DataLoadedCallback);
          }
        }
        else
        { /* FALLBACK
            data - object
           */
          func = function()
          {
            phoxy.ApiAnswer({design : ejs, "data" : data, replace : id}, rendered_callback);
          };
        }
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
      if (data === undefined)
        data = {};

      var html;
      if (design.search(".ejs") == -1)
        design += ".ejs";
      if (!phoxy.ForwardDownload(design))
        html = new EJS({'url' : design}).render(data);
      else
        html = new EJS({'text' : phoxy.ForwardDownload(design, true)}).render(data);
      if (result != undefined && result != '')
        $("#" + result).replaceWith(html);
      return html;
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

      function Before()
      {
        function AfterBefore(_answer)
        {
          if (_answer !== undefined)
            answer = _answer;
          phoxy.ScriptsLoaded(answer, callback);
        }
        if (answer.before !== undefined)
          window[answer.before](answer, AfterBefore);
        else
          AfterBefore();
      }
        
      if (answer.script)
        require(answer.script, Before);
      else
        Before();
    }
  ,
  ScriptsLoaded : function( answer, callback )
    {
      function ScriptsFiresUp()
      {
        if (answer.routeline !== undefined)
          window[answer.routeline](answer);
        if (callback)
          callback(answer.data);
        if (!phoxy.loaded)
          phoxy.Load();
      }   
      if (answer.design === undefined)
        return ScriptsFiresUp();

      var id = phoxy.GenerateUniqueID();
      var render_id = id;

      var element = 
        $('<div \>')
        .attr('id', id)
        .attr('data-debug_comment', "Staged for render. Will be anigilated soon.");
      
      var url = phoxy.Config()['ejs_dir'] + "/" + answer.design;
      phoxy.ForwardDownload(url + ".ejs", function()
      {
        if (answer.replace === undefined)
          if (answer.result === undefined)
            $('body').append(element);
          else
            $('#' + answer.result).html(element);
        else
          render_id = answer.replace;      

        phoxy.Render(
          url,
          render_id,
          answer.data);

        phoxy.Disappeared('#' + id, ScriptsFiresUp);          
      });
    }
  ,
  ForwardDownload : function( url, callback_or_true_for_return )
  {
    if (typeof(storage) === "undefined")
      storage = {};
      
    if (callback_or_true_for_return === true)
      return storage[url];      

    function AddToLocalStorage(data)
    {
      storage[url] = data;
      if (typeof(callback_or_true_for_return) == 'function')
        callback_or_true_for_return(data);
    }

    if (storage[url] != undefined)
    {
      if (typeof(callback_or_true_for_return) == 'function')
        callback_or_true_for_return(storage[url]);
      return true;
    }

    $.get(url, AddToLocalStorage);
    return false;
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
    }
  ,
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
