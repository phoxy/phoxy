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
      handlers: [],
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
          phoxy._.reactor.execute_queue(obj, queue, trail
            , function queue_finished(result)
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
      return error("Reaction is over");

    for (var queue_name in phoxy._.reactor.queues)
    {
      if (!phoxy._.reactor.queues.hasOwnProperty(queue_name))
        continue;
      if (trail.indexOf(queue_name) != -1)
        continue;

      var queue = phoxy._.reactor.queues[queue_name];

      if (!phoxy._.reactor.queue_requirment_met(queue, trail))
        continue;

      return success(queue_name);
    }

    return error(trail);
  }
  ,
  queue_requirment_met: function(queue, trail)
  {
    // Probably refactor as async too
    for (var k in queue.require)
      if (-1 == trail.indexOf(queue.require[k]))
        return false;
    return true;
  }
  ,
  execute_queue: function(obj, name, trail, success, error)
  {
    var handlers = phoxy._.reactor.queues[name].handlers;
    var handler_id = 0;

    var next_handler = function(obj)
    {
      if (handler_id >= handlers.length)
        return success(obj, name, trail, success, error);

      var handler = handlers[handler_id++];

      handler(obj, next_handler, error);
    }

    next_handler(obj);
  }
  ,
  queues : {}
  ,
};

phoxy._.reactor.add_queue('pre', []);
phoxy._.reactor.add_queue('now', 'pre');
phoxy._.reactor.add_queue('post', 'now');

phoxy._.reactor.add_pre_reaction = phoxy._.reactor.add_reaction.bind('pre');
phoxy._.reactor.add_now_reaction = phoxy._.reactor.add_reaction.bind('now');
phoxy._.reactor.add_post_reaction = phoxy._.reactor.add_reaction.bind('post');

