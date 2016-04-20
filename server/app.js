var express = require('express');
var fs = require('fs');
var proxy = require('http-proxy-middleware');
var path = require('path');

var port = process.env.PORT || 8080;
var proxyTarget = process.env.PROXY_TARGET;
if (!proxyTarget) {
  console.error("Error: set {PROXY_TARGET} env variable (e.g. 'export PROXY_TARGET=http://localhost:8090')");
  return;
}
var options = {
  target: proxyTarget,
  changeOrigin: true,
  pathRewrite: { '^/supervisor' : '/druid/indexer/v1/supervisor' }
};
var apiProxy = proxy('/supervisor', options);
var publicPath = path.join(path.dirname(fs.realpathSync(__filename)), '../public');

var app = express();
app.use(apiProxy);
app.use(express.static(publicPath));

app.listen(port, function () {
  console.log('Listening on ' + port);
});
