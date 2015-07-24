phoxy._LegacyLand =
{
  ChangeHash : function(hash)
  {
    phoxy.Log(2, "phoxy.ChangeHash is deprecated since v1.4.1, please use phoxy.ChangeURL");
    phoxy.ChangeURL(hash);
  }
}

phoxy._LegacyLand._ = {};
phoxy._LegacyLand._.deprecated = {
  IsObjectOptionalDetected(arguments)
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
    phoxy.Log(1, "Object optional IS deprecated. Look at #91");
    if (typeof url !== 'string')
      return phoxy.Log(0, "Failed to soft translate call");

    if (typeof args[1] !== 'undefined')
      url = [url].concat(args[1]);

    return method.call(this, url, args[2]);
  }
}