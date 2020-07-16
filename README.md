# teambot


## Installation
Copy config.json.example to config.json.
npm install
node teambot.js

Can also use:
npm start

Can also use PM2 to manage (preferred).

## Commands

Prefix is defined in `config.json`. All commands are written in the commands directory. The `help` command lists commands and their descriptions.

## PM2

Use the following in production.
`pm2 restart ecosystem.config.js --env production`

Use the following in development.
`pm2 restart ecosystem.config.js`

Check the environment is right.
`pm2 info TeamBot`

If it's not, update the environment.
`pm2 restart TeamBot --update-env`

