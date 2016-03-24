var FS = require('fs');
var HTTP = require('http');
var HTTPS = require('https');
var HTTPProxy = require('http-proxy');

var Config = require('./config.json');

// Check for secure setup
if(Config.https && Config.https.port){
	// Make sure we have ssl config
	if(typeof Config.https.ssl !== 'object' || Array.isArray(Config.https.ssl)) throw Error('No SSL config provided!');
	// Make ssl config obj
	var ssl = {};
	// Loop through the SSL config and convert the path's to a file
	for(var field in Config.https.ssl){
		ssl[field] = FS.readFileSync(Config.https.ssl[field]);
	}
	// Setup HTTPS server
	var httpsServer = HTTPS.createServer(ssl, proxyHandler(true));
	// Get HTTPS port
	var https_port = Config.https ? Config.https.port : 8080;
	// Listen for HTTPS
	httpsServer.listen(https_port, function(){
		bark('is listening for HTTPS at port', https_port);
	});
	// Setup HTTPS proxy 
	var httpsProxy = HTTPProxy.createServer({
		xfwd: (Config.xfwd || Config.https.xfwd),
		secure: (!Config.self_signed)
	});
	// Setup HTTPS error handler
	httpsProxy.on('error', proxyError);
}

// Setup HTTP server
var httpServer = HTTP.createServer(proxyHandler(false));
// Get http port
var http_port = Config.http ? Config.http.port : 80;
// Listen for HTTPS
httpServer.listen(http_port, function(){
	bark('is listening for HTTP at port', http_port);
});
// Setup HTTP proxy
var httpProxy = HTTPProxy.createProxyServer({
	xfwd: (Config.xfwd || Config.http.xfwd)
});
// Setup HTTPS error handler
httpProxy.on('error', proxyError);

// Catchall error handler
function proxyError(err, req, res) {
	if(err) console.error(err);
	res.writeHead(500, { 'Content-Type': 'text/plain' });
	res.end('There was an error forwarding your request!');
}

// Request proxy handler
var count = 0;
function proxyHandler(https){
	return function(req, res){
		console.log(++count, req.method, req.url);
		// Get route
		var route = Config.routes[req.headers.host];
		// Make sure we can forward it
		if(!route || !route.ip){
			res.writeHead(500, { 'Content-Type': 'text/plain' });
			return res.end('The requested host was not found!');
		}
		// Build target
		var target = route.ip + ':' + (route.port || (https ? 8080 : 80));
		// Proxy request to target
		if(!https && httpProxy) return httpProxy.web(req, res, {target: 'http://' + target});
		if(httpsProxy) return httpsProxy.web(req, res, {target: 'https://' + target});
		// Something wen bad, return an error
		proxyError(null, req, res);
	};
}

// Console log with cute prefix
function bark(){
	arguments[0] = '*Bark!* Proxy Dog ' + arguments[0];
	console.log.apply(console.log, arguments);
}