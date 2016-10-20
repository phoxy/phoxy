// todo: module initialisation
// loaded_module.init().then()
// which can channel requirments

phoxy._.module.loader =
{
  load_with_ajax_unloaded: function (name, success, error)
  {
    setTimeout(phoxy._.module.loader.load.bind(this, name, success, error), 0);

    if (typeof phoxy._.ajax !== 'undefined')
      phoxy._.module.loader.load = phoxy._.module.loader.load_whith_ajax_loaded;
  }
  ,
  load_with_ajax_loaded: function (name, success, error)
  {
    phoxy._.ajax.request(name, undefined, function code_loaded(script)
    {
      phoxy._.module.loader.ParseCode(script, success, error);
    }, error);
  }
  ,
  parse_code: function (script, success, error)
  {
    try
    {
      var result = eval(script);
      success(result);
    } catch (e)
    {
      error(e);
    }
  }
  ,
}

phoxy._.module.loader.load = phoxy._.module.loader.load_with_ajax_unloaded;
