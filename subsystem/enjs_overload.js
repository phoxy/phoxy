/***
 * Overloading EJS method: this.DeferCascade, this.DeferRender etc.
 ***/


phoxy.OverrideENJS =
{
  _: {},
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

      phoxy._.internal.Override(EJS.Canvas.across.prototype, 'DeferRender', phoxy._.enjs.DeferRender);
      phoxy._.internal.Override(EJS.Canvas.across.prototype, 'DeferCascade', phoxy._.enjs.DeferCascade);

      phoxy._.internal.Override(EJS.Canvas.across.prototype, 'CascadeDesign', phoxy._.enjs.CascadeDesign);
      phoxy._.internal.Override(EJS.Canvas.across.prototype, 'CascadeRequest', phoxy._.enjs.CascadeRequest);
    }
  ,
  RenderCompleted: function()
    {
      arguments.callee.origin.apply(this);

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
      var root;
      while (true)
      {
        if (typeof root === 'undefined')
          root = result;
        else
          root = root.nextSibling;

        if (!root)
          break;
        if (root.nodeType !== 1)
          continue;

        if (
          ['defer_render','render'].indexOf(root.tagName) === -1 &&
          root.classList.contains('phoxy_ignore') === false &&
          root.classList.contains('ejs_ancor') === false)
          break;
      }
      return root;
    }
  ,
  DeferRender: function(ejs, data, callback, tag)
    {
      phoxy.Log(2, "__this.DeferRender is deprecated. Use __this.CascadeDesign or __this.CascadeRequest");

      if (data === undefined || data === null )
        return this.CascadeRequest.call(this, ejs, callback, tag);

      return this.CascadeDesign.apply(this, arguments);
    }
  ,
  CascadeInit: function(across, ejs, data, callback, tag)
    {
      var that = across.escape();
      phoxy._.enjs.AlreadyFiredUp(that);
      that.recursive++;
      phoxy.state.RenderCalls++;

      function CBHook()
      {
        if (typeof callback === 'function')
          callback.call(this); // Local fancy context
        phoxy.state.RenderCalls--;

        that.CheckIsCompleted.call(that.across);
      }

      var ancor = phoxy.DeferRender(ejs, data, CBHook, tag);
      that.Append(ancor);

      return "<!-- <%= %> IS OBSOLETE. Refactor " + that.name + " -->";
    }
  ,
  CascadeDesign: function(ejs, data, callback, tag)
    {
      if (data === undefined || data === null)
        data = {};

      var data_type = typeof data;
      if (data_type !== 'object'
        && data_type !== 'function'
        && data_type !== 'string')
        return phoxy.Log(1, "Are you sure that DATA parameters of CascadeDesign right?");

      var design_type = typeof ejs;
      if (design_type !== 'string'
        && design_type !== 'function')
        return phoxy.Log(1, "Are you sure that EJS parameters of CascadeDesign right?");

      this.escape().log("Design", ejs, data);
      return phoxy._.enjs.CascadeInit(this, ejs, data, callback, tag);
    }
  ,
  CascadeRequest: function(url, callback, tag)
    {
      var url_type = typeof url;

      if (typeof url !== 'string')
        return phoxy.Log(1, "Are you sure that URL parameters of CascadeRequest right?");

      this.escape().log("Request", url);
      return phoxy._.enjs.CascadeInit(this, url, undefined, callback, tag);
    }
  ,
  Defer: function(callback, time)
    {
      var that = this.escape();
      that.log("Defer", callback, time);
      that.recursive++;
      phoxy._.enjs.AlreadyFiredUp(that);


      function CBHook()
      {
        if (typeof callback === 'function')
          callback.call(that.across);
        that.CheckIsCompleted.call(that.across);
      }

      var OriginDefer = arguments.callee.origin;
      if (phoxy.state.sync_cascade)
        return OriginDefer.call(this, CBHook, time);
      if (typeof that.defer === 'undefined')
        that.defer = [];
      if (typeof time === 'undefined')
        return that.defer.push(CBHook);

      that.defer.push(function()
      {
        return OriginDefer(CBHook, time);
      })
    }
  ,
  DeferCascade: function(callback)
    {
      var that = this.escape();
      that.log("DeferCascade", callback);
      phoxy._.enjs.AlreadyFiredUp(that);

      if (typeof that.cascade === 'undefined')
        that.cascade = [];

      that.cascade.push(callback);
    }
  ,
  AlreadyFiredUp: function(that)
  {
    if (that.fired_up)
    {
      phoxy.Log("You can't invoke this.Defer... methods after rendering finished.\
Because parent cascade callback already executed, and probably you didn't expect new elements on your context.\
Check if you call this.Defer... on DOM(jquery) events? Thats too late. (It mean DOM event exsist -> Render completed).\
In that case use phoxy.Defer methods directly. They context-dependence free.");
      debugger; // already finished
    }
  }
};