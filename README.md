# gitattributes extension for Visual Studio Code

An extension for Visual Studio Code that assists you in working with
`.gitattributes` files.

## Features

- Language support for `.gitattributes` files.
- Allows adding a `.gitattributes` file by pulling files from the
  [alexkaratarakis/gitattributes](https://github.com/alexkaratarakis/gitattributes)
  repository.

## Usage

Start command palette (with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> or
<kbd>F1</kbd>) and start typing `gitattributes` to see all available commands
this extension offers.

## Extension Settings

This extension contributes the following settings:

```JavaScript
{
    // Number of seconds the list of `.gitattributes` files retrieved from github will be cached
    "gitattributes.cacheExpirationInterval": 86400
}
```

## Roadmap

### v0.1

Basic implementation that allows to pull a single `.gitattributes` file.

### v0.2

Support adding multiple `.gitattributes` files and merging them into a single
file.

### v0.3

Add language support for `.gitattributes` files.

### v0.4

Merge `.gitattributes` files smartly by moving `* text=auto` to the top.

### v0.5

Support for caching entire `.gitattributes` repository and updating only when
new commits are available.

## Changelog

See [CHANGELOG.md](CHANGELOG.md)

## Licence

See [LICENSE](LICENSE)

## Credits

Icon based on the Git logo by [Jason Long](https://twitter.com/jasonlong).
