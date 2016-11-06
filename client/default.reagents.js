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

phoxy._.reactor.default_reagents.apply('add_now_reaction',
  function error(obj, success, error)
  {
    debugger;

    if (typeof obj.error === 'undefined')
      return success(obj);
  });
