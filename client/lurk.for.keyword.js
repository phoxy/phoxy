phoxy._.reactor.autoload =
{
  registered_keywords: ['data']
  ,
  Init: function()
  {
    phoxy._.reactor.add_queue('autoload', 'warming_reactor');
    phoxy._.reactor.add_reaction('autoload', phoxy._.reactor.autoload.CheckObject, false, console.log);
  }
  ,
  IgnoreKeyword: function(keyword)
  {

  }
  ,
  CheckObject: function(obj, success, error)
  {
    var object_keys = Object.keys(obj);
    var i = 0;

    function next()
    {
      if (i == object_keys.length)
        return success(obj);

      var keyword = object_keys[i++];

      phoxy._.reactor.autoload.IsKeywordKnown(keyword, next, load_keyword);
    }

    function load_keyword(keyword)
    {
      phoxy._.reactor.autoload.TryLoadNewKeyword(keyword, next, error);
    }

    next();
  }
  ,
  IsKeywordKnown: function(keyword, success, error)
  {
    if (-1 == phoxy._.reactor.autoload.registered_keywords.indexOf(keyword))
      return error(keyword);
    return success();
  }
  ,
  TryLoadNewKeyword: function(keyword, success, error)
  {

  }
}

phoxy._.reactor.autoload.Init();
