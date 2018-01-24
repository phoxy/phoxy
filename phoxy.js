if (typeof phoxy === 'undefined')
  phoxy = {};
if (typeof phoxy.state !== 'undefined')
  if (phoxy.state.loaded === true)
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
      active : []
    },
    verbose : typeof phoxy.verbose === 'undefined' ? 10 : phoxy.verbose,
    verbose_birth : typeof phoxy.verbose_birth === 'undefined' ? 1 : phoxy.verbose_birth,
    verbose_ancors : typeof phoxy.verbose_ancors === 'undefined' ? 1 : phoxy.verbose_ancors,
    early:
    {
      require: 0,
      loaded: 0,
      optional:
      {
        initial: 0
      }
    },
    exception:
    {
      cases: {},
      handlers: {}
    },
    cascade_debug: typeof phoxy.cascade_debug === 'undefined' ? 1 : phoxy.cascade_debug,
    sticky_cascade_strategy: typeof phoxy.sticky_cascade_strategy === 'undefined' ? 1 : phoxy.sticky_cascade_strategy,
    sync_foreach_design: typeof phoxy.sync_foreach_design == 'undefined' ? 1 : phoxy.sync_foreach_design,
    async_foreach_request: typeof phoxy.sync_foreach_request == 'undefined' ? 1 : phoxy.sync_foreach_request,
    cascade_foreach_scouts: typeof phoxy.cascade_foreach_scouts == 'undefined' ? 6 : phoxy.cascade_foreach_scouts,
    cascade_foreach_chunks: typeof phoxy.cascade_foreach_chunks == 'undefined' ? 1 : phoxy.cascade_foreach_chunks,
    birth:
    {
      active: {},
      finished: {}
    },
    wait:
    {
      timeout_seconds: 20,
      check_every_ms: 200,
    },
    render:
    {
      sheduled: false,
      dom_fps: typeof phoxy.render_dom_fps == 'undefined' ? 10 : phoxy.render_dom_fps,
      queue: [],
    },
  },
  _:
  {
    plugin : {},
    prestart: phoxy
  } // for internal code
};

phoxy._.EarlyStage =
{
  subsystem_dir: '/phoxy/subsystem'
  ,
  systems:
    {
      'early.js': undefined,
      'legacy.js': 'legacy',
      'time.js': 'time',
      'render.js': 'render',
      'api.js': 'api',
      'internal.js': 'internal',
      'click.js': 'click',
      'enjs_overload.js': 'OverrideENJS'
    }
  ,
  sync_require:
    [
    ]
  ,
  async_require:
    [
      "enjs" // composer now IS required
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

      if (phoxy._.prestart.subsystem_dir)
        phoxy._.EarlyStage.subsystem_dir = phoxy._.prestart.subsystem_dir;

      if (!phoxy._.prestart.wait)
        phoxy._.EarlyStage.EntryPoint();
      else
        if (typeof phoxy._.prestart.OnWaiting === 'function')
          phoxy._.prestart.OnWaiting();
    }
  ,
  EntryPoint: function()
    {
      phoxy.state.runlevel = 1;
      var dir = phoxy._.EarlyStage.subsystem_dir;
      var require_systems = [];

      for (var k in phoxy._.EarlyStage.systems)
        require_systems.push(dir + "/" + k);

      phoxy._.EarlyStage.CriticalRequire(require_systems);
    }
  ,
  Ready: function()
    {
      if (typeof phoxy._.EarlyStage.DependenciesLoaded === 'undefined')
        return setTimeout(arguments.callee, 10);

      phoxy._.EarlyStage.DependenciesLoaded();
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
        [require_systems[0]],
        function on_require_early_stage()
        {
          phoxy._.EarlyStage.LoadConfig();
        }
      );

      require
      (
        require_systems,
        function on_require_systems()
        {
          phoxy.state.runlevel += 0.5;
          phoxy._.EarlyStage.critpath_ready = true;
        }
      );

      require
      (
        phoxy._.EarlyStage.sync_require,
        function on_require_sync()
        {
          phoxy._.EarlyStage.sync_ready = true;
          phoxy.state.runlevel += 0.5;
          phoxy._.EarlyStage.Ready();
        }
      );

      require
      (
        phoxy._.EarlyStage.async_require,
        function on_require_async()
        {
          phoxy._.EarlyStage.async_ready = true;

          // Wait until final execution module is ready
          if (!phoxy._.EarlyStage.critpath_ready)
            return setTimeout(arguments.callee, 10);

          phoxy._.EarlyStage.EnterFinalExecution();
        }
      );
    }
  ,
  LoadingPercentage : function()
    {
      var phoxy_itself = 1;
      var config_load = 1;
      var system_count = Object.keys(phoxy._.EarlyStage.systems).length;
      var sync_count = phoxy._.EarlyStage.sync_require.length;
      var async_count = phoxy._.EarlyStage.async_require.length;

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
  ,
  Deprecated : function()
    {
      var args = arguments;
      return function deprecated_method_report()
      {
        phoxy.Log.apply(phoxy, args);
      };
    }
}

phoxy._.EarlyStage.Prepare();

if (!Object.keys)
  Object.keys = function(obj)
  {
    var keys = [];

    for (var i in obj)
      if (obj.hasOwnProperty(i))
        keys.push(i);

    return keys;
  };
