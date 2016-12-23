phoxy._.module.design.enjs =
{
  init: function(success, error)
  {
    phoxy._.script_loader.LoadScript(
      [
        '/enjs.js',
        '/phoxy/client/refactor/enjs/overload.js'
      ],
      function()
      {
        success();
      })
  }
};
