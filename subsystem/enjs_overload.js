/***
 * Overloading EJS method: this.DeferCascade, this.DeferRender etc.
 ***/


phoxy.OverrideENJS =
{
  _: {}
};

phoxy._.enjs =
{
  OverloadENJSCanvas: function()
    {
      EJS.Canvas.prototype.recursive = 0;
      phoxy.state.RenderCalls = 0;

      phoxy._.internal.Override(EJS.Canvas.prototype, 'RenderCompleted', phoxy._.enjs.RenderCompleted);
      phoxy._.internal.Override(EJS.Canvas.prototype, 'Defer', phoxy._.enjs.Defer);
      phoxy._.internal.Override(EJS.Canvas.prototype, 'CheckIsCompleted', phoxy._.enjs.CheckIsCompleted);
      phoxy._.internal.Override(EJS.Canvas.prototype, 'hook_first', phoxy._.enjs.hook_first);

      phoxy._.internal.Override(EJS.Canvas.across.prototype, 'DeferCascade', phoxy._.enjs.DeferCascade);

      phoxy._.internal.Override(EJS.Canvas.across.prototype, 'CascadeDesign', phoxy._.enjs.CascadeDesign);
      phoxy._.internal.Override(EJS.Canvas.across.prototype, 'CascadeRequest', phoxy._.enjs.CascadeRequest);
      phoxy._.internal.Override(EJS.Canvas.across.prototype, 'CascadeSupply', phoxy._.enjs.CascadeSupply);
      phoxy._.internal.Override(EJS.Canvas.across.prototype, 'ForeachDesign', phoxy._.enjs.ForeachDesign);
      phoxy._.internal.Override(EJS.Canvas.across.prototype, 'ForeachRequest', phoxy._.enjs.ForeachRequest);
    }
  ,
  RenderCompleted: function()
    {
      arguments.callee.origin.apply(this);

      // In case of recursive rendering, forbid later using
      // If you losed context from this, and access it with __this
      // Then probably its too late to use this methods:
      delete this.across.Defer;
      delete this.across.DeferRender;
      delete this.across.DeferCascade;

      if (this.recursive)
        return;

      // not single DeferRender was invoked
      // but Canvas.on_completed not prepared
      // So render plan is plain, and we attach CheckIsCompleted in this.Defer queue
      this.recursive++;
      phoxy.state.RenderCalls++;
      this.across.Defer(this.CheckIsCompleted);
    }
  ,
  CheckIsCompleted: function()
    {
      var escape = this.escape();
      if (--escape.recursive === 0)
      {
        escape.log("FireUp");
        escape.fired_up = true;
        for (var k in escape.cascade)
          if (typeof (escape.cascade[k]) === 'function')
              escape.cascade[k].apply(this);
        if (typeof(escape.on_complete) === 'function')
          escape.on_complete();
      }
    }
  ,
  hook_first: function(result)
    {
      var root = result;

      while (true)
      {
        if (!root)
          break;

        if (root.nodeType == 1 &&
          ['defer_render','render'].indexOf(root.tagName) === -1 &&
          root.classList.contains('phoxy_ignore') === false &&
          root.classList.contains('ejs_ancor') === false)
          break;

        root = root.nextSibling;
      }

      phoxy._.enjs.update_context_after_cascade_finished(this, root);

      return root;
    }
  ,
  update_context_after_cascade_finished: function(context, root)
  {
    if (!phoxy.state.trigger_rendered_hook)
      return;

    if (root == null || root.tagName.search('CASCADE') == -1)
      return;

    root.addEventListener('phoxy.rendered.alpha', function(e)
    {
      if (e.target != root)
        return;

      context.first_dom_element_cached = undefined;
      context.get_first_context_dom_element(root.getAttribute('id'));
    });

  }
  ,
  CascadeInit: function(across, ejs, data, callback, tag, sync_cascade)
    {
      var that = across.escape();
      phoxy._.enjs.RequireENJSRutime(that);
      that.recursive++;
      phoxy.state.RenderCalls++;

      function CBHook()
      {
        if (typeof callback === 'function')
          callback.call(this); // Local fancy context
        phoxy.state.RenderCalls--;

        that.CheckIsCompleted.call(that.across);
      }

      data = phoxy._.enjs.InitData(data);

      if (phoxy.state.sticky_cascade_strategy)
        sync_cascade = sync_cascade || that.sync_cascade;

      var ancor = phoxy.DeferRender(ejs, data, CBHook, tag, sync_cascade);
      that.Append(ancor);

      return "<!-- <%= %> IS OBSOLETE. Refactor " + that.name + " -->";
    }
  ,
  InitData: function(data)
  {
    if (Array.isArray(data))
    {
      var origin = data;

      data = data.reduce(function(o, v, i)
      {
        o[i] = v;
        return o;
      }, {});

      data.length = origin.length;
      data.origin = origin;
    }

    // Handling non arrays (ex: strings) as data objects
    if (['object', 'undefined', 'function'].indexOf(typeof data) == -1)
      data = { data: data };

    return data;
  }
  ,
  CascadeDesign: function(ejs, data, callback, tag, sync_cascade)
    {
      if (data === undefined || data === null)
        if (typeof ejs !== 'object')
          data = {};

      this.escape().log("Design", ejs, data);
      return phoxy._.enjs.CascadeInit(this, ejs, data, callback, tag || "<CascadeDesign>", sync_cascade);
    }
  ,
  CascadeRequest: function(url, callback, tag, sync_cascade)
    {
      if (typeof url !== 'string' && !Array.isArray(url))
        return phoxy.Log(1, "Are you sure that URL parameters of CascadeRequest right?");

      this.escape().log("Request", url);
      return phoxy._.enjs.CascadeInit(this, url, undefined, callback, tag || "<CascadeRequest>", sync_cascade);
    }
  ,
  CascadeSupply: function(design, url, callback, tag, sync_cascade)
    {
      if (typeof url !== 'string' && !Array.isArray(url))
        return phoxy.Log(1, "Are you sure that URL parameters of CascadeRequest right?");

      this.escape().log("Supply", design, url);

      // Workaround issue caused cascade support array/string types
      // - main types for url handling
      function hook_data_ready(cb)
      {
        phoxy.AJAX(url, function (data)
        {
          cb(data.data);
        });
      }

      return phoxy._.enjs.CascadeInit(this, design, hook_data_ready, callback, tag || "<CascadeRequest>", sync_cascade);
    }
  ,
  ShortcutCallback: function(k, callback)
  {
    if (typeof callback !== 'function')
      return undefined;

    return function()
    {
      var args = arguments;
      args.unshift(k);
      return callback.apply(this, args);
    }
  }
  ,
  ForeachDesign: function(ejs, dataset, callback, tag, sync_cascade)
  {
    var that = this.escape();

    if (!tag)
      tag = "<cascadedesign>";

    if (phoxy.state.sync_foreach_request)
      sync_cascade = sync_cascade || false;

    var render_tasks = [];
    for (var k in dataset)
      if (dataset.hasOwnProperty(k))
        render_tasks.push(dataset[k]);

    var k = 0;
    var done = 0;
    var scout_count = Math.min(render_tasks.length, phoxy.state.cascade_foreach_scouts);
    var chunk_size = scout_count * phoxy.state.cascade_foreach_chunks || 1;
    var render_continue = 0;

    that.recursive += render_tasks.length;

    function last_scout_done()
    {
      var origin_cb = phoxy._.enjs.ShortcutCallback(k++, callback);

      return function plan_next_scout()
      {
        that.CheckIsCompleted.call(that.across);
        done++;

        if (origin_cb)
          origin_cb.apply(this, arguments);

        if (done == render_tasks.length)
          phoxy._.render.Replace.call(phoxy, scout_delimeter.id, '');

        if (k == render_tasks.length)
          return;

        var render_task = chunk_size;

        if (done != 1)
        {
          if (done % chunk_size)
            return; // render with chunks
        }
        else
        {
          render_task = scout_count;
        }


        render_continue += render_task;
        still_present();
        render_continue_func();
      }
    };

    if (!scout_count)
      return;

    var scout_element;
    function still_present()
    {
      if (document.getElementById(scout_delimeter.id))
        return true;

      k = render_tasks.length * 100;
      return false;
    }

    function render_continue_func()
    {
      var render_task = render_continue;
      render_continue = 0;

      if (!render_task && force)
        render_task = chunk_size;

      var render_ancors = "";
      for (var i = 0; i < render_task; i++)
        if (k < render_tasks.length)
        {
          var data = phoxy._.enjs.InitData(render_tasks[k]);
          var ancor = phoxy.DeferRender(ejs, data, last_scout_done(), tag, sync_cascade);

          render_ancors += ancor;
        }

      phoxy._.render.Replace.call(phoxy, scout_delimeter.id, render_ancors + scout_delimeter.html);
    }

    for (var i = 0; i < chunk_size; i++)
      this.CascadeDesign(ejs, render_tasks[k], last_scout_done(), tag, true);

    var scout_delimeter = phoxy._.render.PrepareAncor(typeof tag == 'undefined' ? "<foreachdesign>" : tag);
    that.Append(scout_delimeter.html);
  }
  ,
  ForeachRequest: function(dataset, callback, tag, sync_cascade)
  {
    if (phoxy.state.sync_foreach_request)
      sync_cascade = sync_cascade || false;

    for (var k in dataset)
      if (dataset.hasOwnProperty(k))
        this.CascadeRequest(dataset[k], phoxy._.enjs.ShortcutCallback(k, callback), tag, sync_cascade);
  }
  ,
  Defer: function(callback, time)
    {
      var that = this.escape();

      that.log("Defer", callback, time);
      that.recursive++;
      phoxy._.enjs.RequireENJSRutime(that);


      function defer_cb()
      {
        if (typeof callback === 'function')
          callback.call(that.across);
        that.CheckIsCompleted.call(that.across);
      }

      // In sync cascade defer executing immideately
      var OriginDefer = arguments.callee.origin;
      if (that.sync_cascade)
        return OriginDefer.call(this, defer_cb, time);

      if (typeof that.defer === 'undefined')
        that.defer = [];

      return that.defer.push(function enjs_defer_sheduler()
      {
        return OriginDefer(defer_cb, time);
      })
    }
  ,
  DeferCascade: function(callback)
    {
      var that = this.escape();
      that.log("DeferCascade", callback);
      phoxy._.enjs.RequireENJSRutime(that);

      if (typeof that.cascade === 'undefined')
        that.cascade = [];

      that.cascade.push(callback);
    }
  ,
  RequireENJSRutime: function(that)
  {
    if (!that.fired_up)
      return; // requirment ment. continue;

    phoxy.Log(0, "You can't invoke __this.Defer... methods after rendering finished.\
Because parent cascade callback already executed, and probably you didn't expect new elements on your context.\
Check if you call __this.Defer... on DOM(jquery) events? Thats too late. (It mean DOM event exsist -> Render completed).\
In that case use phoxy.Defer methods directly. They context-dependence free.");
  }
};
