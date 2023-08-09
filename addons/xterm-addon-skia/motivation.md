# How 80s synthwave

It started with setting up my local mac for development. This is always a fun day where about half is spent waiting for xcode to download and update. So during this wait, I attempted to get vscode and hyper themed to be like [SynthWave '84](https://github.com/robb0wen/synthwave-vscode), an 80s neon theme that makes extensive use of text-shadow to produce a soft neon effect on text (that's completely useless practically). 

[Todo example of Synthwave '84 with and without glow]

Although I could get the vscode editor to get this done, it was super hacky and I had to suppress a warning that the extension was hacking vscode, which didn't really give me a good warm and fuzzy feeling.

[Todo example of warning]

However, I couldn't get the glow effect with the ported theme for hyper, a custom terminal app. There was a similarly named themes with the right colors, but NONE of the neon glow. I started looking into why not and found a [failed](https://github.com/xtermjs/xterm.js/issues/2041) [attempt](https://github.com/diogocezar/hyper-synthwave84/issues/1) from a theme author.

[Todo open issues by hyper theme author]

It turns out that the terminal in both hyper and vscode use a project called xterm.js. xterm.js offers an API that doesn't allow for text to get too fancy: you can only specify font, colors, weight, letter-spacing, and line-height.

So with my Synthwave-loving heart, I asked myself "Can I add text-shadow support to xterm.js and hyper themes?" The answer is probably yes, but there's gonna be a LOT of hard work: a new theme API, a new or extended renderer, and accepted PRs to xterm.js, hyper, and vscode.

## What is xterm really?

Although I thought I *could* do it, I had to ask myself *should* I do it. The biggest question being "does adding this violate the contract xterm has traditionally had?" So what is xterm.js?

xterm.js is a terminal emulator written in js/ts that needs hella good performance. You really want smooth scrolling and fast rendering when tailing logs and so forth. Additionally, it needs to render interactive output from commands like `top` and `man` which use text formatting to setup a visual hierarchy with external links. It inherits a need to support the original xterm extensions

For color, it supports an 8 light and 8 dark color set plus an additional (256-16) colors like the original xterm application.

[TODO xterm color image]

For text formatting, it supports bold, italic, underline, blink, double-width characters, font, font size, line spacing, and 3 different kinds of cursors per the original xterm project.

[TODO example of bold, italic, double width, and mixed content]

According to benchmarks, an html viewer and even a canvas renderer were too slow for most people, and the default was a webgl-based renderer. Someone was also working on a webgpu based one, which could be a lot faster because you could shove the glyph cache onto the GPU memory.

[TODO benchmarks for various renderers]

I also found [a beautiful writeup on the "gems" of xterm](https://lukas.zapletalovi.com/posts/2013/hidden-gems-of-xterm/), which is really a set of corner cases that xterm.js would need to support. Additionally, I know that most CLI apps use [ncurses](https://tldp.org/HOWTO/NCURSES-Programming-HOWTO/intro.html#WHATIS) or [equivalent](https://github.com/chjj/blessed), so I better see what kind of output the terminal is reading. 

In fact, there is a huge amount of capabilities a terminal may or may not support, and two different 30+ year old formats to describe those capabilities. I did find a [probably out of date simplified summary of those capabilities for different terminals](https://github.com/termcolor/termcolor#terminal-properties). Terminals communicate their capabilities out via two old custom formats: [terminfo](https://en.wikipedia.org/wiki/Terminfo) and [termcap](https://en.wikipedia.org/wiki/Termcap). Parsing termcap seems like [black magic](https://github.com/kenan238/reblessed/blob/master/src/lib/tput.js).

[TODO diagram from https://en.wikipedia.org/wiki/Termcap]

For how terminals actually work, check out [tty](http://www.linusakesson.net/programming/tty/index.php) which is full of ancient history.

## What do CLI devs want when they use terminal capabilities?

So now I know what terminals *can* do, but what do CLI developers usually do?

My favorite writeup was from the python blessed port, covering [what CLI devs should watch out for](https://blessed.readthedocs.io/en/1.11.0/pains.html). Additionally, I found some code in blessed to [intelligently segment developer intention via color reduction](https://github.com/chjj/blessed/blame/e563155b0e312ffe83acf8ac9e36edcb4e0f074d/lib/widget.js#L1153).

So from these I am seeing these primary use cases for a CLI developer:

1. plain old text (UTF-8 by default)
2. Bold, Italic, and hyperlinks (a docs app)
3. The default 16 ANSI colors and background (fancy command prompts and error messages)
4. The full 256 color palette (super rare and fancy CLI apps like a colorized ASCII art generator)

So when I am considering "should I add advanced text decoration to xterm?" I should really be thinking about how CLI apps tell xterm what text-decoration should be used. I'm really thinking about targeting just 2 and 3 above, and definitely put some kind of workaround on case 4 to "normalize" any output.

## How we'll style terminal text

Alright, so based on how tty and terminals work, I intend to make a theme interface that allows the following:

A css-like language with select based on either:
a. ANSI color channel (1-256)
b. text style: bold/italic (and maybe cursive/hid ?)
c. defaults

# Skia

So why am I considering the skia renderer? From experience, I know that it's a hella powerful and fast way to render text across multiple platforms, which is why it powers chrome, figma, and flutter. But, given we're just rendering monospace text super quickly, there are some important questions we need hard benchmarks for:

1. Will we see a perf gain for skia over just using canvas?
2. Will Skia perf be close enough to raw webGL?
3. How would enabling WebGPU in Skia instead of WebGL change things (on my mac m2)?

There's only one accurate way to find out, so I'm off to write a renderer for xterm.js.