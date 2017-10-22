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


      phoxy._.click.StoreScroll();
      phoxy._.click.RestoreScroll(0);

      phoxy._.click.PhoxyAction(path, false);
      event.preventDefault();
    }
  ,
  OnPopState: function(e)
    {
      var state = e.state;
      var path = e.target.location.pathname;
      var hash = e.target.location.hash;

      var restore_state = state == null ? null : phoxy._.click.RestoreState.bind(this, state);
      phoxy._.click.StoreScroll();

      if (phoxy._.click.IsURLSupported(path))
        phoxy._.click.PhoxyAction(path, true, restore_state);
    }
  ,
  StoreScroll: function()
  {
    // save current scroll position
    var state_obj =
    {
      scroll: document.documentElement.scrollTop || document.body.scrollTop,
      height: document.documentElement.scrollHeight || document.body.scrollHeight,
    };

    history.replaceState(state_obj, document.title, document.location);
  }
  ,
  RestoreScroll: function(pos)
  {
    document.documentElement.scrollTop = document.body.scrollTop = pos;
  }
  ,
  RestoreState: function(state)
  {
    var height = document.documentElement.scrollHeight || document.body.scrollHeight;
    if (height < state.height * 0.9)
      return phoxy.Defer(arguments.callee.bind(this, state), 100);

    phoxy._.click.RestoreScroll(state.scroll);
  }
  ,
};
