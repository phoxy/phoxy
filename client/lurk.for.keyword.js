phoxy._.reactor.autoload =
{
  registered_keywords:
  [
    'data'
    , 'error'
    , 'script'
    , 'routeline'
    , 'cache'
  ]
  ,
  keyword_autoload_location: '/on_unknown_keyword'
  ,
  init: function()
  {
    phoxy._.reactor.add_queue('autoload', 'warming_reactor');
    phoxy._.reactor.add_reaction('autoload', phoxy._.reactor.autoload.update_lurk_location, false, console.log);
    phoxy._.reactor.add_reaction('autoload', phoxy._.reactor.autoload.check_object, false, console.log);
  }
  ,
  ignore_keyword: function(keyword)
  {
    phoxy._.reactor.registered_keywords.push(keyword);
  }
  ,
  update_lurk_location: function(obj, success, error)
  {
    if (typeof obj.keyword_autoload_location !== 'undefined')
      phoxy._.reactor.autoload.keyword_autoload_location
        = obj.keyword_autoload_location;

    success(obj);
  }
  ,
  check_object: function(obj, success, error)
  {
    var object_keys = Object.keys(obj);
    var i = 0;

    function next()
    {
      if (i == object_keys.length)
        return success(obj);

      var keyword = object_keys[i++];

      phoxy._.reactor.autoload.is_keyword_known(keyword, next, load_keyword);
    }

    function load_keyword(keyword)
    {
      phoxy._.reactor.autoload.try_load_new_keyword(keyword, next, error);
    }

    next();
  }
  ,
  is_keyword_known: function(keyword, success, error)
  {
    if (-1 == phoxy._.reactor.autoload.registered_keywords.indexOf(keyword))
      return error(keyword);
    return success();
  }
  ,
  try_load_new_keyword: function(keyword, success, error)
  {
    phoxy._.api.read([phoxy._.reactor.autoload.keyword_autoload_location, keyword]
      ,
      function on_server_respond_with_keyword()
      {
        debugger;
      }
      ,
      function on_server_didnt_respond_keyword()
      {
        error("Server doesn't know keyword", keyword);
      })
  }
}

phoxy._.reactor.autoload.init();
