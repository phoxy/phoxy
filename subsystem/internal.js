phoxy.internal =
{
  ChangeURL : function (url)
    {
      url = phoxy.ConstructURL(url);

      phoxy.Log(4, "History push", url);
      if (url[0] !== '/')
        url = '/' + url;
      history.pushState({}, document.title, url);

      return false;
    }
  ,
  Reset : function (url)
    {
      if ((url || true) === true)
        return location.reload();
      location = url;
    }
  ,
  Config : function()
    {
      return phoxy._.config;
    }
  ,
  Log : function(level)
    {
      if (phoxy.state.verbose < level)
        return;

      var error_names = phoxy._.internal.error_names;
      var errorname = error_names[level < error_names.length ? level : error_names.length - 1];

      var args = [];
      for (var v in arguments)
        args.push(arguments[v]);
      args[0] = errorname;

      var error_methods = phoxy._.internal.error_methods;
      var method = error_methods[level < error_methods.length ? level : error_methods.length - 1];

      console[method].apply(console, args);
      if (level === 0)
        debugger;
    }
  ,
  Override: function(method_name, new_method)
    {
      return phoxy._.internal.Override(phoxy, method_name, new_method);
    }
};

phoxy._.internal =
{
  Load : function( )
    {
      phoxy.state.loaded = true;

      phoxy._.click.InitClickHook();
    }
  ,
  GenerateUniqueID : function()
    {
      var ret = "";
      var dictonary = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < 10; i++)
        ret += dictonary.charAt(Math.floor(Math.random() * dictonary.length));

      return "phoxy_" + ret;
    }
  ,
  DispatchEvent : function(dom_element_id, event_name)
    {
      var that = phoxy._.render.Div(dom_element_id);

      if (document.createEvent)
      {
        event = document.createEvent("HTMLEvents");
        event.initEvent(event_name, true, true);
        event.eventName = event_name;
        that.dispatchEvent(event);
      }
      else
      {
        event = document.createEventObject();
        event.eventType = event_name;
        event.eventName = event_name;
        that.fireEvent("on" + event.eventType, event);
      }
    }
  ,
  HookEvent : function(dom_element_id, event_name, callback)
    {
      var that = phoxy._.render.Div(dom_element_id);

      that.addEventListener(event_name, callback);
    }
  ,
  Override : function(object, method_name, new_method)
    {
      var origin = object[method_name];
      object[method_name] = new_method;
      object[method_name].origin = origin;
    }
  ,
  error_names :
  [
    "FATAL",
    "ERROR",
    "WARNING",
    "INFO",
    "DEBUG"
  ],
  error_methods :
  [
    "error",
    "error",
    "warn",
    "info",
    "log",
    "debug"
  ]
};