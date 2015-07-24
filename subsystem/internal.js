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
        location.reload();
      location.reload(url);
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
      else if (level === 2)
        method = "warn";
      else if (level === 3)
        method = "info";
      else
        method = "debug";
      console[method].apply(console, args);
      if (level == 0)
        debugger;
    }
};

phoxy._InternalCode._internal =
{
  Load : function( )
    {
      phoxy.state.loaded = true;

      phoxy._click.InitClickHook();

      //if (!phoxy.prestart.skip_initiation)
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
};