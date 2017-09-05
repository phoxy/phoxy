phoxy.click =
{
  _: {}
};

phoxy._.click =
{
  InitClickHook: function()
    {
      document
        .querySelector('body')
        .addEventListener('click', phoxy._.click.OnClick, false);

      window.onpopstate = phoxy._.click.OnPopState;
    }
  ,
  IsURLSupported: function(url)
    {
      // Returns false for default browser action
      // Returns true on phoxy handling

      if (!url)
        return false;

      // Link begins with # - hash ancoring
      if (url.substring(0, 1) == '#')
        return false;

      // Link begins with // - definitely not phoxy
      if (url.substring(0, 2) == "//")
        return false;

      // Link begins with proto:// - probably not phoxy
      if (url.match(/^\w+:\/\//) !== null)
        return false;

      return true;
    }
  ,
  PhoxyAction: function(url, skip_history_push, cb)
    {
      if (url[0] === '/')
        url = url.substring(1);

      if (skip_history_push)
        phoxy.ApiRequest(url, cb);
      else
        phoxy.MenuCall(url, cb);
    }
  ,
  OnClick: function (event)
    {
      if (event.ctrlKey)
        return; // Ctrl + Click = open in new tab

      var target = event.target;
      while (true)
      {
        if (target === null)
          return;
        if (target.nodeName === 'A')
          break; // only click on A is triggered
        target = target.parentElement;
      }

      var path = target.getAttribute('href');

      // If phoxy action not forced and url not supported
      // or action forbidden explicitly with not-phoxy
      // then cancel
      if (target.hasAttribute('not-phoxy')
        || (!target.hasAttribute('force-phoxy')
          && !phoxy._.click.IsURLSupported(path))
         )
        return;

      phoxy._.click.PhoxyAction(path, false);
      event.preventDefault();
    }
  ,
  OnPopState: function(e)
    {
      var state = e.state;
      var path = e.target.location.pathname;
      var hash = e.target.location.hash;

      if (phoxy._.click.IsURLSupported(path))
        phoxy._.click.PhoxyAction(path, true, function()
        {
          document.documentElement.scrollTop = document.body.scrollTop = state.scroll;
        });
    }
};
