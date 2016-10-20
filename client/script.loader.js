var script_loader = {};

script_loader.LoadScript = function(name, success, error)
{
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

script_loader.FindScriptDirectivesFromDom = function()
{
  var scripts = document.getElementsByTagName('phoxy-load-script');

  for (var k = 0; k < scripts.length; k++)
  {
    var script = scripts[k];
    var load_attribute = script.getAttribute('src');

    if (load_attribute)
      script_loader.LoadScript(load_attribute);
  }
}

script_loader.FindScriptDirectivesFromDom();
