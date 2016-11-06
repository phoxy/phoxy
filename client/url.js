phoxy._.url = function(url)
{
  return phoxy._.url.construct(url);
}

phoxy._.url.construct = function(arr)
  {
    if (typeof arr === 'string')
      return arr;

    arr = arr.slice(0);
    var url = arr.shift();
    if (arr.length > 0)
      url += '(' + phoxy._.url.serialize(arr) + ')';
    return url;
  }

phoxy._.url.parse = function(string)
  {
    throw "TODO: parse api string";
  }

phoxy._.url.serialize = function(obj, nested_mode)
  {
    var json_encoded = JSON.stringify(obj);
    var send_string = json_encoded.substring(1, json_encoded.length - 1);

    function EscapeReserved(str, reserved)
    {
      var reserved_characters = reserved.split('');
      var search_string = "\\" + reserved_characters.join("|\\");
      var regexp = new RegExp(search_string, "gi");

      return str.replace(regexp,
        function(matched)
        {
          return escape(matched);
        });
    }

    var escaped_send_string = EscapeReserved(send_string, "()?#\\");
    return encodeURI(escaped_send_string);
  }
