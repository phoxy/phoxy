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
  phoxy._.EarlyStage.ajax(phoxy._.prestart.config || "api/phoxy", function early_conf_loaded(response)
  {
    phoxy.state.early.loaded++;
    var data = JSON.parse(response);
    phoxy._.config = data;
    phoxy.state.conf_loaded = true;
  })
}

phoxy._.EarlyStage.DependenciesLoaded = function()
{
  if (phoxy.state.runlevel < 2)
    return setTimeout(arguments.callee, 10);
  if (!phoxy.state.conf_loaded) // wait until phoxy.Config()uration loaded
    return setTimeout(arguments.callee, 10);
  phoxy.state.runlevel += 0.5; // because config downloaded

  if (typeof phoxy._.prestart.OnBeforeCompile === 'function')
    phoxy._.prestart.OnBeforeCompile();

  phoxy._.EarlyStage.Compile();
  if (typeof phoxy.Config().verbose !== 'undefined')
    phoxy.state.verbose = phoxy.Config().verbose;

  if (typeof phoxy._.prestart.OnAfterCompile === 'function')
    phoxy._.prestart.OnAfterCompile();

  phoxy._.EarlyStage.PreloadInitialClientCode();
  phoxy._.EarlyStage.HomePageLoad();

  // Entering runlevel 3, compilation finished
  phoxy.state.runlevel += 0.5;
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

phoxy._.EarlyStage.PreloadInitialClientCode = function()
{
  if (typeof phoxy._.prestart.OnBeforeFirstApiCall === 'function')
    phoxy._.prestart.OnBeforeFirstApiCall();

  phoxy._.EarlyStage.initial_client_code = 0;
  phoxy._.EarlyStage.total_amount = 0;

  phoxy._.EarlyStage.initial_preloaded = [];

  function InitialCodePreload(script)
  {
    phoxy.AJAX(script.getAttribute('phoxy'), function on_intial_code_preloaded(response)
    {
      phoxy._.EarlyStage.initial_preloaded.push(response);
    });
  }

  // Invoke client code
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++)
    if (scripts[i].getAttribute('phoxy') === null)
      continue;
    else
    {
      phoxy._.EarlyStage.initial_client_code++;
      phoxy._.EarlyStage.total_amount++;
      InitialCodePreload(scripts[i]);
    }
}

phoxy._.EarlyStage.EnterFinalExecution = function()
{
  if (phoxy.state.runlevel < 3)
    return setTimeout(arguments.callee, 50);

  phoxy._.enjs.OverloadENJSCanvas();
  requirejs.config({baseUrl: phoxy.Config()['js_dir']});

  if (typeof phoxy._.prestart.OnExecutingInitialClientCode === 'function')
    phoxy._.prestart.OnExecutingInitialClientCode();

  phoxy._.EarlyStage.ExecuteInitialClientCode();
}

phoxy._.EarlyStage.ExecuteInitialClientCode = function()
{
  if (phoxy._.EarlyStage.initial_client_code == 0)
  {
    if (typeof phoxy._.prestart.OnInitialClientCodeComplete === 'function')
      phoxy._.prestart.OnInitialClientCodeComplete();
    return;
  }

  // reshedule if nothing to process
  if (phoxy._.EarlyStage.initial_client_code > 0 && phoxy._.EarlyStage.initial_preloaded.length == 0)
    return setTimeout(arguments.callee, 50);

  var code = phoxy._.EarlyStage.initial_preloaded.pop();

  phoxy.state.runlevel += 1 / phoxy._.EarlyStage.total_amount;
  phoxy.ApiAnswer(code, function when_client_code_applied()
  {
    if (--phoxy._.EarlyStage.initial_client_code)
      return;
    phoxy._.EarlyStage.ExecuteInitialClientCode();
  });
}

phoxy._.EarlyStage.HomePageLoad = function()
{
  if (phoxy._.prestart.no_home_call !== undefined)
    return;

  var home_result;
  function when_home_result_ready()
  {
    if (phoxy._.EarlyStage.initial_client_code > 0)
      return setTimeout(arguments.callee, 50);
    // Wait for initial code to complete, before execute first page code
    phoxy.ApiAnswer(home_result, phoxy._.prestart.OnFirstPageRendered);
  }


  phoxy.AJAX(location.pathname.substr(1) + location.search, function(response)
  {
    home_result = response;
    when_home_result_ready();
  });
}