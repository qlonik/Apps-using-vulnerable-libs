# Apps using vulnerable libs

Project dedicated to the search of android applications which are using vulnerable libraries.
This repo contains the main tool as well as some configuration and data folders.

## File structure

* `.idea` - files specific for IntelliJ IDEA
* `data` - data folder containing files related to apps (apks, extracted and fingerprinted  js files),
  to libs (tgzs, extracted and fingerprinted js files), and log files created while running the tool.
  Check out its own [README](./data/README.md) for more details.
* `bin`, `src`, `package.json`, `package-lock.json`, `tsconfig.json` - source code for the tool
  * Shell scripts in `bin` are used to setup output folders and file descriptor for the main tool.
    Scripts here setup file descriptor using `exec {fd}>output.txt` way, which requires rather new bash. 

## Setup crunch machine

a. Add following lines into `~/.profile` or `~/.bashrc` or equivalent
  ```bash
# ~/.profile
TERM=xterm

export HOMEBREW_NO_ANALYTICS=1

PATH="$HOME/.linuxbrew/bin:$HOME/.linuxbrew/sbin:$PATH"
export MANPATH="$(brew --prefix)/share/man:$MANPATH"
export INFOPATH="$(brew --prefix)/share/info:$INFOPATH"

export NVM_DIR="$HOME/.nvm"
source "$(brew --prefix)/opt/nvm/nvm.sh"
source "$(brew --prefix)/etc/bash_completion.d/nvm"
  ```

b. Log-out, log-in

c. Install linuxbrew (http://linuxbrew.sh/) with command from their website
  ```bash
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/Linuxbrew/install/master/install.sh)"
  ```

d. Install all required dependencies
  ```bash
  brew install gcc ack atool bash ncdu nvm tmux jq
  ```

e. If apks need to be unpacked, also install
  ```bash
  brew install jdk apktool
  ```

f. Link sh to latest version of bash
  ```bash
  ln -s ~/.linuxbrew/bin/bash ~/.linuxbrew/bin/sh
  ```

g. Install latest node
  ```bash
  nvm install node
  ```

## How to run a script

The entry point for the binary scripts is via `npm run bin`.
This script requires parameters passed to it, that have to come after the `--` delimiter, since otherwise they will be interpreted by npm.
For example, the help is available with `npm run bin -- -h`, and the list of runnable scripts is available with `npm run bin -- list`.

## How to perform the analysis

The general process to analyse is the following:
  1. Run `extract-apps` script
  2. Run `extract-libs` script
  3. Run `preprocess-apps` script
  4. Run `analyse-apps` script

### The `extract-apps` script

For this script to run, there has to be the working directory setup.
For example, it could be set to be `./data/apps-first-analysis/`.

The working directory has to contain the directory `dump/` inside of it.
In the dump folder, original apks have to placed, located into different sections.
These sections have no meaning and they could be anything.
The applications have to be apk files with the unique name in the given section.
For example, we can have 3 Android apk files: `com.example.hi_123212.apk`, `org.example.bye_212312.apk`, `wild_name.apk`.
So the resulting file structure will be as following:
```text
data/apps-first-analysis/
|- dump/
   |- anything/                         ## section title
   |  |- com.example.hi_123212.apk
   |  |- org.example.bye_212312.apk
   |- another_group/
      |- wild_name.apk
```

Inside the working directory, three more folders will be created: `tmp/`, `apks/`, and `extracted/`.
The `tmp/` is used to unpack apks with `apktool` and test if they are cordova or react-native.
We support both of these types, but only cordova types could be analysed.
After that, apps which pass will be stored in `apks/` and `extracted/` folders.
After the extraction is done, we will have structure like the following:
```text
data/apps-first-analysis/
|- dump/                                ## left untouched
|- tmp/                                 ## should be empty
|
|- apks/
|  |- cordova/
|  |  |- anything/
|  |     |- com.example.hi_123212.apk/
|  |        |- app.apk                  ## copied and renamed apk file
|  |- react-native/
|     |- anything/
|        |- org.example.bye_212312.apk/
|           |- app.apk
|
|- extracted/
   |- cordova/
   |  |- anything/
   |     |- com.example.hi_123212.apk/
   |        |- js/
   |           |- index.html
   |           |- ...
   |- react-native/
      |- anything/
         |- org.example.bye_212312.apk/
            |- bundle.js
```

As seen from this example, `com.example.hi_123212.apk` was detected as `cordova` app, `org.example.bye_212312.apk` as `react-native` and `wild_name.apk` as neither.

### The `extract-libs` script

This script requires some preparation to be done, since it limits versions of libraries up to cutoff date.
We have to supply to this script the list of all library names, versions of those libraries, and release dates of those versions.
There are couple scripts that 
