"use strict";
var FS = require('fs');
var HTTP = require('http');
var HTTPS = require('https');
var HTTPProxy = require('http-proxy');

class ProxyDog {
    constructor(options = {}){
        // Check for secure setup
        if(options.https && options.https.port){
            // Make sure we have ssl config
            if(typeof options.https.ssl !== 'object' || Array.isArray(options.https.ssl)) throw Error('No SSL config provided!');
            var ssl = {};
            // Loop through the SSL config and convert the path's to a file
            for(var field in options.https.ssl){
                ssl[field] = FS.readFileSync(options.https.ssl[field]);
            }
            // Setup HTTPS server
            this.httpsServer = HTTPS.createServer(ssl, this.getProxyHandler());
            // Get HTTPS port
            var https_port = options.https ? options.https.port : 8080;
            // Listen for HTTPS
            this.httpsServer.listen(https_port, function(){
                console.log('Listening for HTTPS at port', https_port);
            });
        }

        // Setup HTTP server
        this.httpServer = HTTP.createServer(this.getProxyHandler());
        // Get http port
        var http_port = options.http ? options.http.port : 80;
        // Listen for HTTPS
        this.httpServer.listen(http_port, function(){
            console.log('Listening for HTTP at port', http_port);
        });

        this.proxies = {};

        for(let route in options.routes) this.createProxy(route, options.routes[route]);
    }

    createProxy(domain, options){
        var target = options.ip;
        if(options.ws !== false) options.ws = true;
        if(options.port) target += (':' + options.port);
        var proxy = HTTPProxy.createProxyServer({
            xfwd: options.xfwd,
            secure: options.secure,
            ws: options.ws,
            target: target
        });

        proxy.on('upgrade', function (req, socket, head) {
            proxy.ws(req, socket, head);
        });

        this.proxies[domain] = proxy;
    }

    getProxyHandler(){
        var self = this;
        return function(req){
            // Get route
            var proxy = self.proxies[req.headers.host];
            console.log(req.method, req.url, req.headers.host);

            if(arguments.length === 2){
                var res = arguments[1];
                // Proxy request to target
                if(proxy) return proxy.web(req, res);
            }

            var socket = arguments[1];
            var head = arguments[2];
            if(proxy) return proxy.ws(req, socket, head);
            self.proxyError('There was an error forwarding your request!', req, socket);
        };
    }

    proxyError(message, req, res) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(message);
    }
}

module.exports = ProxyDog;