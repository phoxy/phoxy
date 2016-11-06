phoxy._.reactor.default_reagents =
{
  failure_on_recept_add: function()
  {
    throw "Failure on recept addon";
  }
  ,
  sucess_on_recept_add: function()
  {

  }
};

phoxy._.reactor.default_reagents.apply = function(where, method)
{
  return phoxy._.reactor[where].call
  (
    phoxy._.reactor
    , method
    , false
    , phoxy._.reactor.default_reagents.sucess_on_recept_add
    , phoxy._.reactor.default_reagents.failure_on_recept_add
  );
}

phoxy._.reactor.default_reagents.apply('add_pre_reaction',
  function handle_error_keyword(obj, success, error)
  {
    if (typeof obj.error === 'undefined')
      return success(obj);

    console.log("Server returned error", obj.error);
    error(obj);
  });

phoxy._.reactor.default_reagents.apply('add_pre_reaction',
  function handle_script_keyword(obj, success, error)
  {
    if (typeof obj.script === 'undefined')
      return success(obj);

    phoxy._.script_loader.LoadScript(obj.script, function script_loaded()
    {
      success(obj);
    }, error);
  });

phoxy._.reactor.default_reagents.apply('add_pre_reaction',
  function handle_routeline_keyword(obj, success, error)
  {
    if (typeof obj.routeline === 'undefined')
      return success(obj);

    throw "TODO: Handle routeline keyword";
  });


phoxy._.reactor.default_reagents.apply('add_now_reaction',
  function handle_design_keyword(obj, success, error)
  {
    if (typeof obj.design === 'undefined')
      return success(obj);

    throw "TODO: Handle design keyword";
  });
