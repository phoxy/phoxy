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
    if (--escape.recursive === 0)
    {
      phoxy.Log(9, "phoxy.FireUp", [escape.name, escape]);
      escape.fired_up = true;
      for (var k in escape.cascade)
        if (typeof (escape.cascade[k]) === 'function')
            escape.cascade[k].apply(this);
      if (typeof(escape.on_complete) === 'function')
        escape.on_complete();
    }
  }

  EJS.Canvas.prototype.hook_first = function(result)
  {
    while (true)
    {
      if (typeof root === 'undefined')
        var root = result;
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
      if (typeof callback === 'function')
        callback.call(this); // Local fancy context
      phoxy.RenderCalls--;

      that.CheckIsCompleted.call(that.across);
    }

    that.Append(phoxy.DeferRender(ejs, data, CBHook, tag));
    return "<!-- <%= %> IS OBSOLETE. Refactor " + that.name + " -->";
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
      if (typeof callback === 'function')
        callback.call(that.across);
      that.CheckIsCompleted.call(that.across);
    }

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

    if (typeof that.cascade === 'undefined')
      that.cascade = [];

    that.cascade.push(callback);
  }
}