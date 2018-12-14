# app_parser

Component which extracts JavaScript from Android applications and analyses
it against known libraries.

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

c. Install [linuxbrew](http://linuxbrew.sh/) with command from their website
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
