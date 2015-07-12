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

      window.addEventListener('hashchange', PhoxyHashChangeCallback);
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
  GenerateUniqueID : function()
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
      if (level == 0)
        debugger;
    }
};
