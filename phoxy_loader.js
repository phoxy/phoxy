(function()
{
  var head = document.getElementsByTagName('HEAD').item(0);
  var script = document.createElement("script");
  script.type = "text/javascript";
  script.src = "libs/require.js";
  head.appendChild(script);
})();
