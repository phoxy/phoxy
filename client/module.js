phoxy._ = {};

phoxy._.script_loader = script_loader;

phoxy._.script_loader.LoadScript('/phoxy/client/ajax.js')
phoxy._.script_loader.LoadScript('/phoxy/client/module.loader.js', function()
{
  debugger;
});
