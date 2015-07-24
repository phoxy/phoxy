phoxy._ApiSubsystem =
{
  ApiAnswer : function( answer, callback )
    {
      if (answer.error)
      {
        alert(answer.error);
        if (answer.reset !== undefined)
          phoxy.Reset(answer.reset);
        return;
      }
      if (answer.reset !== undefined)
        phoxy.Reset(answer.reset);

      function Before()
      {
        function AfterBefore(_answer)
        {
          if (_answer !== undefined)
            answer = _answer;
          phoxy.ScriptsLoaded(answer, callback);
        }

        if (answer.before === undefined)
          return AfterBefore();

        phoxy.FindRouteline(answer.before)(AfterBefore, answer);
      }

      if (answer.script)
        require(answer.script, Before);
      else
        Before();
    }
  ,
  ScriptsLoaded : function( answer, callback )
    {
      function ScriptsFiresUp()
      {
        phoxy.FindRouteline(answer.routeline, answer)();
        if (callback)
          callback(answer);
        if (!phoxy.state.loaded)
          phoxy._internal.Load();
      }
      if (answer.design === undefined)
        return ScriptsFiresUp();

      var canvas = phoxy.PrepareCanvas('<render>');
      var id = canvas.id;
      var render_id = id;

      var element = canvas.html;

      var url = phoxy.Config()['ejs_dir'] + "/" + answer.design;
      phoxy.ForwardDownload(url + ".ejs", function()
      {
        if (answer.replace === undefined)
          if (answer.result === undefined)
            document.getElementsByTagName('body')[0].appendChild(canvas.obj);
          else if (typeof answer.result === 'string')
            document.getElementById(answer.result).innerHTML = element;
          else
            for (var k in answer.result)
            {
              var v = document.getElementById(answer.result[k]);
              if (v != null)
                v.innerHTML = element;
            }

        else
          render_id = answer.replace;

        phoxy.RenderReplace(
          render_id,
          answer.design,
          answer.data || {},
          ScriptsFiresUp);
      });
    }
  ,
  FindRouteline : function( routeline )
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
  ForwardDownload : function( url, callback_or_true_for_return )
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

      phoxy.ajax(url, AddToLocalStorage);
      return false;
    }
  , // vanilla.js ajax
  ajax : function ()
    {
      phoxy.ajax = phoxy._EarlyStage.ajax;
      phoxy.ajax.apply(this, arguments);
    }
  ,
  AJAX : function( url, callback, params )
    {
      url = phoxy.ConstructURL(url);

      var current_ajax_id = phoxy.state.ajax.active_id++;
      phoxy.state.ajax.active[current_ajax_id] = arguments;

      if (!phoxy.state.ajax.nesting_level++)
        if (typeof phoxy.prestart.OnAjaxBegin === 'function')
          phoxy.prestart.OnAjaxBegin(phoxy.state.ajax.active[current_ajax_id]);

      phoxy.ajax(phoxy.Config()['api_dir'] + "/" + url, function(response)
        {
          data = JSON.parse(response);
          if (params == undefined)
            params = [];
          params.unshift(data);
          callback.apply(this, params);

          if (!--phoxy.state.ajax.nesting_level)
            if (typeof phoxy.prestart.OnAjaxEnd === 'function')
              phoxy.prestart.OnAjaxEnd(phoxy.state.ajax.active[current_ajax_id]);
          delete phoxy.state.ajax.active[current_ajax_id];
        });
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
  ConstructURL : function(arr)
  {
    if (typeof arr === 'string')
      return arr;

    arr = arr.slice(0);
    var url = arr.shift();
    if (arr.length > 0)
      url += '(' + phoxy.Serialize(arr) + ')';
    return url;
  }
  ,
  ApiRequest : function( url, callback )
    {
      if (phoxy._deprecated.IsObjectOptionalDetected.apply(this, arguments))
        phoxy._deprecated.ObjectOptional(phoxy.MenuCall, arguments);

      url = phoxy.ConstructURL(url);

      phoxy.AJAX(url, phoxy.ApiAnswer, [callback]);
    }
  ,
  MenuCall : function( url, callback )
    {
      if (phoxy._deprecated.IsObjectOptionalDetected.apply(this, arguments))
        phoxy._deprecated.ObjectOptional(phoxy.MenuCall, arguments);

      phoxy.ChangeURL('/' + url);
      phoxy.ApiRequest(url, callback);
    }
}