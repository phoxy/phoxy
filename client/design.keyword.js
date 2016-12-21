phoxy._.reactor.default_reagents.apply('add_now_reaction',
  function handle_design_keyword(obj, success, error)
  {
    if (typeof obj.design === 'undefined')
      return success(obj);

    if (typeof phoxy._.module.design.enjs === 'undefined')
      return phoxy._.module.design.load_enjs(arguments.callee, arguments);

    debugger;
  });

phoxy._.module.design =
{
  load_enjs: function (cb, args)
  {
    debugger;
  }
};
