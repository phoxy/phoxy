phoxy._TimeSubsystem =
{
  Defer : function(callback, time)
    {
      if (time == undefined)
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
      phoxy.Defer.call(this, function()
      {
        phoxy.Defer.call(this, callback);
      }, time);
    }
};

phoxy._.time =
{
  WaitFor : function(callback_condition, callback, timeout, check_every)
    {
      var
        check_timeout = 60, // 1 minute for render to complete
        check_delay = 500; // check every 500ms

      if (timeout !== undefined)
        check_timeout = timeout;
      if (check_every !== undefined)
        check_delay = check_every;

      var func = function()
      {
        if (!callback_condition())
          return;
        callback();
      }
      if (callback_condition())
        return func();

      function WaitAndCallCountDown( i )
      {
        if (i <= 0)
          return func();

        phoxy.Defer(function()
        {
          if (callback_condition())
            i = 0;
          WaitAndCallCountDown(i - 1);
        }, check_delay);
      }

      WaitAndCallCountDown(check_timeout * 1000 / check_delay);
    }
  ,
  Appeared : function(jquery_selector, callback, timeout, call_delay)
    {
      function Div()
      {
        return document.getElementById(jquery_selector);
      }
      function IsDivAppeared()
      {
        return Div() !== null;
      }

      phoxy.Defer(function()
      {
        phoxy._.time.WaitFor(IsDivAppeared, function()
        {
          phoxy.DDefer.call(Div(), callback, call_delay);
        }, timeout)
      });
    }
  ,
  Disappeared : function(jquery_selector, callback, timeout, call_delay)
    {
      function IsDivDisappeared()
      {
        return document.getElementById(jquery_selector) === null;
      }

      phoxy.Defer(function()
      {
        phoxy._.time.WaitFor(IsDivDisappeared, function()
        {
          phoxy.DDefer(callback, call_delay);
        }, timeout);
      });
    }
}