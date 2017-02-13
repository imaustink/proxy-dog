# proxy-dog
Lightweight HTTP proxy with host routing. Load balancing coming soon...

## Install
### Git
```git clone https://github.com/imaustink/proxy-dog.git```
### NPM
```npm i -S proxy-dog```

## Standalone mode
To use Proxy Dog in standalone mode, start by creating a config.json file in the root of the proxy-dog folder, example bellow.
```javascript
{
  "http": {
    "port": 80
  },
  "https": {
    "port": 443,
    "ssl": {
      "key": "./cert/server.key",
      "cert": "./cert/server.crt"
    }
  },
  "routes": {
    "localhost": {
      "proxy": {
        "target": "https://10.0.1.19:8080",
        "ws": true,
        "secure": false
      },
      "force_https": true
    }
  }
}
```
