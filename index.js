"use strict";
const FS = require('fs');
const HTTP = require('http');
const HTTPS = require('https');
const HTTPProxy = require('http-proxy');
const UUID = require('uuid/v4');

class ProxyDog {
	constructor(options = {}){

		if(options.https && options.https.port){
			if(typeof options.https.ssl !== 'object' || Array.isArray(options.https.ssl)) throw Error('No SSL config provided!');
			var ssl = {};
			for(var field in options.https.ssl) ssl[field] = FS.readFileSync(options.https.ssl[field], 'utf8');
			this.httpsServer = HTTPS.createServer(ssl, this.getProxyHandler('http', true));
			var https_port = options.https ? options.https.port : 8443;
			this.httpsServer.listen(https_port, function(){
				console.log('Listening for HTTPS at port', https_port);
			});
			this.httpsServer.on('upgrade', this.getProxyHandler('http', true));
		}

		this.httpServer = HTTP.createServer(this.getProxyHandler('ws', false));
		var http_port = options.http ? options.http.port : 8080;
		this.httpServer.listen(http_port, function(){
			console.log('Listening for HTTP at port', http_port);
		});
		this.httpServer.on('upgrade', this.getProxyHandler('ws', false));
		this.proxies = {};
		this.options = options;

		for(let route in options.routes) this.createProxy(route, options.routes[route]);
	}

	createProxy(domain, options){
		var proxies = options.proxies.map(function(proxy){
			var target = new HTTPProxy.createProxyServer(proxy);
			var uuid = UUID();

			target.on('error', function(err) {
				console.error(err);
			});

			if(options.sticky){
				target.on('proxyRes', function(proxyRes, req, res) {
					res.setHeader('Set-Cookie', `proxy-dog-uuid=${uuid}`);
				});
			}

			return {uuid, target};
		});
		this.proxies[domain] = {proxies, options};
	}

	getProxyHandler(protocol, secure){
		var self = this;
		return function(req, res, head){
			req.uuid = ProxyDog.getCookies(req.headers.cookie, 'proxy-dog-uuid');
			console.log(req.method, req.headers.host, req.url);

			var route = self.proxies[req.headers.host];

			if(route){
				if(route.options.force_https && !secure){
					var location = `${protocol}s://${req.headers.host + req.url}`;
					if(head){
						return res.end(`HTTP/1.1 301 Moved Permanently\r\nLocation: ${location}\r\n`);
					}else{
						res.writeHead(301, {'Location': location});
						return res.end();
					}
				}

				var proxy;
				
				if(route.options.sticky) proxy = route.proxies.find(p => p.uuid === req.uuid);

				if(!proxy){
					proxy = route.proxies.shift();
					route.proxies.push(proxy);
				}

				if(head) return proxy.target.ws(req, res, head);
				return proxy.target.web(req, res);
			}

			self.proxyError('There was an error forwarding your request!', req, res);
		};
	}

	proxyError(message, req, res) {
		res.writeHead(500, { 'Content-Type': 'text/plain' });
		res.end(message);
	}

	static getCookies (cookieString, name){
		var value = "; " + cookieString;
		var parts = value.split("; " + name + "=");
		if(parts.length == 2) return parts.pop().split(";").shift();
	}
}

module.exports = ProxyDog;