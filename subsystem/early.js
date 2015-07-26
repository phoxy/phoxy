phoxy._.EarlyStage.ajax = function (url, callback, data, x)
{  // https://gist.github.com/Xeoncross/7663273
  try
  {
    x = new(window.XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
    x.open(data ? 'POST' : 'GET', url, 1);
    x.setRequestHeader('X-Lain', 'Wake up');
    x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    x.onreadystatechange = function () {
      x.readyState > 3 && callback && callback(x.responseText, x);
    };
    x.send(data)
  } catch (e)
  {
    window.console && console.log(e);
  }
};


phoxy._.EarlyStage.LoadConfig = function()
{
  phoxy._.EarlyStage.ajax(phoxy._.prestart.config || "api/phoxy", function(response)
  {
    phoxy.state.early.loaded++;
    data = JSON.parse(response);
    phoxy.config = data;
    phoxy.state.conf_loaded = true;
  })
}

phoxy._.EarlyStage.DependenciesLoaded = function()
{
  if (phoxy.state.runlevel < 2)
    return setTimeout(arguments.callee, 10);
  if (!phoxy.state.conf_loaded) // wait until phoxy configuration loaded
    return setTimeout(arguments.callee, 10);
  phoxy.state.runlevel += 0.5; // because config downloaded

  if (typeof phoxy._.prestart.OnBeforeCompile == 'function')
    phoxy._.prestart.OnBeforeCompile();

  phoxy._.EarlyStage.Compile();
  if (typeof phoxy.config.verbose != 'undefined')
    phoxy.state.verbose = phoxy.config.verbose;

  if (typeof phoxy._.prestart.OnAfterCompile == 'function')
    phoxy._.prestart.OnAfterCompile();


  phoxy.OverloadENJSCanvas();
  requirejs.config({baseUrl: phoxy.Config()['js_dir']});

  // Entering runlevel 3, compilation finished
  phoxy.state.runlevel += 0.5;

  var initial_client_code = 0;

  if (typeof phoxy._.prestart.OnBeforeFirstApiCall === 'function')
    phoxy._.prestart.OnBeforeFirstApiCall();
  // Invoke client code
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++)
    if (scripts[i].getAttribute('phoxy') === null)
      continue;
    else
    {
      initial_client_code++;
      phoxy.ApiRequest(
        scripts[i].getAttribute('phoxy'),
        function()
        {
          phoxy.state.runlevel += 1 / total_amount;
          phoxy.Defer(function()
          { // Be sure that zero reached only once
            if (--initial_client_code)
              return;
            if (typeof phoxy._.prestart.OnInitialClientCodeComplete === 'function')
              phoxy._.prestart.OnInitialClientCodeComplete();
          });
        });
    }

   var total_amount = initial_client_code;
};

phoxy._.EarlyStage.Compile = function()
{
  for (var k in phoxy._.EarlyStage.systems)
  {
    var system_name = phoxy._.EarlyStage.systems[k];
    if (system_name === undefined)
      continue; // skip compilation

    if (typeof phoxy[system_name]['_'] !== 'undefined')
    {
      for (var subsytem in phoxy[system_name]['_'])
        phoxy._[subsytem] = phoxy[system_name]._[subsytem];
      delete phoxy[system_name]['_'];
    }

    for (var func in phoxy[system_name])
      if (typeof phoxy[func] !== 'undefined')
        throw "Phoxy method mapping failed on '" + func + '. Already exsists.';
      else
        phoxy[func] = phoxy[system_name][func];
    delete phoxy[system_name];
  }

  if (phoxy._.prestart.sync_cascade)
  {
    phoxy.state.sync_cascade = true;
    phoxy._.render.RenderStrategy = phoxy._.render.SyncRender_Strategy;
  }
  else
  {
    phoxy.state.sync_cascade = false;
    phoxy._.render.RenderStrategy = phoxy._.render.AsyncRender_Strategy;
  }

  // Move bootstrapped ajax into his place
  phoxy._.internal.ajax = phoxy._.EarlyStage.ajax;

  phoxy.state.compiled = true;
};
