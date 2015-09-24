phoxy.click =
{
  _: {},
};

phoxy._.click =
{
  InitClickHook: function()
    {
      document.querySelector('body').addEventListener('click', function click_hook(event)
      {
        var target = event.target;
        while (true)
        {
          if (target === null)
            return;
          if (target.nodeName === 'A')
            break; // only click on A is triggered
          target = target.parentElement;
        }

        var url = target.getAttribute('href');

        if (url === undefined || target.hasAttribute('not-phoxy'))
          return;

        if (phoxy._.click.OnClick(url, false))
          return;

        event.preventDefault()
      }, true);

      window.onpopstate = phoxy._.click.OnPopState;
    }
  ,
  OnClick: function (url, not_push)
    {
      // Element without url
      if (url === undefined)
        return true;

      if (url.indexOf('#') !== -1)
        return true;

      if (url[0] === '/')
        url = url.substring(1);

      if (not_push)
        phoxy.ApiRequest(url);
      else
        phoxy.MenuCall(url);
      return false;
    }
  ,
  OnPopState: function(e)
    {
      var path = e.target.location.pathname;
      var hash = e.target.location.hash;

      phoxy._.click.OnClick(path, true);
    }
};