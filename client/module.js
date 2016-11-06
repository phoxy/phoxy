phoxy._ = {};
phoxy._.module = {};

phoxy._.script_loader = script_loader;

phoxy._.script_loader.LoadScript
(
  [
    '/phoxy/client/ajax.js'
    , '/phoxy/client/module.loader.js'
  ]
, function loading_reactor()
  {
    phoxy._.script_loader.LoadScript
    (
      [
        '/phoxy/client/promises.js'
        ,
        [
          '/phoxy/client/reactor.js'
          , '/phoxy/client/default.reagents.js'
          , '/phoxy/client/lurk.for.keyword.js'
        ]
        , '/phoxy/client/api.js'
      ]
      ,
      function api_ready()
      {

      }
    );
  });
