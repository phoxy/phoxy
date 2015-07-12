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
    debugger;
    if (typeof requirejs == 'undefined')
      return setTimeout(arguments.callee, 10);

    requirejs.config(
    {
      waitSeconds: 60
    });

    phoxy._EarlyStage.Ready();
  }
  ,
  EntryPoint: function()
  {
    var dir = phoxy.prestart.subsystem_dir || phoxy._EarlyStage.subsystem_dir;
    var require_systems = [];

    for (var k in phoxy._EarlyStage.systems)
      require_systems.push(dir + "/" + k);

    require(require_systems, function()
    {
      phoxy._EarlyStage.CriticalRequire();
      phoxy._EarlyStage.Require();
    });
  }
  ,
  Ready: function()
  {
    if (!phoxy.prestart.wait)
      phoxy._EarlyStage.EntryPoint();
    else
      if (typeof phoxy.prestart.OnWaiting == 'function')
        phoxy.prestart.OnWaiting();
  }
}

phoxy._EarlyStage.Prepare();