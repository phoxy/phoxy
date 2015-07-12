phoxy._EarlyStage.Require = function()
{
  debugger;
  phoxy._ApiSubsystem.ajax(phoxy.prestart.config || "api/phoxy", function(response)
  {
    data = JSON.parse(response);
    phoxy.config = data;
    if (typeof phoxy.prestart.OnBeforeCompile == 'function')
      phoxy.prestart.OnBeforeCompile();

    phoxy._EarlyStage.Compile();
    if (typeof phoxy.config.verbose != 'undefined')
      phoxy.state.verbose = phoxy.config.verbose;

    if (typeof phoxy.prestart.OnAfterCompile == 'function')
      phoxy.prestart.OnAfterCompile();

    phoxy.state.conf_loaded = true;
  })

  function NextStep()
  {
    if (typeof requirejs == 'undefined')
      if (phoxy.state.compiled)
        return phoxy.Defer(arguments.callee, 10);
      else
        return phoxy._TimeSubsystem.Defer(arguments.callee, 10);

    requirejs.config(
    {
      waitSeconds: 60
    });

    phoxy._EarlyStage.CriticalRequire();
  }
  NextStep();
}

phoxy._EarlyStage.CriticalRequire = function()
{
  require
  (
    phoxy._EarlyStage.sync_require,
    function()
    {
      phoxy._EarlyStage.DependenciesLoaded();
    }
  );

  require
  (
    phoxy._EarlyStage.async_require,
    function() {}
  );
};

phoxy._EarlyStage.DependenciesLoaded = function()
{
  if (!phoxy.state.conf_loaded) // wait until phoxy configuration loaded
    return setTimeout(arguments.callee, 10);

  phoxy.OverloadEJSCanvas();
  requirejs.config({baseUrl: phoxy.Config()['js_dir']});

  var initial_client_code = 0;

  if (typeof phoxy.prestart.OnBeforeFirstApiCall == 'function')
    phoxy.prestart.OnBeforeFirstApiCall();
  // Invoke client code
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++)
    if (scripts[i].getAttribute('phoxy') == null)
      continue;
    else
    {
      initial_client_code++;
      phoxy.ApiRequest(
        scripts[i].getAttribute('phoxy'),
        function()
        {
          phoxy.Defer(function()
          { // Be sure that zero reached only once
            if (--initial_client_code)
              return;
            if (typeof phoxy.prestart.OnInitialClientCodeComplete == 'function')
              phoxy.prestart.OnInitialClientCodeComplete();
          });
        });
    }
};

phoxy._EarlyStage.Compile = function()
{
  for (var k in phoxy._EarlyStage.systems)
  {
    var system_name = phoxy._EarlyStage.systems[k];
    if (system_name === undefined)
      continue; // skip compilation

    for (var func in phoxy[system_name])
      if (typeof phoxy[func] != 'undefined')
        throw "Phoxy method mapping failed on '" + func + '. Already exsists.';
      else
        phoxy[func] = phoxy[system_name][func];
    delete phoxy[system_name];
  }

  if (phoxy.prestart.sync_cascade)
  {
    phoxy.state.sync_cascade = true;
    phoxy.RenderStrategy = phoxy.SyncRender_Strategy;
  }
  else
  {
    phoxy.state.sync_cascade = false;
    phoxy.RenderStrategy = phoxy.AsyncRender_Strategy;
  }

  phoxy.state.compiled = true;
};
