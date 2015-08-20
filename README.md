[![Codacy Badge](https://www.codacy.com/project/badge/9acde29aed7e4accb8bd302520fb4608)](https://www.codacy.com/app/enelar/phoxy)
[![Code Climate](https://codeclimate.com/github/phoxy/phoxy/badges/gpa.svg)](https://codeclimate.com/github/phoxy/phoxy)
[![Packagist stable](https://img.shields.io/packagist/v/phoxy/phoxy.svg)](https://packagist.org/packages/phoxy/phoxy)
[![Packagist unstable](https://img.shields.io/packagist/vpre/phoxy/phoxy.svg)](https://packagist.org/packages/phoxy/phoxy)
[![Packagist license](https://img.shields.io/packagist/l/phoxy/phoxy.svg)](https://packagist.org/packages/phoxy/phoxy)
[![Packagist total](https://img.shields.io/packagist/dt/phoxy/phoxy.svg)](https://packagist.org/packages/phoxy/phoxy)

phoxy - making hard development easy
=====
Core problems with 'common web' that forced me to develop this:
<ul>
  <li>Even small page change lead to whole page cache miss</li>
  <li>Same data (like user name/avatar) appears on several pages, and always should be redownloaded</li>
  <li>Appending simple button with effects cause me to use absolute dom path navigation(or even #id)</li>
  <li>No way to decorate/reuse page block</li>
  <li>Design driven, not data driven development</li>
  <li>Everything with design should be computed on client(im talking about templating), server is only for data process</li>
  <li>Even if server offline, browser should be able navigate through local cache/cdn</li>
  <li>Big sites cause HUGE html files, with path MESS</li>
</ul>

## How i resolved it? By async rendering parts of design:

```html
<button>Login</button>
<% __this.DeferRender('login.modal') %>

<%  __this.first().click(function() {
  __this.first().next().modal('show');
})
```

Each page uses 10-30 desugn elements, that could be reused. Each have his own DOM context.

## Cascade resolution

Design least to html string to be generated. Then this string injects into exsists DOM tree.
Ether with absolute or relative navigation. Even if original server command was 'append to body', or 'rewrite #id', client command has more power. `__this.first().append(phoxy.DeferRender('module'))` overwrite this, and rendering results appends to login button.

## Data caching system

It sad, if you already have partial data, like user name near his comment, you still waiting to server answer when you forwarding into his profile. Why we fetching data we already know? In 'common web' we unable to start rendering imideately, even if we have that localy. Just because it were answered not with unified data format, on differend page.

With phoxy we become able to ask server only for data we yet not met. In previous case that mean, when you click at his name, common profile data shows IMMIDEATLY, just because we already know how to render this, and have that data. And we waithing only for new data. Like his friends or anything we yet don't know.<br>
But that tight loop make impress of blazing fast site speed.

## Data redecoration

In common internet, often, even if you already know data, and know how to work with this, lesser design recuirments leads to data re-download. Imagine buy sequence, when you click at shopcard. Just because selling item should change his apperance (no more 'BUY' button, new quantity fields, etc) we should redownload that? No!

Data driven development allow us to overload rendered design.

```html
Welcome <%@ __this.username %>
<%
__this.chain(function()
{
  this.first().find('.button').html('Logout');
})
%>
```

```html
<%
__this.DeferRender('snippets/chain',
{
  chain:
  [
    'logout',
    'login',
  ],
  data:
  {
    username: "Hello world"
  }
})
%>
```

Imagine if you become able download RAW sql data, and sculpts it at client. Make `<ul><li>` ? Maybe add `<a>` here? Or you want `<table><tr>`? Or make filter search, and show only matched rows?
What if you have entire record at your client cache. Doesn't it power you to make full offline navigation?
When next time you would ask server? Right. Only if requested data <b>YET</b> missed, or you want change something.

## Headless sites

As you may understand there no need in expensive servers instances. Everything what means 'READ' sinks into CDN or local client cache. Most of request could be resolved localy, or by your reverse proxy(i prefer CDN).
If somebody ever watched that profile, anyone reuse that information, without your database access. Only thing that should be updated is that was updated. He changed name? Only name entry in cache would changed. He added post? Only new post would added.

## What if i make mistake

At friday evening you making new coolest feature, you adding search at your site. Input box appears at every page. But WOOPS, you made misstype and because you was hurry, you published this. Your page gone offline because ALL pages broken now.

But what it happened when you develop with phoxy? Right, only search input would failed to render. At 'generate html string' stage your JS throw exception, and that branch would never finish. What about others? They complete independed, means errors on one module affects only that module, and nothing else.

## And how i ask server?

Thats one of my favorite parts. I know that users accustomed to `/ / / /` link format. Some of them could tolerate to `/? = & = &` and even `/#   ` links. But they get use to just because us, programmers. That was cosily, back in XX. Now it just obsolete. Sites no more just bunch of folders. We have filters, sorts at our catalogs, and more.
For us, `func(param1, param2)` is much easier. Why we still convert/parse those urls?

How about `http://example.com/profile(Linus Torvalds)/friends/filter(female)` ?

You just create `/api/profile/friends.php` with method `function filter()`.
Or `/api/profile/friends/filter` with method `function Reserve()`.
As you want, both welcomed and could be at the same time.

You even could access to `/api/profile.php` constructor.
For example with request `http://example.com/profile(Linus Torvalds)/friends(female)`
Witch is equal to:
```php
include('api/profile.php');
$obj = new profile("Linus Torvalds");
json_encode($obj->friends("female"))''

```

## XSS, SQLINJ and other security solutions

At proxy development NO user data is dangerous. Everything you showing with `<%@ %>` construction IS defused.
All SQLINJ could be iliminated with https://github.com/Enelar/phpsql, where each query separated from data.

What about authorised access?
Each php class method have different access level. <b>Here we made little change</b>.
Protected no longer means `accessable only from childs`. Now it means that method SHOULD be protected.

Any 'public' or 'private' invoker is trusted. Its server local php code. Current or other class. But protected methods are shared through internet. Which means you chould check incoming data, check user right to change that data, and strip sensitive sql fields. (You do not have to escape anything(ether on put or get). It safe. Only remove private fields, such password hash).

All your raw sql response is translated to valid, unified json object. All your manual constructed json result peeling when requested localy(at server). Once again. `return 4;` virtually become `{data: {function_name: 4}}` when called from outsorce. And any `['scrupt' => 'login', 'data' => ['name' => 'Me', 'id' => 4]]` translated to `'name' => 'Me', 'id' => 4]`. So you able simple combine protected and public methods with cross-module references.

## Insects

What if your plans changed. Or you made bug? You should fix same issue at every file that contains similar code.
And you dublicate your code. With phoxy one snipped is reused wholesite, and it ether work or not. Everywhere. Controlled from one file.


## Get started

I know that its very different angle of view at web development. Acclimatization could be painful.
For example you could mess with element creation timing, with asyncronymous callstack(<b>yeah</b>), runtime branch isolation and much much more.
If so, you always welcome to contact with me though email or anything. If you found bug, please report issue. If you made something with my framework, please flash me a link.