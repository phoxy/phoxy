phoxy.time =
{
  Defer : function(callback, time)
    {
      if (time === undefined)
        time = 0;
      if (typeof callback !== 'function')
        return phoxy.Log(0, "phoxy.Defer: Callback not a function", callback);

      var func = callback;
      func.bind(this);

      if (time === -1)
        func();
      else
        setTimeout(func, time);
    }
  ,
  DDefer : function(callback, time)
    {
      phoxy.Defer.call(this, function ddefer_callback()
      {
        phoxy.Defer.call(this, callback);
      }, time);
    }
};

phoxy._.time =
{
  WaitFor : function(callback_condition, callback, timeout, check_every)
    {
      if (callback_condition())
        return callback();

      var
        check_timeout = phoxy.state.wait.timeout_seconds, // 1 minute for render to complete
        check_delay = phoxy.state.wait.check_every_ms; // check every 500ms

      if (timeout !== undefined)
        check_timeout = timeout;

      if (check_every !== undefined)
        check_delay = check_every;

      function required_event_occured()
      {
        if (!callback_condition())
          return;
        callback();
      }

      function WaitAndCallCountDown( i )
      {
        if (i <= 0)
          return required_event_occured();

        phoxy.Defer(function waiting_for_event()
        {
          if (callback_condition())
            i = 0;
          WaitAndCallCountDown(i - 1);
        }, check_delay);
      }

      WaitAndCallCountDown(check_timeout * 1000 / check_delay);
    }
  ,
  Appeared : function(dom_element_id, callback, timeout, call_delay)
    {
      function IsDivAppeared()
      {
        return phoxy._.render.Div(dom_element_id) !== null;
      }

      phoxy._.time.DefaultWaitBehaviour(IsDivAppeared, callback, timeout, call_delay);
    }
  ,
  Disappeared : function(dom_element_id, callback, timeout, call_delay)
    {
      function IsDivDisappeared()
      {
        return phoxy._.render.Div(dom_element_id) === null;
      }

      phoxy._.time.DefaultWaitBehaviour(IsDivDisappeared, callback, timeout, call_delay);
    }
  ,
  DefaultWaitBehaviour : function(check_function, callback, timeout, call_delay)
    {
      if (typeof call_delay === 'undefined')
        call_delay = -1;

      phoxy._.time.WaitFor(check_function, function phoxy_time_wait_finished()
      {
        phoxy.Defer(callback, call_delay);
      }, timeout);
    }
}
