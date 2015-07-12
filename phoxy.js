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
      'early.js': undefined,
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
  Prepare: function()
  {
    if (typeof requirejs == 'undefined')
      return setTimeout(arguments.callee, 10);

    requirejs.config(
    {
      waitSeconds: 60
    });

    if (!phoxy.prestart.wait)
      phoxy._EarlyStage.EntryPoint();
    else
      if (typeof phoxy.prestart.OnWaiting == 'function')
        phoxy.prestart.OnWaiting();
  }
  ,
  EntryPoint: function()
  {
    var dir = phoxy.prestart.subsystem_dir || phoxy._EarlyStage.subsystem_dir;
    var require_systems = [];

    for (var k in phoxy._EarlyStage.systems)
      require_systems.push(dir + "/" + k);

    phoxy._EarlyStage.CriticalRequire(require_systems);
  }
  ,
  Ready: function()
  {
    if (typeof phoxy._EarlyStage.DependenciesLoaded == 'undefined')
      return setTimeout(arguments.callee, 10);

    phoxy._EarlyStage.DependenciesLoaded();
  }
  ,
  CriticalRequire : function(require_systems)
  {
    require
    (
      require_systems,
      function()
      {
        phoxy._EarlyStage.LoadConfig();
      }
    );

    require
    (
      phoxy._EarlyStage.sync_require,
      function()
      {
        phoxy._EarlyStage.Ready();
      }
    );

    require
    (
      phoxy._EarlyStage.async_require,
      function() {}
    );
  }
}

phoxy._EarlyStage.Prepare();