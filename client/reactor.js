phoxy._.reactor =
{
  react: function(obj, success, error)
  {
    phoxy._.reactor.ignite_next_queue(obj, 'warming_reactor', [], success, error);
  }
  ,
  add_reaction: function(queue, method, require_main_thread, success, error)
  {

  }
  ,
  add_queue: function(queue, before, success, error)
  {

  }
  ,
  ignite_next_queue: function(obj, current, trail, success, error)
  {
    trail.push(current);

    phoxy._.reactor.find_next_queue(trail
      , function next_queue_found(queue)
      {
          phoxy._.reactor.execute_queue(obj, queue, trail, function queue_finished(result)
          {
            phoxy._.reactor.ignite_next_queue(result, queue, trail, success, error);
          }, error);
      }
      , function cant_find_next_queue (message)
      {
        if (message == "Reaction is over")
          success(obj);
        else {
          error.apply(this, arguments);
        }
      });
  }
  ,
  find_next_queue: function(trail, success, error)
  {

  }
  ,
  execute_queue: function(obj, name, trail, success, error)
  {

  }
};

phoxy._.reactor.add_queue('pre', 'now');
phoxy._.reactor.add_queue('now', 'post');

phoxy._.reactor.add_pre_reaction = phoxy._.reactor.add_reaction.bind('pre');
phoxy._.reactor.add_now_reaction = phoxy._.reactor.add_reaction.bind('now');
phoxy._.reactor.add_post_reaction = phoxy._.reactor.add_reaction.bind('post');
