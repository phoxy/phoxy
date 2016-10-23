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
  add_queue: function(queue, after, success, error)
  {
    if (!phoxy._.reactor.queues[queue] == undefined)
      throw "Queue already added";

    if (typeof after == 'string')
      after = [after];

    phoxy._.reactor.queues[queue] =
    {
      require: after,
    };

    phoxy._.reactor.queues.__proto__.length =
      1 + (phoxy._.reactor.queues.__proto__.length || 0);
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
    if (trail.length - 1 == phoxy._.reactor.queues.length)
      error("Reaction is over");

    for (var queue in phoxy._.reactor.queues)
    {
      if (trail.indexOf(queue) != -1)
        continue;
      if (!phoxy._.reactor.queue_requirment_met(queue, trail))
        continue;

      return success(queue);
    }

    error(trail);
  }
  ,
  queue_requirment_met: function(queue, trail)
  {
    // Probably refactor as async too
    for (var k in queue.require)
      if (-1 != trail.indexOf(queue.require[k]))
        return false;
    return true;
  }
  ,
  execute_queue: function(obj, name, trail, success, error)
  {

  }
  ,
  queues : {}
  ,
};

phoxy._.reactor.add_queue('now', 'pre');
phoxy._.reactor.add_queue('post', 'now');

phoxy._.reactor.add_pre_reaction = phoxy._.reactor.add_reaction.bind('pre');
phoxy._.reactor.add_now_reaction = phoxy._.reactor.add_reaction.bind('now');
phoxy._.reactor.add_post_reaction = phoxy._.reactor.add_reaction.bind('post');
