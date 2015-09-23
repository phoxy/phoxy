phoxy._RenderSubsystem =
{
  DeferRender : function (ejs, data, rendered_callback, tag)
    {
      phoxy.Log(4, "phoxy.DeferRender", arguments);
      if (tag === undefined)
        tag = '<defer_render>';
      var canvas = phoxy._.render.PrepareCanvas(tag);
      var id = canvas.id;

      phoxy._.render.RenderReplace(id, ejs, data, rendered_callback);

      if (tag === null)
        return canvas;
      return canvas.html;
    }
  ,
};

phoxy._RenderSubsystem._ = {};
phoxy._RenderSubsystem._.render =
{
  PrepareCanvas : function(tag)
    {
      if (tag === undefined)
        tag = '<div>';
      var vanilla_tag = tag.substring(1, tag.length - 1);

      var id =  phoxy._.internal.GenerateUniqueID();
      var obj = document.createElement(vanilla_tag);
      obj.setAttribute('id', id);
      var div = obj.outerHTML;

      return { id: id, obj: obj, html: div };
    }
  ,
  AsyncRender_Strategy : function (target, ejs, data, rendered_callback, difference)
    { // AsyncRender strategy: for production
      phoxy._.render.Fancy(ejs, data, function(obj, ejs, data)
      {
        if (typeof obj === 'undefined')
        {
          phoxy.Log(3, 'phoxy.Reality', 'Design render skiped. (No design was choosed?)', document.getElementById(target));
          return; // And break dependencies execution
        }

        // Potential cascade memleak
        // Should clear listeners with callback
        phoxy._.time.Appeared(target, function()
        {
          difference.call(phoxy, target, obj.html, arguments);
          for (var k in obj.defer)
              obj.defer[k]();
        }, undefined, -1);

        obj.on_complete = function()
        {
          if (typeof(rendered_callback) !== 'undefined')
            rendered_callback.call(obj.across, ejs, data, obj.html);
        };
      }, true);
    }
  ,
  SyncRender_Strategy : function (target, ejs, data, rendered_callback, difference)
    { // SyncRender strategy: for debug/develop purposes
      phoxy._.time.Appeared(target, function()
      {
        phoxy._.render.Fancy(ejs, data, function(obj, ejs, data)
        {
          if (typeof obj === 'undefined')
          {
            phoxy.Log(3, 'phoxy.Reality', 'Design render skiped. (No design was choosed?)', document.getElementById(target));
            return; // And break dependencies execution
          }

          difference.call(phoxy, target, obj.html, arguments);

          obj.on_complete = function()
          {
            if (typeof(rendered_callback) !== 'undefined')
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
        document.getElementById(target).innerHTMl = html;
      });
      phoxy._.render.RenderStrategy.apply(this, args);
    }
  ,
  RenderReplace : function (target, ejs, data, rendered_callback)
    {
      var args = Array.prototype.slice.call(arguments);
      args.push(function(target, html)
      {
        var that = document.getElementById(target);
        that.insertAdjacentHTML("afterEnd", html);
        that.parentNode.removeChild(that);
      });
      phoxy._.render.RenderStrategy.apply(this, args);
    }
  ,
  Render : function (design, data, callback, is_phoxy_internal_call)
    {
      if (data === undefined)
        data = {};

      phoxy.Log(5, "phoxy.Render", arguments);
      var html;
      if (design.indexOf(".ejs") === -1)
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

      if (typeof phoxy === 'undefined' || typeof phoxy.state === 'undefined')
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
          args[i] = phoxy.ConstructURL(args[i]);
          return phoxy._.render.Fancy.apply(this, args);
        }

      phoxy.Log(6, "phoxy.Fancy", arguments);

      var callback = args[2];
      if (typeof(callback) === 'undefined')
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
      if (typeof(args[1]) === 'undefined')
      {
        if (typeof(args[0]) === 'undefined')
          return callback(undefined, undefined, undefined);

        if (typeof(args[0]) === 'string')
        {
// [a0] ////////
          var rpc = args[0];
          FancyServerRequest(rpc, function(obj)
          {
            phoxy._.render.Fancy(obj, args[1], args[2], args[3]);
          });
          return;
        }

        if (typeof(args[0]) !== 'object')
          throw "Failed phoxy.Fancy object recognize";

// [a1] ////////
        var obj = args[0];
        // Maybe its wrong. Maybe i should ignore other params
        var design = obj.design;
        var data = obj.data || {};

        HandleServerAnswerAndInvokeCallback(obj, function()
        {
          phoxy._.render.Fancy(design, data, callback, args[3]);
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
        phoxy._.render.Fancy(args[0], data, args[2], args[3]);
      }

      if (typeof(args[1]) === 'function')
      {
// [b0] ////////
        var data_load_functor = args[1];
        data = data_load_functor(DataLoadedCallback);
        if (typeof(data) !== 'object')
          return; // data will be returned async
      }
      else if (typeof(args[1]) === 'string')
      {
// [b1] ////////
        var rpc_url = args[1];
        FancyServerRequest(rpc_url, function(json)
        {
          DataLoadedCallback(json.data);
        });
        return;
      }
      else if (typeof(args[1]) !== 'object')
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

      if (typeof(args[0]) === 'undefined')
// [c0] ////////
        return callback(html, design, data);

      if (typeof(args[0]) === 'string')
// [c1] ////////
        design = args[0];
      else if (typeof(args[0]) === 'function')
      {
// [c2] ////////
        function DetermineAsync(design)
        {
          phoxy._.render.Fancy(design, data, args[2], args[3]);
        }

        design = design(data, DetermineAsync);
        if (typeof(design) !== 'string')
          return; // Will be rendered later (async design determine)
      }

      phoxy._.birth.Conceive(design, data, callback, raw_output);
    }
  ,
};

phoxy._RenderSubsystem._.birth =
{
  Envision: function()
  {

  },
  Conceive: function(design, data, callback, raw_output)
  {
    var ejs_location = phoxy.Config()['ejs_dir'] + "/" + design;
    var html = phoxy._.render.Render(ejs_location, data, undefined, true);

    if (!raw_output)
      html = html.html;
    callback(html, design, data);
  }
};