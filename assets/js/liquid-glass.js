/* Static-background liquid-glass renderer: WebGL 2 + SVG foreignObject snapshots. */
(() => {
  'use strict';
  const selector = '.page .page__inner-wrap, .sidebar .author__urls, .toc, .archive__item';
  const dpr = () => Math.min(devicePixelRatio || 1, 2);
  let gl, canvas, program, texture, snap, ctx, busy = false, queued = false, again = false, ready = false, id = 1;

  function shader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
    return s;
  }
  function init() {
    document.querySelectorAll(selector).forEach(e => e.classList.add('liquid-glass-panel'));
    canvas = document.createElement('canvas');
    canvas.className = 'liquid-glass-overlay';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    gl = canvas.getContext('webgl2', {alpha:true, antialias:true, premultipliedAlpha:false});
    if (!gl) throw Error('WebGL 2 unavailable');
    const vs = `#version 300 es
      in vec2 a_position; uniform vec4 u_rect; uniform vec2 u_resolution; out vec2 v_local;
      void main(){v_local=a_position*.5+.5;vec2 p=u_rect.xy+v_local*u_rect.zw;
      gl_Position=vec4(p.x/u_resolution.x*2.-1.,1.-p.y/u_resolution.y*2.,0.,1.);}`;
    const fs = `#version 300 es
      precision highp float; uniform sampler2D u_backdrop; uniform vec2 u_resolution,u_size;
      uniform float u_radius,u_dark,u_blurRadius; in vec2 v_local; out vec4 outColor;
      float roundedBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+vec2(r);
      return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
      void main(){vec2 p=(v_local-.5)*u_size;
      float edge=roundedBox(p,u_size*.5-vec2(u_radius),u_radius);if(edge>0.)discard;
      vec2 uv=gl_FragCoord.xy/u_resolution;
      vec2 n=normalize(vec2(dFdx(edge),dFdy(edge))+vec2(.00001));
      float rimPower=exp(-abs(edge)/10.);vec2 bend=n*(.0025+rimPower*.008);
      vec2 b=vec2(u_blurRadius)/u_resolution;
      vec3 c=texture(u_backdrop,clamp(uv+bend,0.,1.)).rgb*.28;
      c+=texture(u_backdrop,clamp(uv+bend+vec2(b.x,0.),0.,1.)).rgb*.12;
      c+=texture(u_backdrop,clamp(uv+bend-vec2(b.x,0.),0.,1.)).rgb*.12;
      c+=texture(u_backdrop,clamp(uv+bend+vec2(0.,b.y),0.,1.)).rgb*.12;
      c+=texture(u_backdrop,clamp(uv+bend-vec2(0.,b.y),0.,1.)).rgb*.12;
      c+=texture(u_backdrop,clamp(uv+bend+b,0.,1.)).rgb*.06;
      c+=texture(u_backdrop,clamp(uv+bend-b,0.,1.)).rgb*.06;
      c+=texture(u_backdrop,clamp(uv+bend+vec2(b.x,-b.y),0.,1.)).rgb*.06;
      c+=texture(u_backdrop,clamp(uv+bend+vec2(-b.x,b.y),0.,1.)).rgb*.06;
      vec3 r=texture(u_backdrop,clamp(uv+bend+n*.0018,0.,1.)).rgb;
      vec3 z=texture(u_backdrop,clamp(uv+bend-n*.0018,0.,1.)).rgb;
      vec3 color=vec3(r.r,c.g,z.b);vec3 tint=mix(vec3(1.),vec3(.075,.105,.17),u_dark);
      color=mix(color,tint,mix(.075,.16,u_dark));
      float hi=exp(-pow((edge+4.)/1.6,2.))*smoothstep(-u_size.y*.4,u_size.y*.4,-p.y);
      color+=vec3(1.)*hi*.38;outColor=vec4(color,1.);}`;
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);const buf=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program,'u_backdrop'),0);
    snap=document.createElement('canvas');ctx=snap.getContext('2d',{alpha:false});
    document.documentElement.classList.add('liquid-glass-active');resize();
  }
  function resize(){
    if(!gl)return;const s=dpr(),w=Math.max(1,Math.round(innerWidth*s)),h=Math.max(1,Math.round(innerHeight*s));
    canvas.width=snap.width=w;canvas.height=snap.height=h;gl.viewport(0,0,w,h);schedule();
  }
  function tag(){
    document.body.querySelectorAll('*').forEach(e=>{if(!e.hasAttribute('data-lg-id'))e.setAttribute('data-lg-id',String(id++));});
  }
  function copyStyle(a,b){
    const c=getComputedStyle(a);for(let i=0;i<c.length;i++){const p=c[i];b.style.setProperty(p,c.getPropertyValue(p),c.getPropertyPriority(p));}
    if(c.position==='fixed'||c.position==='sticky'){
      const r=a.getBoundingClientRect();Object.assign(b.style,{position:'absolute',left:r.left+'px',top:(r.top+scrollY)+'px',right:'auto',bottom:'auto',width:r.width+'px',height:r.height+'px',transform:'none'});
    }
  }
  function draw(){
    if(!gl||!ready)return;const s=dpr();gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);
    gl.uniform2f(gl.getUniformLocation(program,'u_resolution'),canvas.width,canvas.height);
    gl.uniform1f(gl.getUniformLocation(program,'u_dark'),document.documentElement.dataset.theme==='dark'?1:0);
    gl.uniform1f(gl.getUniformLocation(program,'u_blurRadius'),8*s);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    document.querySelectorAll('.liquid-glass-panel').forEach(e=>{
      const r=e.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight)return;
      gl.uniform4f(gl.getUniformLocation(program,'u_rect'),r.left*s,r.top*s,r.width*s,r.height*s);
      gl.uniform2f(gl.getUniformLocation(program,'u_size'),r.width*s,r.height*s);
      gl.uniform1f(gl.getUniformLocation(program,'u_radius'),(parseFloat(getComputedStyle(e).borderTopLeftRadius)||18)*s);
      gl.drawArrays(gl.TRIANGLES,0,6);
    });
  }
  function fail(err){
    busy=false;document.documentElement.classList.remove('liquid-glass-active');
    if(canvas)canvas.style.display='none';console.warn('Liquid glass shader unavailable; CSS fallback active.',err);
  }
  function capture(){
    if(!gl)return;if(busy){again=true;return;}busy=true;tag();
    const originals=new Map();document.body.querySelectorAll('[data-lg-id]').forEach(e=>originals.set(e.getAttribute('data-lg-id'),e));
    const clone=document.body.cloneNode(true);clone.querySelectorAll('.liquid-glass-overlay,canvas,script').forEach(e=>e.remove());
    clone.querySelectorAll('[data-lg-id]').forEach(e=>{const o=originals.get(e.getAttribute('data-lg-id'));if(o)copyStyle(o,e);});
    const bs=getComputedStyle(document.body);for(let i=0;i<bs.length;i++)clone.style.setProperty(bs[i],bs.getPropertyValue(bs[i]));
    clone.style.setProperty('transform','translateY('+(-scrollY)+'px)','important');
    clone.style.setProperty('width',innerWidth+'px','important');
    clone.style.setProperty('min-height',(innerHeight+scrollY)+'px','important');
    const st=document.createElement('style');
    st.textContent='.liquid-glass-panel{background:transparent!important;border-color:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}.liquid-glass-panel:before,.liquid-glass-panel:after{display:none!important}.liquid-glass-panel>*{visibility:hidden!important}';
    clone.prepend(st);const wrap=document.createElementNS('http://www.w3.org/1999/xhtml','div');
    wrap.setAttribute('xmlns','http://www.w3.org/1999/xhtml');wrap.style.width=innerWidth+'px';wrap.style.height=innerHeight+'px';wrap.style.overflow='hidden';wrap.appendChild(clone);
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+snap.width+'" height="'+snap.height+'" viewBox="0 0 '+innerWidth+' '+innerHeight+'"><foreignObject width="100%" height="100%">'+new XMLSerializer().serializeToString(wrap)+'</foreignObject></svg>';
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'})),img=new Image();
    img.onload=()=>{try{
      ctx.clearRect(0,0,snap.width,snap.height);ctx.drawImage(img,0,0,snap.width,snap.height);URL.revokeObjectURL(url);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,snap);ready=true;draw();busy=false;
      if(again){again=false;schedule();}
    }catch(e){URL.revokeObjectURL(url);fail(e);}};
    img.onerror=()=>{URL.revokeObjectURL(url);fail(Error('SVG DOM snapshot failed'));};img.src=url;
  }
  function schedule(){if(!gl||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;capture();});}
  try{
    init();tag();const observer=new MutationObserver(records=>{
      if(records.every(r=>r.type==='attributes'&&r.attributeName==='data-lg-id'))return;schedule();
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
    addEventListener('resize',resize,{passive:true});addEventListener('scroll',schedule,{passive:true});
    if('ResizeObserver'in window){const ro=new ResizeObserver(schedule);ro.observe(document.body);
      document.querySelectorAll('.liquid-glass-panel').forEach(e=>ro.observe(e));}
    schedule();
  }catch(e){fail(e);}
})();