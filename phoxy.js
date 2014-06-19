requirejs.config({
    waitSeconds: 60
});

require([
  "libs/text", // part of require js
  "//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js",
  "libs/EJS/ejs.js"
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

      var origin_RenderCompleted = EJS.Canvas.prototype.RenderCompleted;
      EJS.Canvas.prototype.RenderCompleted = function()
      {
        origin_RenderCompleted.apply(this);

        // In case of recursive rendering, forbid later using
        // If you losed context from this, and access it with __context
        // Then probably its too late to use this methods:
        delete this.across.Defer;
        delete this.across.DeferRender;
        delete this.across.DeferCascade;

        if (this.recursive)
          return;
        // no one DeferRender was invoked
        // but Canvas.on_completed not prepared
        // So render plan is plain, and we attach CheckIsCompleted in this.Defer queue
        this.recursive++;
        phoxy.RenderCalls++;
        this.across.Defer(this.CheckIsCompleted);
      }

      EJS.Canvas.prototype.CheckIsCompleted = function()
      {
        var escape = this.escape();
        if (--escape.recursive == 0)
        {
          console.log("phoxy.FireUp", [escape.name, escape]);
          escape.fired_up = true;
          for (var k in escape.cascade)
            if (typeof (escape.cascade[k]) == 'function')
                escape.cascade[k].apply(this);
          if (typeof(escape.on_complete) == 'function')
            escape.on_complete();
        }
      }
      
      EJS.Canvas.prototype.hook_first = function(result)
      {
        result = $(result);
        if (result.not('defer_render,render,.phoxy_ignore').size())
          return result;
        return result.nextAll().not('defer_render,render,.phoxy_ignore').first();
      };

      EJS.Canvas.prototype.recursive = 0;
      phoxy.RenderCalls = 0;

      EJS.Canvas.across.prototype.DeferRender = function(ejs, data, callback, tag)
      {
        var that = this.escape();
        if (that.fired_up)
        {
          console.log("You can't invoke this.Defer... methods after rendering finished.\
Because parent cascade callback already executed, and probably you didn't expect new elements on your context.\
Check if you call this.Defer... on DOM(jquery) events? Thats too late. (It mean DOM event exsist -> Render completed).\
In that case use phoxy.Defer methods directly. They context-dependence free.");
          debugger; // already finished
        }
        that.recursive++;
        phoxy.RenderCalls++;

        function CBHook()
        {
          if (typeof callback == 'function')
            callback.call(this); // Local fancy context
          phoxy.RenderCalls--;

          that.CheckIsCompleted.call(that.across);
        }

        return phoxy.DeferRender(ejs, data, CBHook, tag);
      }

      var OriginDefer = EJS.Canvas.across.prototype.Defer;
      EJS.Canvas.across.prototype.Defer = function(callback, time)
      {
        var that = this.escape();
        that.recursive++;
        if (that.fired_up)
        {
          console.log("You can't invoke this.Defer... methods after rendering finished.\
Because parent cascade callback already executed, and probably you didn't expect new elements on your context.\
Check if you call this.Defer... on DOM(jquery) events? Thats too late. (It mean DOM event exsist -> Render completed).\
In that case use phoxy.Defer methods directly. They context-dependence free.");
          debugger; // already finished
        }


        function CBHook()
        {
          if (typeof callback == 'function')
            callback.call(that.across);
          that.CheckIsCompleted.call(that.across);
        }

        return OriginDefer.call(this, CBHook, time);
      }

      EJS.Canvas.across.prototype.DeferCascade = function(callback)
      {
        var that = this.escape();
        if (that.fired_up)
        {
          console.log("You can't invoke this.Defer... methods after rendering finished.\
Because parent cascade callback already executed, and probably you didn't expect new elements on your context.\
Check if you call this.Defer... on DOM(jquery) events? Thats too late. (It mean DOM event exsist -> Render completed).\
In that case use phoxy.Defer methods directly. They context-dependence free.");
          debugger; // already finished
        }

        if (typeof that.cascade == 'undefined')
          that.cascade = [];

        that.cascade.push(callback);
      }
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
    var func = $.proxy(
      function()
      {
        callback.call(this);
      },
      this);

    if (time == -1)
      func();
    else
      setTimeout(func, time);
  }
  ,
  DDefer : function(callback, time)
  {
    phoxy.Defer.call(this, function()
    {
      phoxy.Defer.call(this, callback);
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
        return $(jquery_selector);
      }
      function IsDivAppeared()
      {
        return Div()[0] != undefined;
      }    
      
      phoxy.Defer(function()
      {
        phoxy.WaitFor(IsDivAppeared, function()
        {
          phoxy.DDefer.call(Div(), callback, call_delay);
        }, timeout)
      });
    }
  ,
  Disappeared : function(jquery_selector, callback, timeout, call_delay)
    {
      function IsDivDisappeared()
      {
        return $(jquery_selector)[0] == undefined;
      }    
    
      phoxy.Defer(function()
      {
        phoxy.WaitFor(IsDivDisappeared, function()
        {
          phoxy.DDefer(callback, call_delay);
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
  PrepareCanvas : function(tag)
    {
      if (tag == undefined)
        tag = '<div>';
      function GetElementCode( el )
      {
        return $(el).wrapAll('<div></div>').parent().html();
      }

      var id =  phoxy.GenerateUniqueID();
      var obj = $(tag).attr('id', id);
      var div = GetElementCode(obj);
      
      return { id: id, obj: obj, html: div };
    }
  ,
  DeferRender : function (ejs, data, rendered_callback, tag)
    {
      console.log("phoxy.DeferRender", arguments);
      if (tag == undefined)
        tag = '<defer_render>';
      var canvas = phoxy.PrepareCanvas(tag);
      var id = canvas.id;
      
      phoxy.RenderReplace('#' + id, ejs, data, rendered_callback);

      return canvas.html;
    }
  ,
  __REFACTOR_RenderPrototype : function (target, ejs, data, rendered_callback, difference)
    {
      phoxy.Appeared(target, function()
      {
        phoxy.Fancy(ejs, data, function(obj, ejs, data)
        {
          difference.call(phoxy, target, obj.html, arguments);

          obj.on_complete = function()
          {
            if (typeof(rendered_callback) != 'undefined')
              rendered_callback.call(obj.across, ejs, data, obj.html);
          };
        }, true);
      }, undefined, -1);
    }
  ,
  RenderInto : function (target, ejs, data, rendered_callback)
    { 
      var args = Array.prototype.slice.call(arguments);
      args.push(function(target, html)
      {
        $(target).html(html);
      });
      phoxy.__REFACTOR_RenderPrototype.apply(this, args);
    }
  ,
  RenderReplace : function (target, ejs, data, rendered_callback)
    {
      var args = Array.prototype.slice.call(arguments);
      args.push(function(target, html)
      {
        $(target).replaceWith(html);
      });
      phoxy.__REFACTOR_RenderPrototype.apply(this, args);
    }  
  ,
  Fancy : function(design, data, callback, raw_output)
    {
      console.log("phoxy.Fancy", arguments);

      var args = arguments;

      var callback = args[2];
      if (typeof(callback) == 'undefined')
        callback = function (){};

      /* 
       * [a0] phoxy.Fancy(string, undefined, anytype)
       * * Then it full RPC call, with fixed render place
       * * (result/replace keywords ignoring)
       * 
       * [a1] phoxy.Fancy(object, undefined, anytype)
       * * Then params already constructed with object
       * * NOTICE: All keywoards ARE interprenting
       */
      if (typeof(args[1]) == 'undefined')
      {
        if (typeof(args[0]) == 'undefined')
          return callback(undefined, undefined, undefined);
        
        if (typeof(args[0]) == 'string')
        {
// [a0] ////////
          var rpc = args[0];
          phoxy.AJAX(rpc, function(obj)
          {
            phoxy.Fancy(obj, args[1], args[2], args[3]);
          });
          return;
        }

        if (typeof(args[0]) != 'object')
          throw "Failed phoxy.Fancy object recognize";

// [a1] ////////
        var obj = args[0];
        // Maybe its wrong. Maybe i should ignore other params
        var design = obj.design;
        var data = obj.data;
        if (typeof(data) == 'undefined')
          data = {};

        // Those removed because we dont need to render anything
        delete obj.design;
        // Those ignored since it phoxy.DeferRender. Place to render already choosed
        delete obj.result;
        delete obj.replace;
          
        phoxy.ApiAnswer(obj, function()
        {
          phoxy.Fancy(design, data, callback, args[3]);
        });
        return;
      }

      /* Data preparing
       * [b0] phoxy.Fancy(anytype, function, anytype)
       * * Generating data through function
       * * Data could be returned directly (object only)
       * *  or could be returned asynchronously with callback, as soon as it will be ready.
       * 
       * [b1] phoxy.Fancy(anytype, string, anytype)
       * * Requesting data with RPC
       * * NOTICE: Every keywoards except data ARE ignored.
       * 
       * [b2] phoxy.Fancy(anytype, object, anytype)
       * * Serving with constructed object. Ready to render!
       */

      function DataLoadedCallback(data)
      {
        if (typeof(data) == 'undefined')
          data = {};
        phoxy.Fancy(args[0], data, args[2], args[3]);
      }
      
      if (typeof(args[1]) == 'function')
      {
// [b0] ////////
        var data_load_functor = args[1];
        data = data_load_functor(DataLoadedCallback);
        if (typeof(data) != 'object')
          return; // data will be returned async
      }
      else if (typeof(args[1]) == 'string')
      {
// [b1] ////////
        var rpc_url = args[1];
        phoxy.AJAX(rpc_url, function(json)
        {
          if (typeof(json.error) != 'undefined')
            phoxy.ApiAnswer(json);
          DataLoadedCallback(json.data);
        });
        return;
      }
      else if (typeof(args[1]) != 'object')
        throw "Failed phoxy.Fancy data receive";
      else
// [b2] ////////
        data = args[1];

      var html;

      /* Rendering
       * [c0] phoxy.Fancy(undefined, NOT undefined, anytype)
       * * Only invoking callback with prepared data
       * * Used when design determining dynamically
       * 
       * [c1] phoxy.Fancy(string, NOT undefined, anytype)
       * * First parameter is EJS string, same as in 'design' keyword
       * 
       * [c2] phoxy.Fancy(function, NOT undefined, anytype)
       * * First paremeter if method which determine design in runtime
       * * Just same as [b0] for data preparing do.
       */

      if (typeof(args[0]) == 'undefined')
// [c0] ////////
        return callback(html, design, data);

      if (typeof(args[0]) == 'string')
// [c1] ////////
        design = args[0];
      else if (typeof(args[0]) == 'function')
      {
// [c2] ////////
        function DetermineAsync(design)
        {
          phoxy.Fancy(design, data, args[2], args[3]);
        }

        design = design(data, DetermineAsync);
        if (typeof(design) != 'string')
          return; // Will be rendered later (async design determine)
      }

      var ejs_location = phoxy.Config()['ejs_dir'] + "/" + design;
      html = phoxy.Render(ejs_location, undefined, data, true);

      if (!raw_output)
        html = html.html;
      callback(html, design, data);
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
      if (url == true)
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
  Render : function (design, result, data, is_phoxy_internal_call)
    {
      if (data === undefined)
        data = {};

      console.log("phoxy.Render", arguments);
      var html;
      if (design.search(".ejs") == -1)
        design += ".ejs";
      var ejs;
      //if (!phoxy.ForwardDownload(design))
        ejs = new EJS({'url' : design});
      //else
//        ejs = new EJS({'text' : phoxy.ForwardDownload(design), 'name' : design});

      var html = obj = ejs.render(data, is_phoxy_internal_call);
      if (is_phoxy_internal_call)
        html = obj.html;

      if (result != undefined && result != '')
        $("#" + result).replaceWith(html);
      return obj;
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

      var canvas = phoxy.PrepareCanvas('<render>');
      var id = canvas.id;
      var render_id = id;

      var element = canvas.obj;
      
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
      console.log("phoxy.AJAX", arguments);
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
  ApiRequest : function( url, obj_optional, callback )
    {
      if (arguments.length == 1)
        return phoxy.ApiRequest(url, undefined);
      if (arguments.length == 2 && typeof arguments[1] == 'function')
        return phoxy.ApiRequest(url, undefined, arguments[1]);

      if (obj_optional != undefined)
      {
        var serialize = function(obj, prefix)
        {
          var str = [];
          for(var p in obj)
          {
            var 
              k = prefix ? prefix + "[" + p + "]" : p,
              v = obj[p];
            str.push
            (
              typeof v == "object"
                ? serialize(v, k)
                : encodeURIComponent(k) + "=" + encodeURIComponent(v)
            );
          }
          return str.join("&");
        }

        url += '?' + serialize(obj_optional);
      }

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
}
