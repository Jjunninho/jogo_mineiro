// ================================================================
//  music.js — Motor Musical Procedural Autocontido
//  Baseado em theory.js + theory_russel.js + web_audio.js
//  Não depende de iframe, módulos ES ou postMessage.
//
//  API pública:
//    Music.start(mood)           → inicia loop infinito
//    Music.setMood(mood, ms)     → transição suave (default 1400ms)
//    Music.stop()                → para tudo
//
//  Moods disponíveis:
//    'happy' | 'dreamy' | 'neutral' | 'tense' | 'melancholic'
// ================================================================

(function (global) {
'use strict';

// ────────────────────────────────────────────────────────────────
//  THEORY ENGINE  (theory.js inlined)
// ────────────────────────────────────────────────────────────────
const SCALES={major:{i:[0,2,4,5,7,9,11]},minor:{i:[0,2,3,5,7,8,10]},dorian:{i:[0,2,3,5,7,9,10]},phrygian:{i:[0,1,3,5,7,8,10]},pentatonic:{i:[0,2,4,7,9]},lydian:{i:[0,2,4,6,7,9,11]},mixolydian:{i:[0,2,4,5,7,9,10]},harmMinor:{i:[0,2,3,5,7,8,11]},blues:{i:[0,3,5,6,7,10]},wholeTone:{i:[0,2,4,6,8,10]},locrian:{i:[0,1,3,5,6,8,10]},hungarian:{i:[0,2,3,6,7,8,11]}};
const CHORD_SHAPES={triad:[0,2,4],seventh:[0,2,4,6],sus2:[0,1,4],sus4:[0,3,4],power:[0,4],cluster:[0,1,2],add9:[0,2,4,1],shell:[0,2,6]};
const STYLE_PROFILES={heroic:{rhythmDensity:.65,leapChance:.35,chordType:'triad',arpDensity:1,swing:0,octaveSpread:1,fillChance:.3,velocityRange:[95,115]},dark:{rhythmDensity:.45,leapChance:.2,chordType:'seventh',arpDensity:.5,swing:0,octaveSpread:0,fillChance:.15,velocityRange:[70,95]},chaotic:{rhythmDensity:.9,leapChance:.75,chordType:'cluster',arpDensity:2,swing:0,octaveSpread:2,fillChance:.6,velocityRange:[90,127]},minimal:{rhythmDensity:.3,leapChance:.1,chordType:'power',arpDensity:.2,swing:0,octaveSpread:0,fillChance:.05,velocityRange:[60,85]},dreamy:{rhythmDensity:.5,leapChance:.25,chordType:'add9',arpDensity:1.5,swing:.04,octaveSpread:1,fillChance:.1,velocityRange:[65,90]},aggressive:{rhythmDensity:.85,leapChance:.55,chordType:'power',arpDensity:.8,swing:0,octaveSpread:1,fillChance:.5,velocityRange:[100,127]},melancholic:{rhythmDensity:.4,leapChance:.15,chordType:'sus2',arpDensity:.6,swing:.06,octaveSpread:0,fillChance:.08,velocityRange:[60,88]},epic:{rhythmDensity:.7,leapChance:.45,chordType:'seventh',arpDensity:1.2,swing:0,octaveSpread:2,fillChance:.4,velocityRange:[90,120]},jazzy:{rhythmDensity:.55,leapChance:.3,chordType:'shell',arpDensity:.7,swing:.1,octaveSpread:1,fillChance:.35,velocityRange:[72,100]}};
const DRUM_STYLES={rock:{kicks:[0,8],snares:[4,12],hhs:[0,2,4,6,8,10,12,14],openAt:[6,14]},halfTime:{kicks:[0,10],snares:[8],hhs:[0,4,8,12],openAt:[12]},dnb:{kicks:[0,7,10],snares:[4,12],hhs:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],openAt:[]},tribal:{kicks:[0,3,7,11],snares:[6,14],hhs:[0,2,4,6,8,10,12,14],openAt:[4,12]},shuffle:{kicks:[0,9],snares:[4,12],hhs:[0,3,4,7,8,11,12,15],openAt:[7,15]},march:{kicks:[0,4,8,12],snares:[2,6,10,14],hhs:[0,4,8,12],openAt:[]},sparse:{kicks:[0,12],snares:[8],hhs:[0,8],openAt:[8]},fast:{kicks:[0,6,8,14],snares:[4,12,14],hhs:[0,2,4,6,8,10,12,14],openAt:[]},breakbeat:{kicks:[0,5,8,13],snares:[4,10,12],hhs:[0,2,3,4,6,7,8,10,11,12,14,15],openAt:[6,14]}};
const KICK=36,SNARE=38,HHC=42,HHO=46;

let _seed=42;
function seedRng(s){_seed=s>>>0;}
function rng(){_seed=(_seed*1664525+1013904223)>>>0;return _seed/4294967296;}
function ri(a,b){return Math.floor(rng()*(b-a+1))+a;}
function pick(arr){return arr[Math.floor(rng()*arr.length)];}
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function lerp(a,b,t){return a+(b-a)*Math.max(0,Math.min(1,t));}
function easeIn(t,exp){return Math.pow(clamp(t,0,1),exp);}
function scaleNotesList(k,sc,lo,hi){const r=k%12,ivs=SCALES[sc]?SCALES[sc].i:SCALES.major.i,out=[];for(let p=lo;p<=hi;p++)if(ivs.includes((p-r+120)%12))out.push(p);return out;}
function nearestIn(arr,p){if(!arr.length)return p;return arr.reduce((a,b)=>Math.abs(b-p)<Math.abs(a-p)?b:a,arr[0]);}
function stepFrom(arr,p,steps){if(!arr.length)return p;let i=arr.findIndex(n=>n>=p);if(i<0)i=arr.length-1;return arr[Math.max(0,Math.min(arr.length-1,i+steps))];}
function chordPCs(k,sc,deg,ct){const ivs=SCALES[sc]?SCALES[sc].i:SCALES.major.i,len=ivs.length,r=k%12,sh=CHORD_SHAPES[ct]||CHORD_SHAPES.triad;return sh.map(o=>(r+ivs[(deg+o)%len])%12);}
function chordTones(sn,pcs){return sn.filter(n=>pcs.includes(n%12));}
const RD=[[.5,.5,.5,.5,.5,.5,1],[.25,.25,.5,.25,.25,.5,.5,.5],[.5,.25,.25,.5,.5,.5,.5],[.25,.25,.25,.25,.5,.5,.5,.5],[.5,.5,.25,.25,.5,.5,.5]];
const RM=[[1,.5,.5,1,1],[.5,.5,.5,.5,2],[1,1,1,1],[.5,.5,1,.5,.5,1],[1.5,.5,1,1],[1,.5,.5,.5,.5,1],[2,1,.5,.5]];
const RS=[[2,2],[1.5,.5,2],[2,1,1],[1,3],[3,1],[1.5,1.5,1]];
function getRhythmPool(d){return d>=.75?RD:d>=.45?RM:RS;}
const BASS_PATS=[(r,f)=>[{p:r,b:0,d:.9},{p:f,b:1,d:.4},{p:r,b:2,d:.9},{p:f,b:3,d:.4}],(r,f)=>[{p:r,b:0,d:1.9},{p:f,b:2,d:1.9}],(r,f,sc)=>[{p:r,b:0,d:.9},{p:stepFrom(sc,r,1),b:1,d:.9},{p:f,b:2,d:.9},{p:stepFrom(sc,f,1),b:3,d:.9}],(r,f)=>[{p:r,b:0,d:.4},{p:r+12,b:.5,d:.4},{p:f,b:1,d:.4},{p:r,b:1.5,d:.4},{p:r,b:2,d:.4},{p:r+12,b:2.5,d:.4},{p:f,b:3,d:.4},{p:r,b:3.5,d:.4}],(r)=>[{p:r,b:0,d:3.9}],(r,f)=>[{p:r,b:0,d:.4},{p:f,b:.75,d:.4},{p:r,b:1.5,d:.4},{p:f,b:2.25,d:.4},{p:r,b:3,d:.9}],(r,f,sc)=>[{p:r,b:0,d:.4},{p:stepFrom(sc,r,2),b:.5,d:.4},{p:f,b:1,d:.4},{p:stepFrom(sc,f,-1),b:1.5,d:.4},{p:r,b:2,d:.4},{p:stepFrom(sc,r,1),b:2.5,d:.4},{p:f,b:3,d:.4},{p:r,b:3.5,d:.4}],(r,f)=>[{p:r,b:0,d:.2},{p:r,b:.25,d:.2},{p:f,b:.75,d:.4},{p:r,b:1.5,d:.2},{p:r,b:2,d:.2},{p:f,b:2.5,d:.4},{p:r,b:3.25,d:.2},{p:r,b:3.75,d:.2}]];
const ARP_SHAPES=[[0,1,2,1],[0,1,2,3],[3,2,1,0],[0,2,1,3],[2,0,3,1],[0,1,2,3,2,1],[0,2,4,2],[0,3,1,2]];

function tensionCurve(barIdx,totalBars,momentum,profile){
  const t=barIdx/Math.max(totalBars-1,1);
  let base;
  if(profile==='static') base=0.58+momentum*0.1;
  else if(profile==='wave') base=0.5+Math.sin(t*Math.PI*2.5)*0.42;
  else if(profile==='decay') base=1.0-Math.pow(t,0.6)*0.80;
  else if(profile==='spike'){const pk=0.35,raw=t<pk?t/pk:1-((t-pk)/(1-pk));base=Math.pow(Math.max(0,raw),0.65);}
  else{if(t<0.15)base=t/0.15;else if(t<0.60)base=1.0;else if(t<0.85)base=1-(t-0.60)/0.25*0.5;else base=0.5-(t-0.85)/0.15*0.5;}
  return clamp(base+clamp(momentum*0.2,-0.3,0.3),0,1);
}

function buildGenome(cfg){
  const arousal=cfg.arousal??0.5,valence=cfg.valence??0,momentum=cfg.emotionalMomentum??0,dissonance=cfg.dissonance??0.2,density=cfg.noteDensity??0.5;
  const regBase=clamp(0.5+momentum*0.3,0.2,0.8);
  const registerBias=cfg.registerBiasOverride!=null?lerp(regBase,cfg.registerBiasOverride,0.7):regBase;
  const syncopBase=clamp(density*0.4,0,0.5);
  const syncopationBias=syncopBase;
  const mutationRate=clamp(0.15+arousal*0.25+dissonance*0.15,0.10,0.45);
  return{motifRhythmIdx:ri(0,4),motifContour:momentum>0.3?'up':momentum<-0.3?'down':'arch',motifLeapSize:Math.floor(1+arousal*3),mutationRate,repetitionTolerance:clamp(0.6-arousal*0.3,0.2,0.7),tensionBias:dissonance,registerBias,ornamentChance:clamp(0.05+(1-arousal)*0.15,0,0.3),syncopationBias,bassPatIdx:clamp(Math.floor(density*BASS_PATS.length),0,BASS_PATS.length-1),arpShapeIdx:ri(0,ARP_SHAPES.length-1),generation:0};
}

function mutateGenome(genome,memory,cfg){
  const arousal=cfg.arousal??0.5,barIdx=genome.generation;
  const g={...genome,generation:barIdx+1};
  const effectiveRate=clamp(genome.mutationRate+0.1,0.05,0.65);
  if(rng()<effectiveRate){const cs=['up','down','arch','flat'];if(rng()<0.4)g.motifContour=cs[ri(0,cs.length-1)];g.syncopationBias=clamp(g.syncopationBias+(rng()-0.5)*0.1,0,0.6);}
  if(barIdx%4===0){if(rng()<effectiveRate*0.7)g.bassPatIdx=ri(0,BASS_PATS.length-1);if(rng()<effectiveRate*0.5)g.arpShapeIdx=ri(0,ARP_SHAPES.length-1);}
  if(barIdx>0&&barIdx%8===0){if(rng()<effectiveRate*0.6)g.motifRhythmIdx=ri(0,4);if(rng()<0.4)g.registerBias=clamp(1-g.registerBias+(rng()-0.5)*0.2,0.2,0.8);}
  return g;
}

function buildPhraseSnapshot(notes){
  if(!notes.length)return{pitchMean:0,density:0,intervalMean:0};
  const pitches=notes.map(n=>n.pitch),pitchMean=pitches.reduce((a,b)=>a+b,0)/pitches.length;
  let intSum=0;for(let i=1;i<pitches.length;i++)intSum+=Math.abs(pitches[i]-pitches[i-1]);
  return{pitchMean,density:notes.length,intervalMean:pitches.length>1?intSum/(pitches.length-1):0};
}

function humanizeNote(note,amount){
  if(!amount||amount<0.01)return note;
  const n={...note};
  n.startBeat=Math.max(0,n.startBeat+(rng()-0.5)*amount*0.16);
  n.duration=Math.max(0.05,n.duration*(1+(rng()-0.5)*amount*0.24));
  n.velocity=clamp(n.velocity+Math.round((rng()-0.5)*amount*20),1,127);
  return n;
}

function applyLayerMult(notes,mult){
  if(!mult||mult===1)return notes;
  return notes.map(n=>({...n,velocity:clamp(Math.round(n.velocity*mult),1,127)}));
}

function genMelody(notes,scNotes,pcs,cTones,bOff,barIdx,rhythmIdx,dir,vary,style,rhythmPool,isTurn,isEnd,genome,dissonance){
  const ridx2=(barIdx%2===0)?rhythmIdx:(rhythmIdx+2)%rhythmPool.length;
  const pat=rhythmPool[ridx2],swing=style.swing||0;
  const[velLo,velHi]=style.velocityRange||[80,110];
  const contourDir=genome?.motifContour??dir;
  const pool=cTones.length?cTones:scNotes;
  let startPitch=contourDir==='up'?pool[0]:contourDir==='down'?pool[pool.length-1]:pool[Math.floor(pool.length/2)];
  const registerBias=genome?.registerBias??0.5;
  while(startPitch<60+(registerBias-0.5)*12)startPitch+=12;
  while(startPitch>84-(0.5-Math.min(registerBias,0.5))*12)startPitch-=12;
  startPitch=Math.max(60,Math.min(84,startPitch));
  const octave=style.octaveSpread>0&&rng()<0.15*style.octaveSpread?(rng()<0.5?12:-12):0;
  let prevPitch=startPitch+octave,beat=bOff;
  for(let i=0;i<pat.length&&beat-bOff<4;i++){
    const dur=pat[i];
    if(vary>0&&rng()<vary&&i>0){beat+=dur;continue;}
    const t0=beat+(rng()<(genome?.syncopationBias??0)?0.125:0);
    let pitch;
    if(i===0){pitch=nearestIn(pool,prevPitch);}
    else{
      const leapSize=genome?.motifLeapSize??2;
      const dirBias=contourDir==='up'?1:contourDir==='down'?-1:(i<pat.length/2?1:-1);
      const jump=rng()<style.leapChance?ri(-leapSize,leapSize):(rng()<0.7?dirBias:2*dirBias);
      const candidate=stepFrom(scNotes,prevPitch,jump);
      const isStrong=Number.isInteger(beat-bOff)&&(beat-bOff)%2===0;
      const useChordTone=dissonance!=null?rng()>dissonance:rng()<0.6;
      pitch=(isStrong&&useChordTone&&cTones.length)?nearestIn(cTones,candidate):candidate;
    }
    while(pitch<60)pitch+=12;while(pitch>84)pitch-=12;
    if(isTurn&&i===0&&scNotes.length>0)pitch=stepFrom(scNotes,pitch,1);
    if(isEnd&&i===pat.length-1&&cTones.length){pitch=cTones[0];while(pitch<60)pitch+=12;}
    const vel=(i===0||Number.isInteger(beat-bOff))?ri(Math.min(velLo+15,velHi),velHi):ri(velLo,velLo+20);
    notes.push({pitch,startBeat:t0,duration:dur*0.88,velocity:vel});
    prevPitch=pitch;beat+=dur;
  }
}

function genBass(notes,scNotes,pcs,cTones,bOff,style,bassPatIdx){
  if(!cTones.length)return;
  const r=cTones[0],f=cTones[1]||(r+7<=59?r+7:r-5);
  const patIdx=bassPatIdx!=null?bassPatIdx%BASS_PATS.length:(style.rhythmDensity<0.4?pick([0,1,4]):style.rhythmDensity<0.65?pick([0,1,2,5]):pick([2,3,5,6,7]));
  const evs=BASS_PATS[patIdx](r,f,scNotes);
  const[vLo,vHi]=style.velocityRange||[80,105];
  for(const ev of evs){let p=ev.p;while(p<36)p+=12;while(p>59)p-=12;notes.push({pitch:p,startBeat:bOff+ev.b,duration:ev.d,velocity:ri(vLo,vHi)});}
}

function genArp(notes,scNotes,pcs,bOff,style,arpShapeIdx){
  const cTones=chordTones(scNotes,pcs).slice(0,4);
  if(cTones.length<2)return;
  const density=style.arpDensity||1;if(rng()>density&&density<1)return;
  const shape=ARP_SHAPES[arpShapeIdx!=null?arpShapeIdx%ARP_SHAPES.length:ri(0,ARP_SHAPES.length-1)];
  const step=density>=1.5?0.25:density>=1?0.5:1,count=Math.floor(4/step);
  const[vLo,vHi]=style.velocityRange||[60,80];
  for(let i=0;i<count;i++){const idx=shape[i%shape.length]%cTones.length;notes.push({pitch:cTones[idx],startBeat:bOff+i*step,duration:step*0.75,velocity:ri(Math.max(40,vLo-20),Math.max(60,vHi-20))});}
}

function genDrums(drums,bOff,drumStyle,style,isFill,barIdx){
  const[vLo,vHi]=style.velocityRange||[80,110];
  for(const p of drumStyle.kicks)drums.push({pitch:KICK,startBeat:bOff+p/4,duration:.1,velocity:ri(Math.min(vHi,105),Math.min(vHi+5,115)),isDrum:true});
  for(const p of drumStyle.snares)drums.push({pitch:SNARE,startBeat:bOff+p/4,duration:.1,velocity:ri(Math.min(vHi-10,95),Math.min(vHi,108)),isDrum:true});
  for(let i=0;i<drumStyle.hhs.length;i++){const p=drumStyle.hhs[i],open=drumStyle.openAt&&drumStyle.openAt.includes(p);drums.push({pitch:open?HHO:HHC,startBeat:bOff+p/4,duration:.1,velocity:ri(Math.max(50,vLo-25),Math.max(75,vHi-30)),isDrum:true});}
  if(barIdx===0)drums.push({pitch:49,startBeat:bOff,duration:.1,velocity:ri(85,95),isDrum:true});
  if(isFill)[2.5,2.75,3,3.25,3.5,3.75].forEach((fb,i)=>drums.push({pitch:[45,43,41,38,38,49][i],startBeat:bOff+fb,duration:.1,velocity:ri(90,115),isDrum:true}));
}

function generateBlock(cfg,genomeIn,memoryIn,blockOffset){
  blockOffset=blockOffset||0;
  const{key,bars}=cfg,sc=cfg.scale||'major',prog=cfg.prog||[0,3,4,0];
  const styleName=cfg.style||'heroic',style={...(STYLE_PROFILES[styleName]||STYLE_PROFILES.heroic)};
  const drumStyleName=cfg.drumStyle||'rock',drumStyle=DRUM_STYLES[drumStyleName]||DRUM_STYLES.rock;
  const noteDensity=cfg.noteDensity??null,dissonance=cfg.dissonance??null;
  const humanizeAmount=cfg.humanizeAmount??0,emotionalMomentum=cfg.emotionalMomentum??0;
  const tensaoProfile=cfg.tensaoProfile??'surge',layerMults=cfg.layerMults??null;
  if(noteDensity!=null)style.rhythmDensity=clamp(noteDensity,0.20,0.95);
  if(dissonance!=null){style.leapChance=clamp(style.leapChance+dissonance*0.25,0.05,0.85);if(dissonance>0.5&&style.chordType==='triad')style.chordType='seventh';if(dissonance>0.65)style.chordType='cluster';}
  if(cfg.velocityLo!=null&&cfg.velocityHi!=null)style.velocityRange=[cfg.velocityLo,cfg.velocityHi];
  const sMel=scaleNotesList(key,sc,60,84),sBass=scaleNotesList(key,sc,36,59),sArp=scaleNotesList(key,sc,60,84);
  const melody=[],bass=[],arp=[],drums=[];
  const rhythmPool=getRhythmPool(style.rhythmDensity);
  let genome=genomeIn||buildGenome({arousal:cfg._emotion?.arousal??0.5,valence:cfg._emotion?.valence??0,emotionalMomentum,dissonance:dissonance??0.2,noteDensity:noteDensity??0.5,registerBiasOverride:cfg.registerBiasOverride??null});
  const phraseMemory=memoryIn?[...memoryIn]:[],modPoint=Math.floor(bars/2);
  for(let bar=0;bar<bars;bar++){
    const globalBar=blockOffset+bar,tension=tensionCurve(bar,bars,emotionalMomentum,tensaoProfile);
    const dynStyle={...style};
    dynStyle.rhythmDensity=clamp(style.rhythmDensity*(0.7+tension*0.6),0.15,1.0);
    const velBase=style.velocityRange||[80,110],velBoost=Math.round(tension*20);
    dynStyle.velocityRange=[clamp(velBase[0]+velBoost-10,30,110),clamp(velBase[1]+velBoost,50,127)];
    const deg=prog[globalBar%prog.length],bOff=bar*4;
    const pcs=chordPCs(key,sc,deg,dynStyle.chordType),cTones=chordTones(sMel,pcs),cTBass=chordTones(sBass,pcs);
    const vary=(globalBar>=4&&globalBar>=prog.length)?0.25:0;
    const isTurn=(bar===modPoint),isEnd=(bar===bars-1),isFill=(bar===bars-2)&&rng()<dynStyle.fillChance;
    genome=mutateGenome(genome,phraseMemory,{arousal:cfg._emotion?.arousal??0.5,emotionalMomentum});
    const rhythmIdx=genome.motifRhythmIdx%rhythmPool.length;
    const barMelody=[];
    genMelody(barMelody,sMel,pcs,cTones,bOff,bar,rhythmIdx,genome.motifContour,vary,dynStyle,rhythmPool,isTurn,isEnd,genome,dissonance);
    const melHum=humanizeAmount>0?barMelody.map(n=>humanizeNote(n,humanizeAmount)):barMelody;
    melody.push(...applyLayerMult(melHum,layerMults?.melody));
    phraseMemory.push(buildPhraseSnapshot(barMelody));
    if(phraseMemory.length>8)phraseMemory.shift();
    const barBass=[];genBass(barBass,sBass,pcs,cTBass,bOff,dynStyle,genome.bassPatIdx);
    bass.push(...applyLayerMult(humanizeAmount>0.2?barBass.map(n=>humanizeNote(n,humanizeAmount*0.5)):barBass,layerMults?.bass));
    const barArp=[];genArp(barArp,sArp,pcs,bOff,dynStyle,genome.arpShapeIdx);
    arp.push(...applyLayerMult(barArp,layerMults?.arp));
    const barDrums=[];genDrums(barDrums,bOff,drumStyle,dynStyle,isFill,globalBar);
    drums.push(...applyLayerMult(barDrums,layerMults?.drums));
  }
  return{song:{melody,bass,arp,drums,counter:[]},genome,memory:phraseMemory};
}

// ────────────────────────────────────────────────────────────────
//  EMOTION ENGINE  (theory_russel.js inlined, simplificado)
// ────────────────────────────────────────────────────────────────
const QUADRANT_CENTERS={positive_high:{vc:.6,ac:.75},positive_low:{vc:.6,ac:.20},negative_high:{vc:-.6,ac:.75},negative_low:{vc:-.6,ac:.20},neutral:{vc:.0,ac:.45}};
const EMOTION_SCALES={positive_high:['major','lydian','pentatonic','mixolydian'],positive_low:['major','pentatonic','wholeTone','dorian'],negative_high:['phrygian','locrian','blues','dorian'],negative_low:['minor','harmMinor','hungarian','phrygian'],neutral:['dorian','mixolydian','pentatonic','blues']};
const EMOTION_STYLES={positive_high:['heroic','epic','aggressive','chaotic'],positive_low:['dreamy','minimal','jazzy','melancholic'],negative_high:['aggressive','chaotic','dark','epic'],negative_low:['melancholic','dark','minimal','dreamy'],neutral:['jazzy','minimal','dreamy','heroic']};
const EMOTION_DRUMS={positive_high:['rock','fast','dnb','breakbeat'],positive_low:['shuffle','halfTime','sparse','march'],negative_high:['dnb','breakbeat','fast','tribal'],negative_low:['sparse','halfTime','shuffle','march'],neutral:['shuffle','rock','halfTime','tribal']};
const PROGRESSIONS={consonant:[[0,3,4,0],[0,5,3,4],[0,4,3,0],[0,3,5,4]],moderate:[[0,5,3,4],[0,3,5,1],[0,6,3,4],[0,2,5,3]],tense:[[0,1,5,4],[0,1,3,5],[0,6,1,5],[0,4,1,5]],dissonant:[[0,1,5,0],[0,1,4,5],[0,6,5,1],[0,1,0,5]]};

function getQuadrant(v,a){let bq='neutral',bd=Infinity;for(const[n,c]of Object.entries(QUADRANT_CENTERS)){const dv=(v-c.vc)/2,da=a-c.ac,d=Math.sqrt(dv*dv+da*da);if(d<bd){bd=d;bq=n;}}return bq;}

function _inferTensaoProfile(v,a){if(a>0.85)return'spike';if(a<0.20)return'static';if(v<-0.6)return'decay';if(v>0.5&&a>0.5)return'surge';return'wave';}

function emotionToCfg(v,a,seed,bars){
  seedRng(seed);
  v=clamp(v,-1,1);a=clamp(a,0,1);
  const q=getQuadrant(v,a);
  const bpm=Math.round(lerp(60,180,easeIn(a,1.2))+(v*10));
  const sl=EMOTION_SCALES[q]||EMOTION_SCALES.neutral;
  const scale=sl[clamp(Math.floor((0.6*Math.abs(v)+0.4*a)*(sl.length-1)),0,sl.length-1)];
  const stl=EMOTION_STYLES[q]||EMOTION_STYLES.neutral;
  const style=stl[clamp(Math.floor(a*(stl.length-1)),0,stl.length-1)];
  const dl=EMOTION_DRUMS[q]||EMOTION_DRUMS.neutral;
  const drumStyle=dl[clamp(Math.floor(a*(dl.length-1)),0,dl.length-1)];
  const tension=1-Math.abs(v);
  let pp;if(tension<0.25)pp=PROGRESSIONS.consonant;else if(tension<0.50)pp=PROGRESSIONS.moderate;else if(tension<0.75)pp=PROGRESSIONS.tense;else pp=PROGRESSIONS.dissonant;
  const pi=v<0?pp.length-1-Math.floor(Math.abs(v)*(pp.length-1)):Math.floor(v*(pp.length-1));
  const prog=pp[clamp(pi,0,pp.length-1)];
  const bk=[60,67,62,64,69],dk=[57,61,56,63,59],kp=v>=0?bk:dk;
  const key=kp[clamp(Math.floor(Math.abs(v)*(kp.length-1)),0,kp.length-1)];
  const noteDensity=lerp(0.20,0.90,a);
  const dissonanceCalc=v<0?lerp(0.2,0.7,Math.abs(v)):0.1;
  const emotionalMomentum=lerp(-1,1,(v+1)/2)*easeIn(a,1.5);
  const tensaoProfile=_inferTensaoProfile(v,a);
  return{key,scale,bpm,bars,seed,prog,style,drumStyle,noteDensity,dissonance:dissonanceCalc,humanizeAmount:lerp(0.15,0.02,a),emotionalMomentum,velocityLo:Math.round(lerp(45,90,a)),velocityHi:Math.round(lerp(72,127,a)),tensaoProfile,registerBiasOverride:clamp(0.5+emotionalMomentum*0.2,0.2,0.8),_emotion:{valence:v,arousal:a}};
}

// ────────────────────────────────────────────────────────────────
//  AUDIO SCHEDULER  (web_audio.js inlined)
// ────────────────────────────────────────────────────────────────
let _audioCtx = null;
let _masterGain = null;
let _scheduledNodes = [];
let _isPlaying = false;
let _schedulerTimer = null;
let _nextNoteIndices = {melody:0,bass:0,arp:0,drums:0,counter:0};
let _globalStartBeat = 0;
let _playAbsStartTime = 0;
let _currentSong = null;
let _currentBpm = 100;

// Infinite mode
let _infiniteMode = false;
let _infiniteCfg = null;
let _infiniteGenome = null;
let _infiniteMemory = [];
let _infiniteBlockOffset = 0;
let _infiniteTotalBeats = 0;

const LOOKAHEAD = 25;
const SCHEDULE_AHEAD = 0.5;

function _getCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function _initMasterGain() {
  if (_masterGain) return;
  const ctx = _getCtx();
  _masterGain = ctx.createGain();
  _masterGain.gain.value = 0.28;

  // Reverb de caverna
  const convolver = ctx.createConvolver();
  const rate = ctx.sampleRate, length = rate * 3.0;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let i = 0; i < length; i++) {
    const decay = Math.exp(-i / (rate * 0.6));
    impulse.getChannelData(0)[i] = (Math.random() * 2 - 1) * decay;
    impulse.getChannelData(1)[i] = (Math.random() * 2 - 1) * decay;
  }
  convolver.buffer = impulse;
  const wet = ctx.createGain(); wet.gain.value = 0.6;
  const dry = ctx.createGain(); dry.gain.value = 0.5;
  _masterGain.connect(dry); dry.connect(ctx.destination);
  _masterGain.connect(convolver); convolver.connect(wet); wet.connect(ctx.destination);
}

function _midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function _playNote(pitch, startSec, durSec, velocity, isDrum) {
  const ctx = _getCtx();
  _initMasterGain();
  const gain = ctx.createGain();
  gain.connect(_masterGain);
  const vol = (velocity / 127) * 0.18;

  if (isDrum) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 2000);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = pitch === KICK ? 'lowpass' : pitch === SNARE ? 'bandpass' : 'highpass';
    filter.frequency.value = pitch === KICK ? 120 : pitch === SNARE ? 1800 : 8000;
    src.connect(filter); filter.connect(gain);
    gain.gain.setValueAtTime(vol * (pitch===KICK?2.5:pitch===SNARE?1.8:0.6), startSec);
    gain.gain.exponentialRampToValueAtTime(0.001, startSec + 0.12);
    src.start(startSec); src.stop(startSec + 0.15);
    _scheduledNodes.push({node:src,gain,endTime:startSec+0.15});
    return;
  }

  const osc = ctx.createOscillator();
  osc.frequency.value = _midiToFreq(pitch);
  if (pitch < 48) {
    osc.type = 'sawtooth';
    osc.connect(gain);
  } else if (pitch < 60) {
    osc.type = 'triangle';
    osc.connect(gain);
  } else {
    osc.type = 'square';
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = 1200 + (pitch - 60) * 40;
    osc.connect(lp); lp.connect(gain);
  }
  gain.gain.setValueAtTime(0, startSec);
  gain.gain.linearRampToValueAtTime(vol, startSec + 0.01);
  gain.gain.setValueAtTime(vol * 0.7, startSec + Math.min(0.05, durSec * 0.3));
  gain.gain.linearRampToValueAtTime(0, startSec + durSec);
  osc.start(startSec); osc.stop(startSec + durSec + 0.01);
  _scheduledNodes.push({node:osc,gain,endTime:startSec+durSec+0.01});
}

function _cleanNodes() {
  const now = _audioCtx ? _audioCtx.currentTime : 0;
  _scheduledNodes = _scheduledNodes.filter(item => {
    if (now > item.endTime + 0.1) {
      try{item.node.disconnect();item.gain.disconnect();}catch(e){}
      return false;
    }
    return true;
  });
}

function _appendInfiniteBlock() {
  if (!_infiniteCfg) return;
  const barsPerBlock = _infiniteCfg.bars || 8;
  const blockOffset  = _infiniteBlockOffset;
  const result = generateBlock(_infiniteCfg, _infiniteGenome, _infiniteMemory, blockOffset);
  const shift = (b) => b + blockOffset * 4;
  for (const n of result.song.melody)  _currentSong.melody.push({...n,startBeat:shift(n.startBeat)});
  for (const n of result.song.bass)    _currentSong.bass.push({...n,startBeat:shift(n.startBeat)});
  for (const n of result.song.arp)     _currentSong.arp.push({...n,startBeat:shift(n.startBeat)});
  for (const n of result.song.drums)   _currentSong.drums.push({...n,startBeat:shift(n.startBeat)});
  _infiniteGenome      = result.genome;
  _infiniteMemory      = result.memory;
  _infiniteBlockOffset += barsPerBlock;
  _infiniteTotalBeats  += barsPerBlock * 4;
}

function _scheduler() {
  if (!_isPlaying) return;
  const ctx = _getCtx();
  const now = ctx.currentTime;
  const scheduleUntil = now + SCHEDULE_AHEAD;
  const bps = _currentBpm / 60;

  if (_infiniteMode) {
    const elapsed = _globalStartBeat + (now - _playAbsStartTime) * bps;
    if (_infiniteTotalBeats - elapsed < 16) _appendInfiniteBlock();
  }

  for (const tname of ['melody','bass','arp','drums','counter']) {
    const notes = _currentSong[tname] || [];
    let idx = _nextNoteIndices[tname] || 0;
    while (idx < notes.length) {
      const note = notes[idx];
      const offset = note.startBeat - _globalStartBeat;
      if (offset < 0) { idx++; continue; }
      const absTime = _playAbsStartTime + (offset / bps);
      if (absTime < scheduleUntil) {
        _playNote(note.pitch, absTime, note.duration / bps, note.velocity, note.isDrum);
        idx++;
      } else break;
    }
    _nextNoteIndices[tname] = idx;
  }

  _cleanNodes();

  if (!_infiniteMode) {
    const bars = (_currentSong._cfg?.bars) || 8;
    const endAbs = _playAbsStartTime + ((bars * 4 - _globalStartBeat) / bps);
    if (now >= endAbs) { _stopEngine(); return; }
  }

  _schedulerTimer = setTimeout(_scheduler, LOOKAHEAD);
}

function _stopEngine() {
  clearTimeout(_schedulerTimer);
  for (const item of _scheduledNodes) {
    try{item.node.stop();}catch(e){}
    try{item.node.disconnect();item.gain.disconnect();}catch(e){}
  }
  _scheduledNodes = [];
  _isPlaying = false;
}

function _playFrom(song, bpm, genome, memory, startBeat) {
  _stopEngine();
  const ctx = _getCtx();
  _currentSong   = song;
  _currentBpm    = bpm;
  _isPlaying     = true;
  _globalStartBeat = startBeat || 0;
  _nextNoteIndices = {melody:0,bass:0,arp:0,drums:0,counter:0};
  _playAbsStartTime = ctx.currentTime + 0.08;

  if (_infiniteMode && song._cfg) {
    _infiniteCfg         = song._cfg;
    _infiniteGenome      = genome;
    _infiniteMemory      = memory ? [...memory] : [];
    _infiniteBlockOffset = song._cfg.bars || 8;
    _infiniteTotalBeats  = (song._cfg.bars || 8) * 4;
  }

  _scheduler();
}

// ────────────────────────────────────────────────────────────────
//  FADE HELPER
// ────────────────────────────────────────────────────────────────
function _fadeGain(toValue, ms) {
  return new Promise(resolve => {
    if (!_masterGain) { resolve(); return; }
    const steps = 20, interval = Math.max(16, ms / steps);
    const from = _masterGain.gain.value;
    let step = 0;
    const t = setInterval(() => {
      step++;
      _masterGain.gain.value = from + (toValue - from) * (step / steps);
      if (step >= steps) { _masterGain.gain.value = toValue; clearInterval(t); resolve(); }
    }, interval);
  });
}

// ────────────────────────────────────────────────────────────────
//  PUBLIC API
// ────────────────────────────────────────────────────────────────
const MOOD_PRESETS = {
  happy:       { valence:  0.45, arousal: 0.58 },
  dreamy:      { valence:  0.22, arousal: 0.42 },
  neutral:     { valence:  0.00, arousal: 0.32 },
  tense:       { valence: -0.22, arousal: 0.46 },
  melancholic: { valence: -0.38, arousal: 0.24 },
};

let _currentMood = null;
let _transitioning = false;

const Music = {

  // Inicia a música (com fade-in). Usa loop infinito automático.
  start(mood) {
    mood = mood || 'happy';
    _currentMood = mood;
    const preset = MOOD_PRESETS[mood] || MOOD_PRESETS.happy;
    const seed   = Math.floor(Math.random() * 99999);
    const bars   = 8;

    // Garante que o AudioContext seja criado no contexto de um gesto do usuário
    _getCtx();
    _initMasterGain();

    const cfg  = emotionToCfg(preset.valence, preset.arousal, seed, bars);
    const result = generateBlock(cfg, null, null, 0);
    result.song._cfg    = cfg;
    result.song.counter = [];

    _infiniteMode = true;
    if (_masterGain) _masterGain.gain.value = 0;
    _playFrom(result.song, cfg.bpm, result.genome, result.memory, 0);
    _fadeGain(0.28, 600);
  },

  // Transição suave para outro mood
  setMood(mood, ms) {
    if (mood === _currentMood) return;
    if (_transitioning) return;
    _transitioning = true;
    _currentMood = mood;
    ms = ms || 1400;

    _fadeGain(0, 150).then(() => {
      _stopEngine();
      const preset = MOOD_PRESETS[mood] || MOOD_PRESETS.neutral;
      const seed   = Math.floor(Math.random() * 99999);
      const bars   = 8;
      const cfg    = emotionToCfg(preset.valence, preset.arousal, seed, bars);
      const result = generateBlock(cfg, null, null, 0);
      result.song._cfg    = cfg;
      result.song.counter = [];

      _infiniteMode = true;
      _playFrom(result.song, cfg.bpm, result.genome, result.memory, 0);
      _fadeGain(0.28, 500).then(() => { _transitioning = false; });
    });
  },

  // Para tudo
  stop() {
    _fadeGain(0, 200).then(() => {
      _stopEngine();
      _infiniteMode = false;
      _currentMood  = null;
      _transitioning = false;
    });
  },

  // Retorna o mood atual
  getMood() { return _currentMood; },
};

global.Music = Music;

})(window);
