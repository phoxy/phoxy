var script_loader = {};

script_loader.LoadScript = function(name, success, error)
{
  if (typeof name != 'string')
    return script_loader.ArrayLoadScript(name, success, error);

  var js = document.createElement("script");
  js.type = "text/javascript";
  js.src = name;
  js.setAttribute("async", "");

  js.onerror = error;

  if (!js.readyState)
    js.onload = success;
  else //IE
    js.onreadystatechange = function()
    {
      if (-1 == ["loaded", "complete"].indexOf(js.readyState))
        return;
      js.onreadystatechange = null;
      success(js);
    };

  document.head.appendChild(js);
}

script_loader.ArrayLoadScript = function(name, success, error)
{
  if (!Array.isArray(name))
    return error("Unexpected type", name)

  if (name.length == 0)
    return success();

  var i = 0;

  function Load()
  {
    if (i == name.length)
      return success();

    var script = name[i++];
    script_loader.LoadScript(script, Load, error);
  }

  Load();
}

script_loader.FindScriptDirectivesFromDom = function()
{
  var scripts = document.getElementsByTagName('phoxy-load-script');

  var scripts_to_load = [];

  for (var k = 0; k < scripts.length; k++)
  {
    var script = scripts[k];
    var load_attribute = script.getAttribute('src');

    if (load_attribute)
      scripts_to_load.push(load_attribute);
  }

  script_loader.LoadScript(scripts_to_load, console.log);
}

script_loader.FindScriptDirectivesFromDom();
