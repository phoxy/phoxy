phoxy._.reactor =
{
  react: function(obj, success, error)
  {
    phoxy._.reactor.ignite_next_queue(obj, {name: 'warming_reactor'}, [], success, error);
  }
  ,
  add_reaction: function(queue_name, method, require_main_thread, success, error)
  {
    for (var i = 0; i < phoxy._.reactor.queues.length; i++)
      if (phoxy._.reactor.queues[i].name == queue_name)
        break;
    if (i == phoxy._.reactor.queues.length)
      return error("Queue not registered", queue_name);

    var queue = phoxy._.reactor.queues[i];
    var handlers = queue.handlers;

    handlers.push(method);
    return success("Handler registered");
  }
  ,
  // TODO: Add before word
  add_queue: function(queue, after, success, error)
  {
    if (typeof after == 'string')
      after = [after];

    phoxy._.reactor.queues.push(
    {
      name: queue,
      require: after,
      handlers: [],
    });
  }
  ,
  ignite_next_queue: function(obj, current, trail, success, error)
  {
    trail.push(current.name);

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

    for (var k in phoxy._.reactor.queues)
    {
      if (!phoxy._.reactor.queues.hasOwnProperty(k))
        continue;
      var queue = phoxy._.reactor.queues[k];

      if (trail.indexOf(queue.name) != -1)
        continue;

      if (!phoxy._.reactor.queue_requirment_met(queue, trail))
        continue;

      return success(queue);
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
  execute_queue: function(obj, queue, trail, success, error)
  {
    var handlers = queue.handlers;
    var handler_id = 0;

    var next_handler = function(obj)
    {
      if (handler_id >= handlers.length)
        return success(obj, queue.name, trail, success, error);

      var handler = handlers[handler_id++];

      handler(obj, next_handler, error);
    }

    next_handler(obj);
  }
  ,
  queues : []
  ,
};

phoxy._.reactor.add_queue('reaction_began', 'warming_reactor')
phoxy._.reactor.add_queue('pre', 'reaction_began');
phoxy._.reactor.add_queue('now', 'pre');
phoxy._.reactor.add_queue('post', 'now');

phoxy._.reactor.add_pre_reaction = phoxy._.reactor.add_reaction.bind(phoxy._.reactor, 'pre');
phoxy._.reactor.add_now_reaction = phoxy._.reactor.add_reaction.bind(phoxy._.reactor, 'now');
phoxy._.reactor.add_post_reaction = phoxy._.reactor.add_reaction.bind(phoxy._.reactor, 'post');
