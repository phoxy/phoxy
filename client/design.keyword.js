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
  enjs_loaded_listeners: [],
  load_enjs: function (cb, args)
  {
    phoxy._.module.design.enjs_loaded_listeners.push([cb, args]);

    if (phoxy._.module.design.enjs_loaded_listeners.length > 1)
      return;
    phoxy._.script_loader.LoadScript
      (
        '/phoxy/client/refactor/enjs/load.js'
        ,
        function ()
        {
          // Extended check
          if (typeof phoxy._.module.design.enjs === "undefined")
            throw "Failed to load ENJS ecosystem";

          phoxy._.module.design.enjs.init(phoxy._.module.design.enjs_loaded_hook, function()
          {
            console.log("Issue during initialisation ENJS ecosystem", arguments);
          });
        }
      )
  },
  enjs_loaded_hook: function()
  {
    while (phoxy._.module.design.enjs_loaded_listeners.length > 0)
    {
      var listener = phoxy._.module.design.enjs_loaded_listeners.pop();
      listener[0].apply(null, listener[1]);
    }

    delete phoxy._.module.design.load_enjs;
    delete phoxy._.module.design.enjs_loaded_hook;
    delete phoxy._.module.design.enjs_loaded_listeners;
  }
};
