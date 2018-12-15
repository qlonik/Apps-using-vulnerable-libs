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

