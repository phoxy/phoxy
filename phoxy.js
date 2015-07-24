if (typeof phoxy === 'undefined')
  phoxy = {};
if (typeof phoxy.state !== 'undefined')
  if (phoxy.state.loaded == true)
    throw "Phoxy already loaded. Dont mess with this";


var phoxy =
{
  config : false,
  state :
  {
    runlevel: 0,
    /* Runlevels description:
      0 - phoxy ready for instancing but currently not active
      1 - phoxy early stage code ready
      2 - ready for compilation
      3 - compilation finished, configuration fetched
      4 - initial client code executed
      Other levels optional
    */
    loaded : false,
    hash : false,
    ajax :
    {
      nesting_level : 0,
      active_id : 0,
      active : [],
    },
    verbose : typeof phoxy.verbose === 'undefined' ? 10 : phoxy.verbose,
    early:
    {
      require: 0,
      loaded: 0,
      optional:
      {
        initial: 0,
      }
    }
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
      'early.js': undefined,
      'time.js': '_TimeSubsystem',
      'render.js': '_RenderSubsystem',
      'api.js': '_ApiSubsystem',
      'internal.js': '_InternalCode',
      'click.js': '_ClickHook',
      'legacy.js': '_LegacyLand',
      'enjs.js': '_OverrideENJS',
    }
  ,
  sync_require:
    [
      "enjs", // composer now IS required
    ]
  ,
  async_require:
    [
    ]
  ,
  Prepare: function()
  {
    if (typeof requirejs === 'undefined')
      return setTimeout(arguments.callee, 10);
    phoxy.state.runlevel = 0.5;

    requirejs.config(
    {
      waitSeconds: 60
    });

    if (!phoxy.prestart.wait)
      phoxy._EarlyStage.EntryPoint();
    else
      if (typeof phoxy.prestart.OnWaiting === 'function')
        phoxy.prestart.OnWaiting();
  }
  ,
  EntryPoint: function()
  {
    phoxy.state.runlevel = 1;
    var dir = phoxy.prestart.subsystem_dir || phoxy._EarlyStage.subsystem_dir;
    var require_systems = [];

    for (var k in phoxy._EarlyStage.systems)
      require_systems.push(dir + "/" + k);

    phoxy._EarlyStage.CriticalRequire(require_systems);
  }
  ,
  Ready: function()
  {
    if (typeof phoxy._EarlyStage.DependenciesLoaded === 'undefined')
      return setTimeout(arguments.callee, 10);

    phoxy._EarlyStage.DependenciesLoaded();
  }
  ,
  CriticalRequire : function(require_systems)
  {
    // Summary move us to runlevel 2, ready for compilation
    requirejs.onResourceLoad = function()
    {
      phoxy.state.early.loaded++;
    }

    require
    (
      require_systems,
      function()
      {
        phoxy.state.runlevel += 0.5;
        phoxy._EarlyStage.LoadConfig();
      }
    );

    require
    (
      phoxy._EarlyStage.sync_require,
      function()
      {
        phoxy.state.runlevel += 0.5;
        phoxy._EarlyStage.Ready();
      }
    );

    require
    (
      phoxy._EarlyStage.async_require,
      function() {}
    );
  }
  ,
  LoadingPercentage : function()
    {
      var phoxy_itself = 1;
      var config_load = 1;
      var system_count = Object.keys(phoxy._EarlyStage.systems).length;
      var sync_count = phoxy._EarlyStage.sync_require.length;
      var async_count = phoxy._EarlyStage.async_require.length;

      var optional_count = 0;

      for (var k in phoxy.state.early.optional)
        optional_count += phoxy.state.early.optional[k];

      phoxy.state.early.require =
        phoxy_itself
          + config_load
          + system_count
          + sync_count
          + async_count
          + optional_count;

      var percent = 100 * phoxy.state.early.loaded / phoxy.state.early.require;
      if (percent > 100)
        percent = 100;

      return percent;
    }
}

phoxy._EarlyStage.Prepare();