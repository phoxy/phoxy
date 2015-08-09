phoxy._.api.keyword.exception = function(answer, callback)
{
  phoxy.Log(4, "Server thrown exception:", answer.exception);
  var handler = phoxy.state.exception.handlers[answer.exception];

  if (handler === undefined)
    return phoxy.Log(0, "Hot-patching of exception handler yet not supported", [answer.exception]);

  handler(answer, callback);
}