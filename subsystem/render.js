phoxy.render =
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

phoxy._.render =
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
      phoxy._.render.Fancy(ejs, data, function async_strategy_birth(obj, ejs, data)
      {
        if (typeof obj === 'undefined')
        {
          phoxy.Log(3, 'phoxy.Reality', 'Design render skiped. (No design was choosed?)', document.getElementById(target));
          return; // And break dependencies execution
        }

        // Potential cascade memleak
        // Should clear listeners with callback
        phoxy._.time.Appeared(target, function async_strategy_wait_for_apperance()
        {
          difference.call(phoxy, target, obj.html, arguments);
          for (var k in obj.defer)
              obj.defer[k]();
        }, undefined, -1);

        obj.on_complete = function async_strategy_on_complete()
        {
          if (typeof(rendered_callback) !== 'undefined')
            rendered_callback.call(obj.across, ejs, data, obj.html);
        };
      }, true);
    }
  ,
  SyncRender_Strategy : function (target, ejs, data, rendered_callback, difference)
    { // SyncRender strategy: for debug/develop purposes
      phoxy._.time.Appeared(target, function sync_strategy_wait_for_apperance()
      {
        phoxy._.render.Fancy(ejs, data, function sync_strategy_birth(obj, ejs, data)
        {
          if (typeof obj === 'undefined')
          {
            phoxy.Log(3, 'phoxy.Reality', 'Design render skiped. (No design was choosed?)', document.getElementById(target));
            return; // And break dependencies execution
          }

          difference.call(phoxy, target, obj.html, arguments);

          obj.on_complete = function sync_strategy_on_complete()
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
      args.push(function render_into_f(target, html)
      {
        document.getElementById(target).innerHTMl = html;
      });
      phoxy._.render.RenderStrategy.apply(this, args);
    }
  ,
  RenderReplace : function (target, ejs, data, rendered_callback)
    {
      var args = Array.prototype.slice.call(arguments);
      args.push(function render_replace_f(target, html)
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
      phoxy.Log(0, "phoxy.Render is OBSOLETE. Use phoxy.Fancy instead");
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

      return new phoxy._.birth(args[0], args[1], callback, true);
    }
  ,
};

phoxy._.birth = function(will, spirit, callback, raw_output)
{
  this.will = will;
  this.spirit = spirit;
  this.birth_id = phoxy._.internal.GenerateUniqueID();
  console.time("phoxy.birth " + this.birth_id);
  this.callback = function birth_log_report()
  {
    console.groupCollapsed("phoxy.birth", will);
      console.log(spirit);
      for (var k in this.log)
        console.log.apply(console, this.log[k]);

    console.timeEnd("phoxy.birth " + this.birth_id);
    console.groupEnd();

    callback.apply(this, arguments);
  }
  this.raw_output = raw_output;
  this.log = [];

  return this.Decision(will, spirit, callback);
}

phoxy._.birth.prototype =
{
  Decision: function(will, spirit)
    {
      this.Log("Decision", arguments);
      if (typeof spirit === 'undefined')
        return this.Fortune(will);
      if (typeof spirit !== 'object')
        return this.Hope(will, spirit);
      return this.Fate(will, spirit);
    }
  ,
  Fortune: function(word)
    {
      this.Log("Fortune", arguments);
      if (typeof(word) === 'undefined')
        return this.Vision();
      else if (typeof(word) === 'string')
        return this.Prophecy(word);
      else if (typeof(word) !== 'object')
        return this.Presage(word);
      phoxy.Log(0, "birth.Fortune", word, "(Failed object recognize)");
    }
  ,
  Hope: function()
    {
      this.Log("Hope", arguments);
      var args = arguments;
      var idea = args[1];

      var that = this;
      function DataLoadedCallback(data)
      {
        data = data || {};
        that.Decision(args[0], data, args[2], args[3]);
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
  Fate: function(design, data)
    {
      this.Log("Fate", arguments);
      if (typeof(design) === 'undefined')
        return this.Vision(design, data);
      else if (typeof(design) === 'function')
        design = this.Mutation.apply(this, arguments);

      if (typeof(design) === 'string')
        return this.Conceive(design, data);
    }
  ,
  Vision: function(cb, design, data)
    {
      this.Log("Vision", arguments);
      return cb(design, data);
    }
  ,
  Prophecy: function(rpc)
    {
      this.Log("Prophecy", arguments);

      var that = this;
      this.Plea(rpc, function on_rpc_design_received(obj)
      {
        that.Presage(obj);
      });
    }
  ,
  Presage: function(obj)
    {
      this.Log("Presage", arguments);

      // Maybe its wrong. Maybe i should ignore other params
      var design = obj.design;
      var data = obj.data || {};

      var that = this;
      this.Boon(obj, function on_design_object_decoded()
      {
        that.Decision(design, data, that.callback);
      })
    }
  ,
  Pray: function(data_load_functor, DataLoadedCallback)
    {
      this.Log("Pray", arguments);
      return data_load_functor(DataLoadedCallback);
    }
  ,
  Mutation: function(design, data)
    {
      this.Log("Mutation", arguments);

      function DetermineAsync(design)
      {
        phoxy._.render.Fancy(design, data, args[2], args[3]);
      }

      return design(data, DetermineAsync);
    }
  ,
  Conceive: function(design, data)
    {
      this.Log("Conceive", arguments);
      var ejs_location = phoxy.Config()['ejs_dir'] + "/" + design;

      var that = this;
      function RenderCallback(html)
      {
        if (!that.raw_output)
          html = html.html;
        that.callback(html, design, data);
      }

      this.Render(ejs_location, data, RenderCallback);
    }
  ,
  Desire: function(rpc, DataLoadedCallback)
    {
      this.Log("Desire", arguments);
      this.Plea(rpc, function on_data_recieved(json)
      {
        DataLoadedCallback(json.data);
      });
    }
  ,
  Plea: function(url, cb)
    {
      this.Log("Plea", arguments);
      var that = this;
      phoxy.AJAX(url, function on_ajax_answer(obj)
      {
        that.Boon(obj, cb);
      });
    }
  ,
  Boon: function(answer, cb)
  {
    this.Log("Boon", arguments);
    var obj = EJS.IsolateContext(answer);

    // Those removed because we dont need to render anything
    delete obj.design;
    // Those ignored since it phoxy.Fancy.(low level rendering) Place to render already choosed
    delete obj.result;
    delete obj.replace;
    var that = this;
    phoxy.ApiAnswer(obj, function on_default_action_done()
    {
      cb.call(that, answer);
    });
  }
  ,
  Log: function()
    {
      this.log.push(arguments);
    }
  ,
  Render: function(design, data, cb)
  {
    var async = typeof cb === 'function';

    if (design.indexOf(".ejs") === -1)
        design += ".ejs";

    var ejs = new EJS({'url' : design}, async ? WhenReady : undefined);

    var that = this;
    function WhenReady()
    {
      function log()
      {
        that.Log.apply(that, arguments);
      }

      var obj = ejs.prepare(data);

      obj.on_complete = this.callback;
      obj.log = log;
      ejs.execute(obj);

      if (async)
        cb(obj);

      return obj;
    }

    if (!async)
      return WhenReady();
  }
}