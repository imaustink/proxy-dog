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
            this.httpsServer = HTTPS.createServer(ssl, this.getHTTPProxyHandler());
            // Get HTTPS port
            var https_port = options.https ? options.https.port : 8080;
            // Listen for HTTPS
            this.httpsServer.listen(https_port, function(){
                console.log('Listening for HTTPS at port', https_port);
            });
        }

        // Setup HTTP server
        this.httpServer = HTTP.createServer(this.getHTTPProxyHandler());
        // Get http port
        var http_port = options.http ? options.http.port : 80;
        // Listen for HTTPS
        this.httpServer.listen(http_port, function(){
            console.log('Listening for HTTP at port', http_port);
        });

        this.proxies = {};
        this.options = options;

        for(let route in options.routes) this.createProxy(route, options.routes[route]);
    }

    createProxy(domain, options){
        var proxy = new HTTPProxy.createProxyServer(options);

        proxy.on('error', function(err, req, res) {
            console.error(err);
            res.end();
        });

        this.httpServer.on('upgrade', function (req, socket, head) {
            proxy.ws(req, socket, head);
        });

        this.httpsServer.on('upgrade', function (req, socket, head) {
            proxy.ws(req, socket, head);
        });

        this.proxies[domain] = proxy;
    }

    getHTTPProxyHandler(){
        var self = this;
        return function(req, res){
            // Get route
            var proxy = self.proxies[req.headers.host];
            console.log(req.method, req.headers.host, req.url);
            if(proxy) return proxy.web(req, res);
            self.proxyError('There was an error forwarding your request!', req, res);
        };
    }

    proxyError(message, req, res) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(message);
    }
}

module.exports = ProxyDog;