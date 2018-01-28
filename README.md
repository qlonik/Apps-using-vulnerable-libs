# Apps using vulnerable libs

Project dedicated to the search of android applications which are using
vulnerable libraries.

## File structure

* `.idea` - files specific for IDE
* `app_parser` - main component which extracts JavaScript from Android
  applications and matches against known libraries. Check out it's own
  [README](./app_parser/README.md).
* `data` - folder containing data. By default, `.tgz` of libs are dumped
  into `data/lib_dump/`, `data/sample_libs/` contains parsed libraries,
  and `data/sample_apps/` contains apps to analyse.
* `npm_rank` - rank of npm packages. Clone of
  https://gist.github.com/anvaka/8e8fa57c7ee1350e3491.
