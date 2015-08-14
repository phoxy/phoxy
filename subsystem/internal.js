phoxy._InternalCode =
{
  ChangeURL : function (url)
    {
      url = phoxy.ConstructURL(url);

      phoxy.Log(4, "History push", url);
      if (url[0] != '/')
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

phoxy._InternalCode._ = {};
phoxy._InternalCode._.internal =
{
  Load : function( )
    {
      phoxy.state.loaded = true;

      phoxy._.click.InitClickHook();

      //if (!phoxy._.prestart.skip_initiation)
      //  phoxy.ApiRequest(hash);
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
    "DEBUG",
  ],
  error_methods :
  [
    "error",
    "error",
    "warn",
    "info",
    "log",
    "debug",
  ]
};