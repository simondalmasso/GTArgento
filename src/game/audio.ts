export class GameAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  buffers = new Map<string, AudioBuffer>();
  engineSrc: AudioBufferSourceNode | null = null;
  engineGain: GainNode | null = null;
  amb: { stop: () => void } | null = null;

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (!this.amb) this.startAmbience();
  }

  async load() {
    this.unlock();
    for (const name of ["step", "camera", "special", "win", "fail", "ui", "engine"]) this.buffers.set(name, this.synthesize(name));
  }

  private synthesize(name: string): AudioBuffer {
    const ctx = this.ctx!, duration = name === "engine" ? 1.2 : name === "win" || name === "fail" ? 0.72 : name === "special" ? 0.58 : 0.24;
    const rate = ctx.sampleRate, buffer = ctx.createBuffer(1, Math.floor(rate * duration), rate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / rate, p = t / duration;
      const env = name === "engine" ? Math.min(1,t/.08)*Math.min(1,(duration-t)/.08)*.2 : Math.pow(Math.max(0,1-p),name==="camera"?8:name==="step"?4:1.8);
      let s = 0;
      if (name === "camera") s = (Math.random()*2-1)*env*.45 + Math.sin(2*Math.PI*1450*t)*env*.12;
      else if (name === "step") s = (Math.random()*2-1)*env*.22 + Math.sin(2*Math.PI*(72+16*Math.sin(t*22))*t)*env*.42;
      else if (name === "special") { const f=120+850*p; s=(Math.sin(2*Math.PI*f*t)*.52+Math.sin(2*Math.PI*f*.5*t)*.2)*env; }
      else if (name === "win") s=(Math.sin(2*Math.PI*523.25*t)+Math.sin(2*Math.PI*659.25*t)+Math.sin(2*Math.PI*783.99*t))/3*env*.4;
      else if (name === "fail") s=Math.sin(2*Math.PI*(330-190*p)*t)*env*.4;
      else if (name === "ui") s=Math.sin(2*Math.PI*(p<.45?660:880)*t)*env*.32;
      else s=(Math.sin(2*Math.PI*62*t)*.55+Math.sin(2*Math.PI*124*t)*.15+(Math.random()*2-1)*.05)*env;
      data[i]=Math.max(-.9,Math.min(.9,s));
    }
    return buffer;
  }

  play(name: string, rate = 1, vol = 1) {
    if (!this.ctx || !this.master) return;
    const b=this.buffers.get(name);if(!b)return;
    const src=this.ctx.createBufferSource();src.buffer=b;src.playbackRate.value=rate;
    const g=this.ctx.createGain();g.gain.value=vol;src.connect(g);g.connect(this.master);src.start();
  }

  startAmbience() {
    if (!this.ctx || !this.master || this.amb) return;
    const ctx=this.ctx, buf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.18;
    const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;
    const f=ctx.createBiquadFilter();f.type="lowpass";f.frequency.value=420;
    const g=ctx.createGain();g.gain.value=.12;src.connect(f);f.connect(g);g.connect(this.master);src.start();
    this.amb={stop:()=>{try{src.stop();}catch{/* already stopped */}}};
  }

  setEngine(on:boolean,speed=0) {
    if(!this.ctx||!this.master)return;
    if(on&&!this.engineSrc){const b=this.buffers.get("engine");if(!b)return;const src=this.ctx.createBufferSource();src.buffer=b;src.loop=true;const g=this.ctx.createGain();g.gain.value=.12;src.connect(g);g.connect(this.master);src.start();this.engineSrc=src;this.engineGain=g;}
    if(!on&&this.engineSrc){try{this.engineSrc.stop();}catch{/* already stopped */}this.engineSrc=null;this.engineGain=null;}
    if(this.engineSrc)this.engineSrc.playbackRate.value=.8+Math.min(1.4,Math.abs(speed)*.08);
  }
}
