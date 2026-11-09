module.exports = function(source) {
  if (this.resourcePath.endsWith('.css')) {
    const names = [...source.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m=>m[1]);
    return `const css=${JSON.stringify(source)}; const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);export default ${JSON.stringify(Object.fromEntries(names.map(x=>[x,x])))};`;
  }
  const done=this.async();
  const swc=require('next/dist/build/swc');
  swc.loadBindings().then(()=>swc.transform(source,{filename:this.resourcePath,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'es6'}})).then(x=>done(null,x.code),done);
};
