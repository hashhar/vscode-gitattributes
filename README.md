# gitattribute extension for Visual Studio Code

An extension for Visual Studio Code that assists you in working with `.gitattribute` files.

## Features

- Language support for `.gitattribute` files.
- Allows adding a `.gitattribute` file by pulling files from the [alexkaratarakis/gitattributes](https://github.com/alexkaratarakis/gitattributes) repository.

## Usage

Start command palette (with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> or <kbd>F1</kbd>) and start typing `gitattribute` to see all available commands this extension offers.

## Extension Settings

This extension contributes the following settings:

```JavaScript
{
    // Number of seconds the list of `.gitattribute` files retrieved from github will be cached
    "gitattribute.cacheExpirationInterval": 86400
}
```

## Roadmap

### v0.1
Basic implementation that allows to pull a single `.gitattribute` file.

### v0.2
Add language support for `.gitattribute` files.

### v0.3
Support adding multiple `.gitattribute` files and merging them into a single file.

## Changelog

See [CHANGELOG.md](CHANGELOG.md)

## Licence

See [LICENCE.txt](LICENCE.txt)

## Credits

Icon based on the Git logo by [Jason Long](https://twitter.com/jasonlong).
