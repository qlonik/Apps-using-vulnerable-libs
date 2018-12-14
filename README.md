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

### File structure of /data

* `dbs/` - npm databases dumped from couchdb
  * `scoped.json.tar.xz` - db from `https://replicate.npmjs.com/registry`.
    One file packed with xz.
  * `scoped.json` - unpacked `scoped.json.tar.xz`.
  * `skimdb.json.tar.xz` - db from `https://skimdb.npmjs.com/registry`. One file packed with xz.
  * `skimdb.json` - unpacked `skimdb.json.tar.xz`.

* `apk_dump/` - folder where `.apk` files are dumped. Need to be in the format:
  `cordova/section/name.apk`.
* `lib_dump/` - folder where libs' `.tgz` files are dumped.

* `apps_apks` - folder where `.apk` files are placed after the app is parsed.
* `sample_apps` - folder where parsed apps files are placed.
* `sample_libs` - folder where parsed libraries are placed.
