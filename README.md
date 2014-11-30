phoxy
=====
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/Enelar/phoxy?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
<br>
This small framework show you, howto:<br>
<ul>
<li>decrease overload on your website</li>
<li>save network traffic</li>
<li>develop API at the same time with production</li>
</ul>

<p>The whole idea that client only interesting in update information, design does not change so often. Besides it fatter than payload.</p>
<p>After library loaded, it starts caching all the design/callback codes, and request only payload(DB extract).</p>

=====
<p>Demo <a href='http://exsul.net/phoxy/'>Exsul</a></p>
<p>All caching <b>turned off</b>(for more clear demonstation).</o>
<p>Look at the your browser network requests log, after few clicks between pages (Register/Login).</p>

=====
JSON reserved names:
<ul>
<li><i>design</i> - <a href='http://embeddedjs.com/'>EJS</a> file</li>
<li><i>reset</i> - force full page reload</li>
<li><i>error</i> - alert message</li>
<li><i>script</i> - array of <a href='http://requirejs.org/'>required</a> scripts</li>
<li><i>routeline</i> - function name to execute</li>
<li><i>result</i> - HTML tag id to render in. If missed - design will append to body</li>
<li><i>data</i> - user payload</li>
</ul>
