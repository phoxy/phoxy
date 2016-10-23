phoxy._ = {};
phoxy._.module = {};

phoxy._.script_loader = script_loader;


phoxy._.script_loader.LoadScript('/phoxy/client/ajax.js')
phoxy._.script_loader.LoadScript('/phoxy/client/module.loader.js', function()
{
  phoxy._.script_loader.LoadScript('/phoxy/client/promises.js');
  phoxy._.script_loader.LoadScript('/phoxy/client/reactor.js');
  phoxy._.script_loader.LoadScript('/phoxy/client/api.js');
});
