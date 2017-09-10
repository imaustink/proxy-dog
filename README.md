# Proxy Dog

[![Greenkeeper badge](https://badges.greenkeeper.io/imaustink/proxy-dog.svg)](https://greenkeeper.io/)
Lightweight HTTP proxy built on Node.js.

## Features
- Load Balancing
- Sticky Sessions
- Hostname Routing
- Web Socket Proxy

## Why
Say you want to host several internet facing services on different servers on your network. Forward HTTP ports on your router to a proxy server running Proxy Dog and configure a new routing rule and it will forward requests to the correct server.

## Install

### Git
```bash
$ git clone https://github.com/imaustink/proxy-dog.git
```

### NPM
```bash
$ npm i -S proxy-dog
```

## Standalone mode

### Setup
To use Proxy Dog in standalone mode, start by creating a config.json file in the root of the proxy-dog folder, example bellow.

```json
{
  "max_cookie_size": 4096,
  "http": {
    "port": 8080
  },
  "https": {
    "port": 8443,
    "ssl": {
      "key": "./cert/key.pem",
      "cert": "./cert/cert.pem"
    }
  },
  "routes": {
    "example.com": {
      "proxies": [
        {
          "target": "https://10.0.1.19:8080",
          "ws": true,
          "secure": false
        },
        {
          "target": "https://10.0.1.18:8080",
          "ws": true,
          "secure": false
        }
      ],
      "sticky": true,
      "force_https": true
    }
  }
}
```

### Run as a services
You can use the service manager of your choice. The following example uses [forever.js](https://github.com/foreverjs/forever), a simple and very cross-compatible service manager built on Node.js.

```bash
$ sudo npm install forever -g
```

```bash
$ cd proxy-dog
```

```bash
$ forever start app.js
```
