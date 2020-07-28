# teambot


## Installation
```
cp config/teambot.json.example config/teambot.json.
npm install
node teambot.js
```

Can also use:
```
npm start
```

Can also use PM2 to manage (preferred).

## Commands

Prefix is defined in `config/teambot.json`. All commands are written in the commands directory. The `help` command lists commands and their descriptions. Commands are triggered with the prefix followed by the command name at the start of a line. Commands take precedence over stock matching.

## Stock matching
Stocks are matched on the ASX with $ and US markets with !. Multiple matches per line are supported. The ticker can be anywhere in the line e.g.

```
Tell me more about !TSLA and $APT.
```

## Karma
Users can be @'d followed by ++ or -- to add or remove points. This functionality is only monitored in channels configured in `config/teambot.json`.

## PM2

```
# Use the following in production.
pm2 startOrRestart config/ecosystem.config.js --env production

# Use the following in development.
pm2-dev config/ecosystem.config.js

# Check the environment is right.
pm2 info TeamBot

# If it's not, update the environment.
pm2 restart TeamBot --update-env
```

