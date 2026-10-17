import type { Forecast, Spot } from "./types";
import { seaState } from "./swell";

const vertex = `attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
export const surfaceShader = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform vec3 waves[4];
uniform vec4 waveNumbers[4];
uniform vec3 offshoreNumbers[4];
uniform vec4 shoalingAmplitudes[4];
uniform float wind;
uniform float significantHeight;
uniform vec3 lightDirection;
const float PI = 3.14159265;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
  float sum = 0., weight = .5;
  for(int i=0;i<5;i++) {
    sum += weight*noise(p);
    p = mat2(.8,-.6,.6,.8)*p*2.03 + 12.7;
    weight *= .5;
  }
  return sum;
}
float coast(float x) { return sin(x*.075)*.65 + sin(x*.19)*.18; }
float sandHeight(vec2 p) {
  float shore=p.y-coast(p.x);
  return shore<0. ? -shore*.13 : -.04*shore-.22*(1.-exp(-shore*.12));
}
float breakDistance() { return clamp(significantHeight/(.78*.04),12.,170.); }
float phaseIntegral(float shore,vec4 k, float deep) {
  vec4 length=vec4(24.,72.,224.,680.);
  vec4 x=clamp(vec4(shore)-vec4(0.,24.,96.,320.),vec4(0.),length);
  vec4 end=vec4(k.yzw,deep);
  return dot(k*x+.5*(end-k)*x*x/length,vec4(1.))+max(shore-1000.,0.)*deep;
}
float wavePhase(vec2 p,float shore,float period,vec4 nearK,vec3 farK,float seed) {
  float omega=2.*PI/max(period,2.);
  return p.x*farK.y-phaseIntegral(shore,nearK,farK.x)-time*omega+seed*2.31;
}
float amplitudeAt(float shore,vec4 a,float far) {
  vec4 blend=clamp((vec4(shore)-vec4(0.,24.,96.,320.))/vec4(24.,72.,224.,680.),0.,1.);
  return a.x+dot(vec4(a.yzw,far)-a,blend);
}
float sea(vec2 p) {
  float shore=max(p.y-coast(p.x),0.);
  float breaking=breakDistance();
  float shoal=exp(-pow((shore-breaking)/(breaking*.65+8.),2.));
  float h=0.;
  for(int i=0;i<4;i++) {
    float phase=wavePhase(p,shore,waves[i].y,waveNumbers[i],offshoreNumbers[i],float(i));
    float omega=2.*PI/max(waves[i].y,2.);
    float group=(.95+.45*cos(phase*.16+time*omega*.08+float(i)*1.8)
      +.18*cos(phase*.073+time*omega*.0365+float(i)*2.7))/1.00992574;
    float bend=.12*sin(p.x*.018+float(i)*2.1);
    float theta=phase+bend;
    float harmonic=.12+.22*shoal;
    float skew=.14*shoal;
    float profile=(cos(theta)+harmonic*cos(2.*theta)+skew*sin(2.*theta))
      *inversesqrt(1.+harmonic*harmonic+skew*skew);
    h+=waves[i].x*profile*group*amplitudeAt(shore,shoalingAmplitudes[i],offshoreNumbers[i].z);
  }
  h*=smoothstep(0.,3.,shore);
  float depth=max(-sandHeight(p),0.);
  float limit=max(.04,depth*.42);
  float ratio=abs(h)/limit;
  float fourth=ratio*ratio*ratio*ratio;
  h*=inversesqrt(sqrt(sqrt(1.+fourth*fourth)));
  float period=max(waves[0].y,max(waves[3].y,4.));
  float runup=(.035+.12*sin(-time*2.*PI/period+sin(p.x*.18)*.2))*smoothstep(.15,.6,significantHeight);
  return h+runup*exp(-shore*.24);
}
float breakingFoam(vec2 p,float shore) {
  float breaking=breakDistance();
  float surf=smoothstep(2.,12.,shore)*(1.-smoothstep(breaking*.8,breaking*1.45,shore));
  float foam=0.;
  for(int i=0;i<4;i++) {
    float phase=wavePhase(p,max(shore,0.),waves[i].y,waveNumbers[i],offshoreNumbers[i],float(i))+.12*sin(p.x*.018+float(i)*2.1);
    float sinceCrest=mod(-phase+2.*PI,2.*PI);
    float trail=exp(-sinceCrest*.32);
    float crest=pow(max(cos(phase),0.),10.);
    float weight=clamp(waves[i].x/max(significantHeight*.35,.05),0.,1.);
    foam+=weight*(trail*.62+crest*.55);
  }
  return foam*surf*smoothstep(.2,.8,significantHeight);
}
`;

const fragment = `${surfaceShader}
const vec3 cameraPosition=vec3(0.,2.,-8.);
const float lens=.42;
float detail(vec2 p, float footprint) {
  float total=0., amplitude=.003+min(wind,25.)*.0013;
  float frequency=1.15;
  vec2 q=p;
  for(int i=0;i<5;i++) {
    vec2 direction=vec2(sin(float(i)*2.399+.3),cos(float(i)*2.399+.3));
    float phase=dot(q,direction)*frequency + time*(1.1+float(i)*.36);
    float fade=1.-smoothstep(.35,1.5,frequency*footprint);
    float wave=sin(phase+.45*sin(phase*.73+float(i)));
    total+=wave*amplitude*fade;
    q+=direction*wave*.17;
    frequency*=1.92;
    amplitude*=.48;
  }
  return total;
}
vec3 sky(vec3 ray, bool clouds) {
  float elevation=max(ray.y,0.);
  vec3 horizon=vec3(.29,.48,.62);
  vec3 zenith=vec3(.012,.10,.27);
  vec3 color=mix(horizon,zenith,pow(elevation,.47));
  float sun=max(dot(ray,lightDirection),0.);
  color+=vec3(1.,.75,.44)*pow(sun,9.)*.22;
  color+=vec3(1.,.85,.63)*pow(sun,220.)*.55;
  if(clouds) color+=vec3(4.,3.6,2.8)*smoothstep(.99965,.9999,sun);
  if(clouds && ray.y>.015) {
    vec2 uv=ray.xz/(ray.y+.13)*1.4;
    uv.x+=time*.0018;
    float mass=fbm(uv+vec2(17,3));
    float cloud=smoothstep(.47,.72,mass);
    float edge=fbm(uv+vec2(.4,.1));
    vec3 shade=mix(vec3(.43,.53,.58),vec3(1.,.97,.86),smoothstep(.35,.68,edge));
    color=mix(color,shade,cloud*smoothstep(.01,.12,ray.y)*.82);
    float cirrus=smoothstep(.58,.8,fbm(uv*vec2(.45,2.8)+40.));
    color=mix(color,vec3(.84,.87,.85),cirrus*.22);
  }
  return color;
}
float foamCells(vec2 p, float footprint) {
  float n=fbm(p*.9);
  float cells=abs(noise(p*2.7+vec2(n*2.,-n))- .5);
  cells += (noise(p*9.1)-.5)*.18;
  float aa=clamp(footprint*.9,.025,.22);
  return (1.-smoothstep(.025-aa,.13+aa,cells))*(.65+.35*noise(p*16.));
}
vec3 sand(vec2 p) {
  float mottling=fbm(p*.45);
  float fine=noise(p*55.);
  vec3 color=mix(vec3(.47,.34,.20),vec3(.66,.51,.32),mottling);
  color+=(fine-.5)*.065;
  float ridges=sin(p.y*21.+noise(p*.7)*7.);
  color+=ridges*.009;
  return color;
}
float limb(vec2 p,vec2 a,vec2 b,float ra,float rb) {
  float t=clamp(dot(p-a,b-a)/dot(b-a,b-a),0.,1.);
  return length(p-mix(a,b,t))-mix(ra,rb,t);
}
float ellipse(vec2 p,vec2 radii) {
  return (length(p/radii)-1.)*min(radii.x,radii.y);
}
float surfer(vec2 p) {
  float d=ellipse(p-vec2(0.,1.69),vec2(.085,.11));
  d=min(d,limb(p,vec2(0.,1.49),vec2(0.,1.60),.045,.045));
  d=min(d,limb(p,vec2(0.,.98),vec2(0.,1.40),.105,.165));
  d=min(d,ellipse(p-vec2(0.,.91),vec2(.135,.14)));
  d=min(d,limb(p,vec2(-.145,1.39),vec2(-.22,1.13),.058,.043));
  d=min(d,limb(p,vec2(-.22,1.13),vec2(-.19,.92),.043,.035));
  d=min(d,limb(p,vec2(.145,1.39),vec2(.25,1.18),.058,.042));
  d=min(d,limb(p,vec2(.25,1.18),vec2(.40,1.13),.042,.032));
  d=min(d,limb(p,vec2(-.07,.88),vec2(-.11,.46),.075,.048));
  d=min(d,limb(p,vec2(-.11,.46),vec2(-.14,.06),.048,.032));
  d=min(d,limb(p,vec2(-.14,.04),vec2(-.23,.03),.033,.025));
  d=min(d,limb(p,vec2(.07,.88),vec2(.13,.46),.075,.047));
  d=min(d,limb(p,vec2(.13,.46),vec2(.16,.06),.047,.031));
  d=min(d,limb(p,vec2(.16,.035),vec2(.25,.025),.032,.025));
  vec2 board=p-vec2(.46,1.);
  board=mat2(.997,-.075,.075,.997)*board;
  return min(d,ellipse(board,vec2(.23,1.)));
}
vec3 surferPosition() {
  float x=-.55*(resolution.x/resolution.y)*lens*(-.65-cameraPosition.z);
  return vec3(x,sandHeight(vec2(x,-.65)),-.65);
}
float surferShadow(vec3 p) {
  vec3 person=surferPosition();
  float t=(person.z-p.z)/lightDirection.z;
  if(t<0.)return 1.;
  vec2 projected=(p+lightDirection*t-person).xy;
  float blur=.015+t*.018;
  return 1.-.38*(1.-smoothstep(-blur,blur,surfer(projected)));
}
vec3 render(vec3 origin,vec3 ray) {
  float ceiling=(waves[0].x+waves[1].x+waves[2].x+waves[3].x)*3.+.2;
  if(ray.y>.12 || (ray.y>=0. && ceiling<origin.y)) return sky(ray,true);
  float plane=ray.y<-.001 ? -origin.y/ray.y : 1600.;
  float t=ray.y<0. ? max(0.,(origin.y-ceiling)/(-ray.y)) : 0.;
  float previous=t;
  bool hit=false;
  for(int i=0;i<72;i++) {
    vec3 p=origin+ray*t;
    float surface=max(sea(p.xz),sandHeight(p.xz));
    float delta=p.y-surface;
    if(delta<.006) {hit=true;break;}
    previous=t;
    t+=max(.045,delta*.55/(.18+abs(ray.y)));
    if(t>min(plane*2.5,1600.))break;
  }
  if(!hit && ray.y>=-.001) return sky(ray,true);
  float lo=previous,hi=t;
  if(!hit) {lo=plane;hi=plane;}
  for(int i=0;i<6;i++) {
    float mid=(lo+hi)*.5;
    vec3 p=origin+ray*mid;
    if(p.y>max(sea(p.xz),sandHeight(p.xz)))lo=mid;else hi=mid;
  }
  t=(lo+hi)*.5;
  vec3 p=origin+ray*t;
  float shore=p.z-coast(p.x);
  float period=max(waves[0].y,max(waves[3].y,4.));
  float surface=sea(p.xz);
  float waterline=(surface-sandHeight(p.xz))/.13;
  float footprint=max(t/resolution.y,.002);
  vec3 sandColor=sand(p.xz);
  if(sandHeight(p.xz)>=surface-.012) {
    float wet=smoothstep(-5.,.5,shore);
    vec3 color=sandColor*mix(1.,.49,wet);
    float sheet=smoothstep(-.12,.2,waterline);
    float fresnel=pow(1.-abs(ray.y),5.);
    color=mix(color,sky(reflect(ray,vec3(0,1,0)),false),wet*.12+sheet*fresnel*.28);
    float lace=foamCells(p.xz*vec2(1.2,1.8)+vec2(0,time*.15),footprint);
    float front=exp(-abs(waterline)*5.)*(.4+.6*lace);
    float washed=sheet*(1.-smoothstep(0.,2.,waterline))*.3*lace;
    color=mix(color,vec3(.85,.9,.86),clamp((front+washed)*smoothstep(.15,.6,significantHeight),0.,.9));
    return color*surferShadow(p);
  }
  float epsilon=max(.025,footprint*.7);
  float h=sea(p.xz);
  float ripple=detail(p.xz,footprint);
  float dx=sea(p.xz+vec2(epsilon,0.))-h;
  float dz=sea(p.xz+vec2(0.,epsilon))-h;
  float rippleFade=smoothstep(0.,5.,shore);
  dx+=(detail(p.xz+vec2(epsilon,0.),footprint)-ripple)*rippleFade;
  dz+=(detail(p.xz+vec2(0.,epsilon),footprint)-ripple)*rippleFade;
  vec3 normal=normalize(vec3(-dx,epsilon,-dz));
  vec3 reflected=reflect(ray,normal);
  reflected.y=max(reflected.y,.015);
  float facing=clamp(dot(normal,-ray),0.,1.);
  float fresnel=.02+.98*pow(1.-facing,5.);
  float depth=max(p.y-sandHeight(p.xz),0.);
  vec3 transmittance=exp(-depth*vec3(.52,.105,.075));
  vec3 underwater=mix(vec3(.003,.044,.075),sandColor*vec3(.22,.65,.64),transmittance);
  float backlight=pow(max(dot(ray,lightDirection),0.),3.);
  float crestLight=smoothstep(0.,max(significantHeight*.5,.1),h);
  underwater+=vec3(.008,.13,.11)*crestLight*(.25+.75*backlight)*exp(-depth*.035);
  underwater*=.35+.65*max(dot(normal,lightDirection),0.);
  vec3 color=mix(underwater,sky(reflected,true),fresnel*.88);
  vec3 halfVector=normalize(lightDirection-ray);
  float spec=pow(max(dot(normal,halfVector),0.),180.);
  color+=vec3(1.,.89,.66)*spec*.85;
  float turbulent=fbm(p.xz*vec2(.32,.55)+vec2(time*.15,time*.65));
  float whitecap=smoothstep(12.,25.,wind)*smoothstep(.28,.65,1.-normal.y);
  float foam=breakingFoam(p.xz,shore)*(.35+turbulent*.9)+whitecap*.22;
  float lace=foamCells(p.xz*vec2(.8,1.2)+vec2(time*.06,time*.4),footprint);
  float wash=(1.-smoothstep(0.,12.,shore))*smoothstep(.15,.9,sin(shore*.6+time*2.*PI/period+turbulent))
    *smoothstep(.15,.6,significantHeight);
  foam=max(foam,wash*lace*.42);
  foam=max(foam,exp(-depth*24.)*(.22+.5*lace)*smoothstep(.15,.6,significantHeight));
  foam*=mix(lace*.75+.25,1.,smoothstep(.5,1.1,foam));
  vec3 foamColor=mix(vec3(.44,.64,.62),vec3(.92,.98,.94),.6+turbulent*.4);
  color=mix(color,foamColor,clamp(foam*.95,0.,.95));
  float mist=1.-exp(-t*.0009);
  return mix(color,sky(vec3(ray.x,0.,ray.z),false),mist);
}
void main() {
  vec2 uv=(2.*gl_FragCoord.xy-resolution)/resolution.y;
  vec3 origin=cameraPosition;
  vec3 ray=normalize(vec3(uv*lens+vec2(0.,-.12),1.));
  vec3 person=surferPosition();
  float distance=(person.z-origin.z)/ray.z;
  vec2 silhouette=(origin+ray*distance-person).xy;
  float aa=lens*(person.z-origin.z)*2./resolution.y;
  float cover=1.-smoothstep(-aa,aa,surfer(silhouette));
  vec3 color=cover>.999 ? vec3(.009,.018,.017) : mix(render(origin,ray),vec3(.009,.018,.017),cover);
  color=vec3(1.)-exp(-color*1.35);
  color=pow(max(color-.018,vec3(0.)),vec3(.4545));
  vec2 screen=gl_FragCoord.xy/resolution;
  color*=1.-.1*pow(length(screen-.5),2.);
  color+=(hash(gl_FragCoord.xy)-.5)/255.;
  gl_FragColor=vec4(color,1.);
}
`;

export interface Ocean {
  draw: (time: number) => void;
  resize: () => void;
  dispose: () => void;
}

export function createOcean(
  canvas: HTMLCanvasElement,
  point: Forecast,
  spot: Spot,
): Ocean {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "default",
  });
  if (!gl) throw new Error("Your browser does not support the ocean renderer.");
  const shaders: WebGLShader[] = [];
  const compile = (kind: number, source: string) => {
    const shader = gl.createShader(kind);
    if (!shader) throw new Error("Could not allocate the ocean shader.");
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(`Ocean shader failed: ${gl.getShaderInfoLog(shader)}`);
    return shader;
  };
  const program = gl.createProgram();
  if (!program) throw new Error("Could not allocate the ocean renderer.");
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(
        `Ocean renderer failed: ${gl.getProgramInfoLog(program)}`,
      );
  } catch (error) {
    for (const shader of shaders) gl.deleteShader(shader);
    gl.deleteProgram(program);
    throw error;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Could not allocate ocean geometry.");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const state = seaState(point, spot);
  gl.uniform3fv(gl.getUniformLocation(program, "waves[0]"), state.waves);
  gl.uniform4fv(
    gl.getUniformLocation(program, "waveNumbers[0]"),
    state.nearNumbers,
  );
  gl.uniform3fv(
    gl.getUniformLocation(program, "offshoreNumbers[0]"),
    state.farNumbers,
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "shoalingAmplitudes[0]"),
    state.amplitudes,
  );
  gl.uniform1f(gl.getUniformLocation(program, "wind"), point.ws ?? 0);
  gl.uniform1f(
    gl.getUniformLocation(program, "significantHeight"),
    state.significantHeight,
  );
  const latitude = (spot.latitude * Math.PI) / 180;
  const sunSide = 0.6 + Math.sin((spot.longitude * Math.PI) / 180) * 0.08;
  const sunHeight = 0.3 + Math.cos(latitude) * 0.12;
  const sunLength = Math.hypot(sunSide, sunHeight, 0.7);
  gl.uniform3f(
    gl.getUniformLocation(program, "lightDirection"),
    sunSide / sunLength,
    sunHeight / sunLength,
    0.7 / sunLength,
  );
  const timeLocation = gl.getUniformLocation(program, "time"),
    resolutionLocation = gl.getUniformLocation(program, "resolution");
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(
      window.devicePixelRatio,
      1.5,
      1440 / Math.max(bounds.width, 1),
      Math.sqrt(1_050_000 / Math.max(bounds.width * bounds.height, 1)),
    );
    const width = Math.max(1, Math.round(bounds.width * scale)),
      height = Math.max(1, Math.round(bounds.height * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl!.viewport(0, 0, width, height);
    gl!.uniform2f(resolutionLocation, width, height);
  }
  return {
    resize,
    draw(time) {
      resize();
      gl.uniform1f(timeLocation, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      for (const shader of shaders) gl.deleteShader(shader);
      gl.deleteProgram(program);
    },
  };
}
