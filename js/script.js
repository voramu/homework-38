/* ---------- WebGL: звёздное небо, арка, вода с рябью ---------- */
const cv = document.getElementById('gl');
const gl = cv.getContext('webgl', {antialias:false});
const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const fs = `
precision highp float;
uniform vec2 R; uniform float T; uniform vec2 M;
const float H = 0.4425;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(p);p=p*2.03+7.1;a*=.5;}return s;}

// p: x от центра, y от низа, в единицах высоты экрана
vec3 sky(vec2 p){
  float y=p.y;
  float up=clamp((y-H)/(1.-H),0.,1.);
  vec3 top=vec3(.15,.135,.34), mid=vec3(.29,.215,.47), low=vec3(.50,.42,.60);
  vec3 c=mix(low,mid,smoothstep(0.,.35,up));
  c=mix(c,top,smoothstep(.22,1.,up));
  float n=fbm(p*vec2(1.5,2.2)+vec2(T*.008,0.));
  c*=.62+.8*n;
  vec2 d=vec2(p.x/.55,(y-H)/.5);
  vec2 d3=vec2(p.x/.8,(y-H)/.1);
  vec2 d2=vec2(p.x/.2,(y-H)/.24);
  float glw=clamp(exp(-dot(d,d)*2.0)*.9+exp(-dot(d2,d2)*1.5)*.6+exp(-dot(d3,d3)*2.0)*.35,0.,1.);
  c=mix(c,vec3(1.,.74,.82),glw);
  vec2 sg=p*R.y/3.2; vec2 id=floor(sg);
  float h=hash(id); vec2 f=fract(sg)-.5;
  float st=step(.965,h)*smoothstep(.12,.0,length(f-(vec2(hash(id+3.),hash(id+7.))-.5)*.6));
  c+=vec3(.9,.85,1.)*st*(.35+.65*hash(id+11.))*smoothstep(.1,.7,up+.15)*(.75+.25*sin(T*1.5+h*40.));
  return c;
}
float ring(vec2 p){
  vec2 c=vec2(0.,H+.0035);
  float d=abs(length(p-c)-.3615);
  return smoothstep(.0048,.0016,d)*step(H,p.y);
}
vec3 scene(vec2 p,float rf){
  vec3 c=sky(p);
  float rg=ring(p)*rf;
  vec3 rc=mix(vec3(.2,.1,.4),vec3(.78,.55,.84),smoothstep(.7,.98,(p.y-H)/.36));
  return mix(c,rc,rg*.75);
}
// высота воды в точке экрана (p: x от центра, y от низа, в долях высоты)
float ht(vec2 p){
  float dy=H-p.y;
  float z=1./(dy+.06);
  vec2 w=vec2(p.x*z,z);
  float z0=1./(.26+.06);
  float warp=(fbm(w*.5+vec2(0.,T*.025))-.5)*1.1;
  float r=length(w-vec2(0.,z0))+warp;
  float amp=exp(-r*.24)*smoothstep(.0,.05,dy);
  float h=sin(r*6.2-T*.6)*amp;
  h+=(fbm(w*1.1-T*.03)-.5)*.28*smoothstep(.0,.2,dy);
  return h;
}
void main(){
  vec2 p=(gl_FragCoord.xy-vec2(R.x*.5,0.))/R.y;
  vec3 col;
  if(p.y>=H){
    col=scene(p,1.);
  }else{
    float dy=H-p.y;
    float z=1./(dy+.06);
    vec2 w=vec2(p.x*z,z);
    float hgt=ht(p);
    float e=.004;
    vec2 g=vec2(ht(p+vec2(e,0.))-ht(p-vec2(e,0.)), ht(p+vec2(0.,e))-ht(p-vec2(0.,e)))/(2.*e);
    float fade=smoothstep(.0,.08,dy);
    // отражение: точка неба, в которую «смотрит» поверхность
    vec2 lp=vec2(p.x+g.x*.006*fade, dy*.28+g.y*.0085*fade);
    float ly=lp.y, lx=lp.x;
    // зеркальное свечение — яркая розовая полоса у горизонта
    float band=exp(-pow((ly-.05)/.06,2.))*exp(-pow(lx/.5,2.));
    // яркость бликов на воде зависит от положения курсора/наклона карты
    float mk=clamp((.75-M.x)/.5,0.,1.);
    float lit=mix(.12,1.1,mk*mk*(3.-2.*mk));
    float pool=smoothstep(.42,.78,band)*lit;
    float halo=exp(-pow((ly-.06)/.2,2.))*exp(-pow(lx/.55,2.))*mix(.5,1.,mk);
    // небо над отражением (тёмное фиолетовое)
    vec3 skyc=sky(vec2(lx,H+ly+.05))*.5;
    float dd=smoothstep(.0,.32,dy);
    vec3 deep=mix(vec3(.28,.19,.43),vec3(.115,.06,.26),dd);
    col=mix(deep,skyc,.35*(1.-dd));
    col+=vec3(.30,.16,.30)*halo*.22*(1.-.4*dd);
    // у горизонта — прямое отражение свечения
    float near=exp(-pow(dy/.085,2.));
    col=mix(col,scene(vec2(p.x+g.x*.003,H+dy*.5),0.)*1.0,near*.95);
    // розовые «лужи»
    col=mix(col,vec3(.98,.72,.84),pool*.95*smoothstep(.10,.19,dy)*(1.-smoothstep(.30,.40,dy)));
    col+=vec3(.20,.08,.14)*pool*near;
    // тонкие тёмные контуры на краях
    float outl=smoothstep(.04,.0,abs(band-.34));
    col*=1.-.6*outl*smoothstep(.08,.18,dy);
    // тень под картой
    col*=1.-.5*exp(-pow(p.x/.2,2.)-pow((p.y-.19)/.07,2.));
    // отражение арки: длинная волнистая линия
    float rx=p.x+(fbm(vec2(p.y*3.2,T*.1+p.x*2.))-.5)*.09*smoothstep(.0,.25,dy);
    float rr=abs(length(vec2(rx,H-.0035+dy*.0)-vec2(0.,0.))-.3615);
    float arch=smoothstep(.0048,.0016,abs(abs(rx)-.3615))*exp(-dy*6.5);
    col=mix(col,vec3(.17,.09,.33),arch*.85);
  }
  // цветокоррекция: более насыщенный сине-фиолетовый, меньше зелёного
  col=vec3(pow(col.r,1.12),pow(col.g,1.22),pow(col.b,1.04));
  // виньетка
  vec2 uv=gl_FragCoord.xy/R;
  col*=1.-.45*pow(length((uv-.5)*vec2(1.,.9)),2.8);
  gl_FragColor=vec4(col,1.);
}`;
gl.getExtension('OES_standard_derivatives');
function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);
  if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o;}
const pr=gl.createProgram();
gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));
gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,'#extension GL_OES_standard_derivatives : enable\n'+fs));
gl.linkProgram(pr);gl.useProgram(pr);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
const uR=gl.getUniformLocation(pr,'R'),uT=gl.getUniformLocation(pr,'T'),uM=gl.getUniformLocation(pr,'M');
function resize(){const d=Math.min(devicePixelRatio||1,2);cv.width=innerWidth*d;cv.height=innerHeight*d;gl.viewport(0,0,cv.width,cv.height);}
addEventListener('resize',resize);resize();

/* ---------- мышь + лёгкое «дыхание» → 3D-наклон карты ---------- */
const tilt=document.getElementById('tilt'),card=document.getElementById('card');
let tx=0,ty=0,cx=0,cy=0,vx=0,vy=0,lastMove=-1e9;
addEventListener('pointermove',e=>{
  tx=(e.clientX/innerWidth-.5)*2; ty=(e.clientY/innerHeight-.5)*2; lastMove=performance.now();
});
addEventListener('pointerleave',()=>{tx=ty=0;});
const t0=performance.now();
let mx=.5,my=.5;
function frame(now){
  const t=(now-t0)/1000;
  // idle: плавное качание, если мышь давно не двигали
  const idle=Math.min(1,Math.max(0,(now-lastMove-1200)/1500));
  const gx=tx+idle*(Math.sin(t*1.05)*.75), gy=ty+idle*(Math.sin(t*.8+1.2)*.45);
  // пружина
  vx+=(gx-cx)*.045; vx*=.86; cx+=vx;
  vy+=(gy-cy)*.045; vy*=.86; cy+=vy;
  const ry=cx*13, rx=-cy*6, rz=cx*cy*-1.2;
  tilt.style.transform=`rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
  // блик скользит по карте вместе с поворотом
  card.style.setProperty('--f',(48-cx*40).toFixed(1));
  card.style.setProperty('--gx',(50+cx*40)+'%');
  card.style.setProperty('--gy',(30+cy*30)+'%');
  mx=.5+cx*.25; my=.5+cy*.25;
  gl.uniform2f(uR,cv.width,cv.height);gl.uniform1f(uT,t);gl.uniform2f(uM,mx,my);
  gl.drawArrays(gl.TRIANGLES,0,3);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);