phoxy._.api =
{
  read: function(url, success, error)
  {
    phoxy._.api.request(true, url, success, error);
  }
  ,
  update: function(url, success, error)
  {
    phoxy._.api.request(false, url, success, error);
  }
  ,
  request_through_ajax: function(is_fetching_only, url, success, error)
  {
    phoxy._.api.construct_ajax_params(is_fetching_only, url, function before_ajax_request(get, post)
    {
      phoxy._.ajax.request(get, post, function before_response_parsing(response)
      {
          phoxy._.api.parse_json(response, function api_request_finished(obj)
          {
            success(obj, url);
          }, error);
      }, error);
    }, error);
  }
  ,
  construct_ajax_params: function(is_fetching_only, url, success, error)
  {
    if (typeof url === 'string')
      url = [url];

    if (!Array.isArray(url))
      return error("api url should be string or array");

    url[0] = '/api/' + url[0];

    if (is_fetching_only)
      return success(url, undefined);


    var get  = url.shift();
    var post = url;

    success(get, post);
  }
  ,
  parse_json: function(text, success, error)
  {
    try
    {
        var obj = JSON.parse(text);
    }
    catch (e)
    {
        return error(e);
    }

    success(obj);
  }
  ,
  initial_api_request: function()
  {
    var commands = document.getElementsByTagName('phoxy-initial-api-request');

    var done = 0;

    for (var k = 0; k < commands.length; k++)
    {
      var command = commands[k].getAttribute('src');

      // Todo: allow update commands as well
      if (command)
        phoxy._.api.read(command, function after_another_initial_request_done()
        {
          if (++done == commands.length)
            console.log("Initial api requests finished");
        }, console.log);
    }
  }
}

phoxy._.api.request = phoxy._.api.request_through_ajax;
phoxy._.api.initial_api_request();
