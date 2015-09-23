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
  HandleServerAnswerAndInvokeCallback : function(answer, cb)
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
  ,
  FancyServerRequest : function(url, cb)
  {
    phoxy.AJAX(url, function(obj)
    {
      phoxy._.render.HandleServerAnswerAndInvokeCallback(obj, cb);
    });
  }
  ,
  Fancy : function()
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

      return new phoxy._.birth(args[0], args[1], callback);
    }
  ,
};

phoxy._RenderSubsystem._.birth = function(will, spirit, callback)
{
  this.will = will;
  this.spirit = spirit;
  this.callback = callback;

  return this.Decision(will, spirit, callback);
}

phoxy._RenderSubsystem._.birth.prototype =
{
  Decision: function(will, spirit, callback)
    {
      if (typeof spirit === 'undefined')
        return this.Fortune(will, callback);
      if (typeof spirit !== 'object')
        return this.Hope(will, spirit, callback);
      return this.Fate(will, spirit, callback);
    }
  ,
  Fortune: function(word, callback)
    {
      if (typeof(word) === 'undefined')
        return this.Vision(callback);
      else if (typeof(word) === 'string')
        return this.Prophecy(word);
      else if (typeof(word) !== 'object')
        return this.Presage(word);
      phoxy.Log(0, "birth.Fortune", word, "(Failed object recognize)");
    }
  ,
  Hope: function()
    {
      var args = arguments;
      var idea = args[1];

      function DataLoadedCallback(data)
      {
        data = data || {};
        this.Decision(args[0], data, args[2], args[3]);
      }

      if (typeof(idea) === 'string')
        return this.Desire(idea, DataLoadedCallback);
      else if (typeof(idea) === 'function')
      {
        var data = this.Pray(args[1], DataLoadedCallback);
        if (typeof(data) === 'object')
          DataLoadedCallback(data);
      }
      else
        phoxy.Log(0, "birth.Hope", idea, "(Failed data receive)");
    }
  ,
  Fate: function(design, data, callback)
    {
      if (typeof(design) === 'undefined')
        return this.Vision(callback, design, data);
      else if (typeof(design) === 'function')
        design = this.Mutation.apply(this, arguments);

      if (typeof(design) === 'string')
        return this.Conceive(design, data, callback, raw_output);
    }
  ,
  Vision: function(cb, design, data)
    {
      return cb(design, data);
    }
  ,
  Prophecy: function(rpc)
    {
      var args = arguments;
      phoxy._.render.FancyServerRequest(rpc, function(obj)
      {
        phoxy._.render.Fancy(obj, args[1], args[2], args[3]);
      });
    }
  ,
  Presage: function(obj)
    {
      var obj = args[0];

      // Maybe its wrong. Maybe i should ignore other params
      var design = obj.design;
      var data = obj.data || {};

      phoxy._.render.HandleServerAnswerAndInvokeCallback(obj, function()
      {
        phoxy._.render.Fancy(design, data, callback, args[3]);
      })
    }
  ,
  Desire: function(rpc, DataLoadedCallback)
    {
      phoxy._.render.FancyServerRequest(rpc, function(json)
      {
        DataLoadedCallback(json.data);
      });
    }
  ,
  Pray: function(data_load_functor, DataLoadedCallback)
    {
      return data_load_functor(DataLoadedCallback);
    }
  ,
  Mutation: function(design, data)
    {
      function DetermineAsync(design)
      {
        phoxy._.render.Fancy(design, data, args[2], args[3]);
      }

      return design(data, DetermineAsync);
    }
  ,
  Conceive: function(design, data, callback, raw_output)
    {
      var ejs_location = phoxy.Config()['ejs_dir'] + "/" + design;
      var html = phoxy._.render.Render(ejs_location, data, undefined, true);

      if (!raw_output)
        html = html.html;
      callback(html, design, data);
    }
}