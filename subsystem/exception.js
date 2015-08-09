phoxy._.api.keyword.exception = function(answer, callstack)
{
  var exception = answer.exception;
  phoxy._.api.keyword.exception.change_state(exception);

  phoxy.Log(3, "Server thrown exception:", exception);
  var handler = phoxy.state.exception.handlers[exception];

  if (handler === undefined)
    return phoxy.Log(0, "Hot-patching of exception handler yet not supported", [exception]);

  function catch_exception()
  {
    phoxy.ApiRequest(answer.origin, callstack);
  }

  handler(catch_exception, phoxy.state.exception.cases[exception], answer);
}

phoxy._.api.keyword.exception.change_state = function(exception)
{
  if (phoxy.state.exception.cases[exception] === undefined)
    phoxy.state.exception.cases[exception] =
    {
      times: 0,
    };

  phoxy.state.exception.cases[exception].times++;
}