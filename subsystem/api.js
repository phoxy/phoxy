phoxy._ApiSubsystem =
{
  ApiAnswer : function(answer, callback)
    {
      if (answer.error !== undefined)
        return phoxy._.api.keyword.error(answer, callback);

      if (answer.reset !== undefined)
        return phoxy._.api.keyword.reset(answer, callback);

      function ReadyForDesignRender()
      {
        phoxy._.api.IfKeyword(answer, callback, "before", phoxy._.api.ScriptsLoaded);
      }

      phoxy._.api.IfKeyword(answer, callback, "script", ReadyForDesignRender);
    }
  ,
  AJAX : function(url, callback, params)
    {
      url = phoxy.ConstructURL(url);

      var current_ajax_id = phoxy.state.ajax.active_id++;
      phoxy.state.ajax.active[current_ajax_id] = arguments;

      if (!phoxy.state.ajax.nesting_level++)
        if (typeof phoxy._.prestart.OnAjaxBegin === 'function')
          phoxy._.prestart.OnAjaxBegin(phoxy.state.ajax.active[current_ajax_id]);

      phoxy._.api.ajax(phoxy.Config()['api_dir'] + "/" + url, function(response)
        {
          data = JSON.parse(response);
          if (params == undefined)
            params = [];
          params.unshift(data);
          callback.apply(this, params);

          if (!--phoxy.state.ajax.nesting_level)
            if (typeof phoxy._.prestart.OnAjaxEnd === 'function')
              phoxy._.prestart.OnAjaxEnd(phoxy.state.ajax.active[current_ajax_id]);
          delete phoxy.state.ajax.active[current_ajax_id];
        });
    }
  ,
  ConstructURL : function(arr)
    {
      if (typeof arr === 'string')
        return arr;

      arr = arr.slice(0);
      var url = arr.shift();
      if (arr.length > 0)
        url += '(' + phoxy._.api.Serialize(arr) + ')';
      return url;
    }
  ,
  ApiRequest : function(url, callback)
    {
      if (phoxy._.deprecated.IsObjectOptionalDetected.apply(this, arguments))
        phoxy._.deprecated.ObjectOptional(phoxy.MenuCall, arguments);

      phoxy.AJAX(url, phoxy.ApiAnswer, [callback]);
    }
  ,
  MenuCall : function(url, callback)
    {
      if (phoxy._.deprecated.IsObjectOptionalDetected.apply(this, arguments))
        phoxy._.deprecated.ObjectOptional(phoxy.MenuCall, arguments);

      phoxy.ChangeURL(url);
      phoxy.ApiRequest(url, callback);
    }
}

phoxy._ApiSubsystem._ = {};
phoxy._ApiSubsystem._.api =
{
  IfKeyword : function(answer, callback, keyword, next)
    {
      if (answer[keyword] !== undefined)
        phoxy._.api.keyword[keyword](answer, callback, next);
      else if (next !== undefined)
        next(answer, callback);
    }
  ,
  ScriptsLoaded : function(answer, callback)
    {
      function ScriptsFiresUp()
      {
        phoxy._.api.keyword.routeline(answer, callback);
        if (callback)
          callback(answer);
        if (!phoxy.state.loaded)
          phoxy._.internal.Load();
      }

      phoxy._.api.IfKeyword(answer, callback, "design", ScriptsFiresUp);
    }
  ,
  FindRouteline : function(routeline)
    {
      if (typeof routeline === 'undefined')
        return function() {};
      if (typeof window[routeline] === 'function')
        return window[routeline];
      var arr = routeline.split(".");
      var method = arr.pop();

      var obj = window;
      for (var k in arr)
        if (typeof obj[arr[k]] === 'undefined')
          throw "Routeline context locate failed";
        else
          obj = obj[arr[k]];

      if (typeof obj[method] !== 'function')
        throw "Routeline locate failed";

      return obj[method];
    }
  ,
  ForwardDownload : function(url, callback_or_true_for_return)
    {
      if (typeof(storage) === "undefined")
        storage = {};

      if (callback_or_true_for_return === true)
        return storage[url];

      function AddToLocalStorage(data)
      {
        storage[url] = data;
        if (typeof(callback_or_true_for_return) === 'function')
          callback_or_true_for_return(data);
      }

      if (storage[url] != undefined)
      {
        if (typeof(callback_or_true_for_return) === 'function')
          callback_or_true_for_return(storage[url]);
        return true;
      }

      phoxy._.internal.ajax(url, AddToLocalStorage);
      return false;
    }
  ,
  ajax : function ()
    {
      phoxy._.internal.ajax.apply(this, arguments);
    }
  ,
  Serialize : function(obj, nested_mode)
    {
      json_encoded = JSON.stringify(obj);
      send_string = json_encoded.substring(1, json_encoded.length - 1);

      function EscapeReserved(str, reserved)
      {
        reserved_characters = reserved.split('');
        search_string = "\\" + reserved_characters.join("|\\");
        var regexp = new RegExp(search_string, "gi");

        return str.replace(regexp,
          function(matched)
          {
            return escape(escape(matched));
          });
      }

      return EscapeReserved(send_string, "()?#\\");
    }
  ,
};

phoxy._ApiSubsystem._.api.keyword =
{
  error: function(answer, callback)
    {
      alert(answer.error);
      if (answer.reset !== undefined)
        phoxy.Reset(answer.reset);
    }
  ,
  reset: function(answer, callback)
    {
      phoxy.Reset(answer.reset);
    }
  ,
  script: function(answer, callback, next)
    {
      require(answer.script, next);
    }
  ,
  before: function(answer, callback, next)
    {
      function AfterBefore(_answer)
      {
        if (_answer !== undefined)
          answer = _answer;
        next(answer, callback);
      }

      phoxy._.api.FindRouteline(answer.before)(AfterBefore, answer);
    }
  ,
  routeline: function(answer, callback)
    {
      phoxy._.api.FindRouteline(answer.routeline, answer)();
    }
  ,
  design: function(answer, callback, next)
    {
      var canvas = phoxy._.render.PrepareCanvas('<render>');

      var url = phoxy.Config()['ejs_dir'] + "/" + answer.design + ".ejs";
      phoxy._.api.ForwardDownload(url, function()
      {
        if (answer.replace !== undefined)
          phoxy._.api.keyword.replace(answer, callback, canvas);
        else if (answer.result !== undefined)
          phoxy._.api.keyword.result(answer, callback, canvas);
        else
          document.getElementsByTagName('body')[0].appendChild(canvas.obj);

        phoxy._.render.RenderReplace(
          canvas.id,
          answer.design,
          answer.data || {},
          next);
      });

      return canvas;
    }
  ,
  replace: function(answer, callback, canvas)
    {
      canvas.id = answer.replace;
    }
  ,
  result: function(answer, callback, canvas)
    {
      if (typeof answer.result === 'string')
        return document.getElementById(answer.result).innerHTML = canvas.html;

      for (var k in answer.result)
      {
        var v = document.getElementById(answer.result[k]);
        if (v != null)
          v.innerHTML = canvas.html;
      }
    }
};