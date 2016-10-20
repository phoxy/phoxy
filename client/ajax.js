phoxy._.ajax =
{
  request: function(url, post, success, error)
  {
    phoxy._.ajax.legacy_request(url, post, success, error);
  },

  legacy_request: function(url, post, success, error)
  {
    var after_ajax_loaded = function()
    {
      success(x.responseText, x);
    }

    try
    {
      x = new (window.XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');

      x.open(post ? 'POST' : 'GET', url, 1);

      x.setRequestHeader('X-Lain', 'Wake up');
      x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');


      x.addEventListener("load", after_ajax_loaded);

      x.addEventListener("error", error);
      x.addEventListener("abort", error);

      x.send(post)
    } catch (e)
    {
      error(e);
      window.console && console.log(e);
    }
  }
}
