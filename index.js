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
            this.httpsServer = HTTPS.createServer(ssl, this.getHTTPProxyHandler(true));
            // Get HTTPS port
            var https_port = options.https ? options.https.port : 8080;
            // Listen for HTTPS
            this.httpsServer.listen(https_port, function(){
                console.log('Listening for HTTPS at port', https_port);
            });
        }

        // Setup HTTP server
        this.httpServer = HTTP.createServer(this.getHTTPProxyHandler(false));
        // Get http port
        var http_port = options.http ? options.http.port : 80;
        // Listen for HTTPS
        this.httpServer.listen(http_port, function(){
            console.log('Listening for HTTP at port', http_port);
        });

        this.proxies = {};
        this.options = options;

        for(let route in options.routes) this.createProxy(route, options.routes[route].proxy);
    }

    createProxy(domain, options){
        var proxy = new HTTPProxy.createProxyServer(options);

        proxy.on('error', function(err) {
            console.error(err);
        });

        this.httpServer.on('upgrade', function (req, socket, head) {
            proxy.ws(req, socket, head);
        });

        this.httpsServer.on('upgrade', function (req, socket, head) {
            proxy.ws(req, socket, head);
        });

        this.proxies[domain] = {proxy, options};
    }

    getHTTPProxyHandler(secure){
        var self = this;
        return function(req, res){
            console.log(req.method, req.headers.host, req.url);

            // Get route
            var target = self.proxies[req.headers.host];
            if(target.options.force_https && !secure){
                res.writeHead(301, {'Location': 'https://' + req.headers.host + req.url});
                return res.end();
            }

            if(target) return target.proxy.web(req, res);
            self.proxyError('There was an error forwarding your request!', req, res);
        };
    }

    proxyError(message, req, res) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(message);
    }
}

module.exports = ProxyDog;