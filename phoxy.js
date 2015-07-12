if (typeof phoxy == 'undefined')
  phoxy = {};
if (typeof phoxy.state !== 'undefined')
  if (phoxy.state.loaded == true)
    throw "Phoxy already loaded. Dont mess with this";


var phoxy =
{
  config : false,
  state :
  {
    loaded : false,
    hash : false,
    ajax :
    {
      nesting_level : 0,
      active_id : 0,
      active : [],
    },
    verbose : typeof phoxy.verbose == 'undefined' ? 10 : phoxy.verbose,
  },
  plugin : {},
  prestart: phoxy,
  error_names :
  [
    "FATAL",
    "ERROR",
    "WARNING",
    "INFO",
    "DEBUG",
  ],
};

phoxy._EarlyStage =
{
  subsystem_dir: '/phoxy/subsystem'
  ,
  systems:
    {
      'time.js': '_TimeSubsystem', 
      'render.js': '_RenderSubsystem',
      'api.js': '_ApiSubsystem',
      'internal.js': '_InternalCode',
      'enjs.js': undefined,
    }
  ,
  sync_require: 
    [
      "libs/EJS/ejs.js",
    ]
  ,
  async_require:
    [
    ]
  ,
  EntryPoint: function()
  {
    var dir = phoxy.prestart.subsystem_dir || phoxy._EarlyStage.subsystem_dir;
    var require_systems = [];

    for (var k in phoxy._EarlyStage.systems)
      require_systems.push(dir + "/" + k);

    require(require_systems, phoxy._EarlyStage.Require);
  }
  ,
  Require: function()
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
  ,
  CriticalRequire: function()
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
    }
  ,
  DependenciesLoaded: function()
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
    }
  ,
  Compile: function()
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
    }
};


if (!phoxy.prestart.wait)
  phoxy._EarlyStage.EntryPoint();
else
{
  if (typeof phoxy.prestart.OnWaiting == 'function')
    phoxy.prestart.OnWaiting();
}
