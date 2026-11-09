// Compile the real client components without Next's server or any live services.
const crypto = require('node:crypto');
module.exports = function (source) {
  if (!this.resourcePath.endsWith('.css')) return require('./checkout-harness-loader.cjs').call(this, source);
  const prefix = 'fixture_' + crypto.createHash('sha1').update(this.resourcePath).digest('hex').slice(0, 8) + '_';
  const names = [...new Set([...source.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(match => match[1]))];
  const css = source.replace(/\.([A-Za-z_][\w-]*)/g, (_, name) => '.' + prefix + name)
    .replace(/:global\((\[.*?\])\)/g, '$1').replace(/:global\((body:has\(.*?\))\)/g, '$1');
  return `const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.appendChild(style);export default ${JSON.stringify(Object.fromEntries(names.map(name => [name, prefix + name])))};`;
};
