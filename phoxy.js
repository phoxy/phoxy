if (typeof phoxy == 'undefined')
  phoxy = {};
if (typeof phoxy.state !== 'undefined')
  if (phoxy.state.loaded == true)
    throw "Phoxy already loaded. Dont mess with this";


var phoxy =
{
  config : false,
  state :
  {
    loaded : false,
    hash : false,
    ajax :
    {
      nesting_level : 0,
      active_id : 0,
      active : [],
    },
    verbose : typeof phoxy.verbose == 'undefined' ? 10 : phoxy.verbose,
  },
  plugin : {},
  prestart: phoxy,
  error_names :
  [
    "FATAL",
    "ERROR",
    "WARNING",
    "INFO",
    "DEBUG",
  ],
};

phoxy._TimeSubsystem =
{
  Defer : function(callback, time)
  {
    if (time == undefined)
      time = 0;
    var func = $.proxy(
      function()
      {
        if (typeof callback == 'function')
          callback.call(this);
        else
          debugger;
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
};

phoxy._RenderSubsystem = 
{
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
      phoxy.Log(4, "phoxy.DeferRender", arguments);
      if (tag == undefined)
        tag = '<defer_render>';
      var canvas = phoxy.PrepareCanvas(tag);
      var id = canvas.id;
      
      phoxy.RenderReplace('#' + id, ejs, data, rendered_callback);

      return canvas.html;
    }
  ,
  AsyncRender_Strategy : function (target, ejs, data, rendered_callback, difference)
    {
      phoxy.Fancy(ejs, data, function(obj, ejs, data)
      {
        if (typeof obj == 'undefined')
        {
          phoxy.Log(3, 'phoxy.Reality', 'Design render skiped. (No design was choosed?)', $(target)[0]);
          return; // And break dependencies execution
        }

        // Potential cascade memleak
        // Should clear listeners with callback
        phoxy.Appeared(target, function()
        {
          difference.call(phoxy, target, obj.html, arguments);
          for (var k in obj.defer)
              obj.defer[k]();
        }, undefined, -1);

        obj.on_complete = function()
        {
          if (typeof(rendered_callback) != 'undefined')
            rendered_callback.call(obj.across, ejs, data, obj.html);
        };
      }, true);
    }
  ,
  SyncRender_Strategy : function (target, ejs, data, rendered_callback, difference)
    {
      phoxy.Appeared(target, function()
      {
        phoxy.Fancy(ejs, data, function(obj, ejs, data)
        {
          if (typeof obj == 'undefined')
          {
            phoxy.Log(3, 'phoxy.Reality', 'Design render skiped. (No design was choosed?)', $(target)[0]);
            return; // And break dependencies execution
          }

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
  RenderStrategy : "Will be replaced by selected strategy after compilation."
  ,
  RenderInto : function (target, ejs, data, rendered_callback)
    { 
      var args = Array.prototype.slice.call(arguments);
      args.push(function(target, html)
      {
        $(target).html(html);
      });
      phoxy.RenderStrategy.apply(this, args);
    }
  ,
  RenderReplace : function (target, ejs, data, rendered_callback)
    {
      var args = Array.prototype.slice.call(arguments);
      args.push(function(target, html)
      {
        $(target).replaceWith(html);
      });
      phoxy.RenderStrategy.apply(this, args);
    }  
  ,
  Render : function (design, data, callback, is_phoxy_internal_call)
    {
      if (data === undefined)
        data = {};

      phoxy.Log(5, "phoxy.Render", arguments);
      var html;
      if (design.indexOf(".ejs") == -1)
        design += ".ejs";
      var ejs;
      //if (!phoxy.ForwardDownload(design))
        ejs = new EJS({'url' : design});
      //else
//        ejs = new EJS({'text' : phoxy.ForwardDownload(design), 'name' : design});

      var obj = ejs.prepare(data);
      obj.on_complete = callback;
      ejs.execute(obj);
      html = obj.html;

      if (typeof phoxy == 'undefined' || typeof phoxy.state == 'undefined')
        throw "EJS render failed. Phoxy is missing. Is .ejs file exsists? Is your .htacess right? Check last AJAX request.";

      if (is_phoxy_internal_call)
        return obj;
      return html;
    }
  ,
  Fancy : function(design, data, callback, raw_output)
    {
      var args = arguments;
      for (var i = 0; i < 2; i++)
        if (Array.isArray(args[i]))
        {
          var array = args[i];
          var url = array.shift();
          if (array.length > 0)
            url += '(' + phoxy.Serialize(array) + ')';
          args[i] = url;
          phoxy.Fancy.apply(this, args);
          return;
        }

      phoxy.Log(6, "phoxy.Fancy", arguments);

      var callback = args[2];
      if (typeof(callback) == 'undefined')
        callback = function (){};

      function HandleServerAnswerAndInvokeCallback(answer, cb)
      {
        var obj = EJS.IsolateContext(answer);

        // Those removed because we dont need to render anything
        delete obj.design;
        // Those ignored since it phoxy.Fancy.(low level rendering) Place to render already choosed
        delete obj.result;
        delete obj.replace;
        phoxy.ApiAnswer(obj, function()
        {
          cb(answer);
        });
      }

      function FancyServerRequest(url, cb)
      {
        phoxy.AJAX(url, function(obj)
        {
          HandleServerAnswerAndInvokeCallback(obj, cb);
        });
      }

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
          FancyServerRequest(rpc, function(obj)
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
        var data = obj.data || {};

        HandleServerAnswerAndInvokeCallback(obj, function()
        {
          phoxy.Fancy(design, data, callback, args[3]);
        })

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
        data = data || {};
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
        FancyServerRequest(rpc_url, function(json)
        {
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
      html = phoxy.Render(ejs_location, data, undefined, true);

      if (!raw_output)
        html = html.html;
      callback(html, design, data);
    }
};

phoxy._ApiSubsystem =
{
  ApiAnswer : function( answer, callback )
    {
      if (answer.hash !== undefined)
      {
        if (answer.hash === null)
          answer.hash = "";
        phoxy.ChangeHash(answer.hash);
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
        
        if (answer.before === undefined)
          return AfterBefore();

        phoxy.FindRouteline(answer.before)(AfterBefore, answer);
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
        phoxy.FindRouteline(answer.routeline, answer)();
        if (callback)
          callback(answer);
        if (!phoxy.state.loaded)
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

        var obj = phoxy.Render(
          url,
          answer.data,
          ScriptsFiresUp,
          true);
        $('#' + render_id).replaceWith(obj.html);
        // Refactor
        if (!phoxy.state.sync_cascade)
          for (var k in obj.defer)
            obj.defer[k]();
      });
    }
  ,
  FindRouteline : function( routeline )
  {
    if (typeof routeline == 'undefined')
      return function() {};
    if (typeof window[routeline] == 'function')
      return window[routeline];
    var arr = routeline.split(".");
    var method = arr.pop();

    var obj = window;
    for (var k in arr)
      if (typeof obj[arr[k]] == 'undefined')
        throw "Routeline context locate failed";
      else
        obj = obj[arr[k]];

    if (typeof obj[method] != 'function')
      throw "Routeline locate failed";

    return obj[method];
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
      if (Array.isArray(url))
        if (url.length < 2)
          url = url.shift();
        else
        {
          var tmp = url.shift();
          url = tmp + '(' + phoxy.Serialize(url) + ')';
        }

      var current_ajax_id = phoxy.state.ajax.active_id++;
      phoxy.state.ajax.active[current_ajax_id] = arguments;

      if (!phoxy.state.ajax.nesting_level++)
        if (typeof phoxy.prestart.OnAjaxBegin == 'function')
          phoxy.prestart.OnAjaxBegin(phoxy.state.ajax.active[current_ajax_id]);

      $.getJSON(phoxy.Config()['api_dir'] + "/" + url, function(data)
        {
          if (params == undefined)
            params = [];
          params.unshift(data);
          callback.apply(this, params);

          if (!--phoxy.state.ajax.nesting_level)
            if (typeof phoxy.prestart.OnAjaxEnd == 'function')
              phoxy.prestart.OnAjaxEnd(phoxy.state.ajax.active[current_ajax_id]);
          delete phoxy.state.ajax.active[current_ajax_id];
        });
    }
  ,
  Serialize : function(obj, nested_mode)
    { // Its more and more looks like JSON bycicle
      function addslashes( str )
      { // http://stackoverflow.com/questions/770523/escaping-strings-in-javascript
        return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
      }

      function SerializeRaw(element)
      {
        if (typeof element == "object")
          return phoxy.Serialize(element, true);
        else if (typeof v == "string")
          if (v.search(/["'(),\/\\]/) != -1 || v == '')
            element = "\"" + addslashes(element) + "\"";
        return element;
      }

      var str = [];
      var array_mode = Array.isArray(obj);
      for(var p in obj)
      {
        var v = obj[p];
        var prefix = '';
        if (nested_mode && !array_mode)
          prefix = SerializeRaw(p) + ":";
        str.push(prefix + SerializeRaw(v));
      }
      if (!nested_mode)
        return str.join(",");
      return "[" + str.join(",") + "]";
    }
  ,
  ApiRequest : function( url, callback )
    {
      if (arguments.length == 3
            ||
            (typeof callback != 'function'
              && typeof callback != 'undefined')
          )
      {
        phoxy.Log(1, "Object optional IS deprecated. Look at #91");
        if (typeof url != 'string')
          return phoxy.Log(0, "Failed to soft translate call");
        if (typeof arguments[1] != 'undefined')
          url = [url].concat(arguments[1]);
        return arguments.callee.call(this, url, arguments[2]);
      }

      args = url;
      if (typeof url != 'string')
      {
        url = args.shift();
        url += "(" + phoxy.Serialize(args) + ")";
      }

      phoxy.AJAX(url, phoxy.ApiAnswer, [callback]);
    }
  ,
  MenuCall : function( url, callback )
    {
      if (arguments.length == 3
            ||
            (typeof callback != 'function'
              && typeof callback != 'undefined')
          )
      {
        phoxy.Log(1, "Object optional IS deprecated. Look at #91");
        if (typeof url != 'string')
          return phoxy.Log(0, "Failed to soft translate call");
        if (typeof arguments[1] != 'undefined')
          url = [url].concat(arguments[1]);
        return arguments.callee.call(this, url, arguments[2]);
      }

      phoxy.ApiRequest(url, function(data)
      {
        phoxy.ChangeHash(url);
        if (typeof callback == 'function')
          callback(data);
      });
    }
}

phoxy._InternalCode =
{
  Load : function( )
    {
      delete phoxy.Load; // Cause this is only one time execution
      phoxy.state.loaded = true;
      var hash = location.hash.substring(1);
      if (!phoxy.prestart.skip_initiation)
        phoxy.ApiRequest(hash);
      phoxy.state.hash = hash;

      function PhoxyHashChangeCallback()
      {
        if (phoxy.ChangeHash(location.hash))
          phoxy.ApiRequest(phoxy.state.hash);
      }

      $(window).bind('hashchange', PhoxyHashChangeCallback);
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
      var ret = phoxy.state.hash != hash;
      phoxy.state.hash = hash;
      location.hash = hash;
      return ret;
    }
  ,
  GenerateUniqueID : function() // Deprecated, use $.uniqueId();
    {
      var ret = "";
      var dictonary = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < 10; i++)
        ret += dictonary.charAt(Math.floor(Math.random() * dictonary.length));

      return ret;
    }
  ,
    Reset : function (url)
    {      
      if ((url || true) == true)
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
    Config : function()
    {
      return phoxy.config;
    }
  ,
    Log : function(level)
    {
      if (phoxy.state.verbose < level)
        return;

      var error_names = phoxy.error_names;
      var errorname = error_names[level < error_names.length ? level : error_names.length - 1];

      var skipfirst = true;
      var args = [errorname];
      for (var v in arguments)
        if (skipfirst)
          skipfirst = false;
        else
          args.push(arguments[v]);
      var method;
      if (level < 2)
        method = "error";
      else if (level == 2)
        method = "warn";
      else if (level == 3)
        method = "info";
      else
        method = "debug";
      console[method].apply(console, args);
    }
};

phoxy._EarlyStage =
{
  sync_require: 
    [
      "//ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js",
      "libs/EJS/ejs.js",
    ]
  ,
  async_require:
    [
    ]
  ,
  EntryPoint: function()
    {
      requirejs.config(
      {
        waitSeconds: 60
      });

      phoxy._EarlyStage.CriticalRequire();
    }
  ,
  CriticalRequire: function()
    {
      // https://gist.github.com/Xeoncross/7663273
      function ajax(url, callback, data, x)
      {
        try
        {
          x = new(this.XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
          x.open(data ? 'POST' : 'GET', url, 1);
          x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
          x.onreadystatechange = function () {
            x.readyState > 3 && callback && callback(x.responseText, x);
          };
          x.send(data)
        } catch (e)
        {
          window.console && console.log(e);
        }
      };

      ajax(phoxy.prestart.config || "api/phoxy", function(response)
      {
        data = JSON.parse(response);
        phoxy.config = data;
        if (typeof phoxy.prestart.OnBeforeCompile == 'function')
          phoxy.prestart.OnBeforeCompile();

        phoxy._EarlyStage.Compile();
        if (typeof phoxy.config.verbose != 'undefined')
          phoxy.state.verbose = phoxy.config.verbose;

        if (typeof phoxy.prestart.OnAfterCompile == 'function')
          phoxy.prestart.OnAfterCompile();

        phoxy.state.conf_loaded = true;
      })

      require
      (
        phoxy._EarlyStage.sync_require,
        function()
        {
          phoxy._EarlyStage.DependenciesLoaded();
        }
      );

      require
      (
        phoxy._EarlyStage.async_require,
        function() {}
      );
    }
  ,
  DependenciesLoaded: function()
    {
      if (!phoxy.state.conf_loaded) // wait until phoxy configuration loaded
        return setTimeout(arguments.callee, 10);

      phoxy.OverloadEJSCanvas();
      requirejs.config({baseUrl: phoxy.Config()['js_dir']});

      var initial_client_code = 0;

      // Invoke client code
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++)
        if (scripts[i].getAttribute('phoxy') == null)
          continue;
        else
        {
          initial_client_code++;
          phoxy.ApiRequest(
            scripts[i].getAttribute('phoxy'),
            function()
            {
              phoxy.Defer(function()
              { // Be sure that zero reached only once
                if (--initial_client_code)
                  return;
                if (typeof phoxy.prestart.OnInitialClientCodeComplete == 'function')
                  phoxy.prestart.OnInitialClientCodeComplete();
              });
            });
        }
    }
  ,
  Compile: function()
    {
      var systems = ['_TimeSubsystem', '_RenderSubsystem', '_ApiSubsystem', '_InternalCode'];

      for (var k in systems)
      {
        var system_name = systems[k];
        for (var func in phoxy[system_name])
          if (typeof phoxy[func] != 'undefined')
            throw "Phoxy method mapping failed on '" + func + '. Already exsists.';
          else
            phoxy[func] = phoxy[system_name][func];
        delete phoxy[system_name];
      }

      if (phoxy.prestart.sync_cascade)
      {
        phoxy.state.sync_cascade = true;
        phoxy.RenderStrategy = phoxy.SyncRender_Strategy;
      }
      else
      {
        phoxy.state.sync_cascade = false;
        phoxy.RenderStrategy = phoxy.AsyncRender_Strategy;
      }
    }
};

/***
 * Overloading EJS method: this.DeferCascade, this.DeferRender etc.
 ***/


phoxy.OverloadEJSCanvas = function()
{
  delete phoxy.OverloadEJSCanvas; // Only one-time execution is allowed
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
      phoxy.Log(9, "phoxy.FireUp", [escape.name, escape]);
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
    return result.nextAll().not('defer_render,render,.phoxy_ignore,.ejs_ancor').first();
  };

  EJS.Canvas.prototype.recursive = 0;
  phoxy.RenderCalls = 0;

  EJS.Canvas.across.prototype.DeferRender = function(ejs, data, callback, tag)
  {
    var that = this.escape();
    if (that.fired_up)
    {
      phoxy.Log(1, "You can't invoke this.Defer... methods after rendering finished.\
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
      phoxy.Log(1, "You can't invoke this.Defer... methods after rendering finished.\
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

    if (phoxy.state.sync_cascade)
      return OriginDefer.call(this, CBHook, time);
    if (typeof that.defer == 'undefined')
      that.defer = [];
    if (typeof time == 'undefined')
      return that.defer.push(CBHook);

    that.defer.push(function()
    {
      return OriginDefer(CBHook, time);
    })
  }

  EJS.Canvas.across.prototype.DeferCascade = function(callback)
  {
    var that = this.escape();
    if (that.fired_up)
    {
      phoxy.Log("You can't invoke this.Defer... methods after rendering finished.\
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

if (!phoxy.prestart.wait)
  phoxy._EarlyStage.EntryPoint();
else
{
  if (typeof phoxy.prestart.OnWaiting == 'function')
    phoxy.prestart.OnWaiting();
}