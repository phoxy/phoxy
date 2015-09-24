phoxy._LegacyLand =
{
  ChangeHash : function(hash)
    {
      phoxy.Log(2, "phoxy.ChangeHash is deprecated since v1.4.1, please use phoxy.ChangeURL");
      phoxy.ChangeURL(hash);
    }
}

phoxy._.deprecated = {
  IsObjectOptionalDetected : function()
    {
      if (arguments.length !== 3)
        return false;
      if (typeof callback === 'function')
        return false;
      if (typeof callback === 'undefined')
        return false;
      return true;
    }
  ,
  ObjectOptional : function(method, args)
    {
      var url = args[0];
      var objopt = args[1];
      var callback = args[2];

      phoxy.Log(1, "Object optional IS deprecated. Look at #91");
      if (typeof url !== 'string')
        return phoxy.Log(0, "Failed to soft translate call");

      if (typeof objopt !== 'undefined')
        url = [url].concat(objopt);

      return method.call(this, url, callback);
    }
  ,
  ObjectOptionalRelaunch : function(method, args)
    {
      if (!phoxy._.deprecated.IsObjectOptionalDetected.apply(this, args))
        return false;
      phoxy._.deprecated.ObjectOptional(method, args);
      return true;
    }
}