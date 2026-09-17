// Installed ONLY in a dedicated simulation process, before importing browser modules.
// Drawing is inert; simulation-side particles/RNG still execute unchanged.
const noop = () => {};
export function makeCanvas() {
  const canvas = { width: 1, height: 1, style: {}, addEventListener: noop, removeEventListener: noop };
  const ctx = { canvas, imageSmoothingEnabled: false,
    getImageData: (x,y,w,h) => ({ data: new Uint8ClampedArray(w*h*4), width:w, height:h }),
    measureText: text => ({ width: String(text).length*6 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }) };
  for (const name of ['clearRect','fillRect','strokeRect','drawImage','putImageData','save','restore','translate','scale','rotate','transform','setTransform','resetTransform','beginPath','closePath','moveTo','lineTo','arc','arcTo','ellipse','rect','roundRect','quadraticCurveTo','bezierCurveTo','fill','stroke','clip','fillText','strokeText','setLineDash']) ctx[name]=noop;
  canvas.getContext=()=>ctx;
  return canvas;
}
export function installHeadless() {
  const data = new Map();
  const audio = () => ({ style:{}, volume:1, currentTime:0, addEventListener:noop, removeEventListener:noop, canPlayType:()=>'', play:()=>Promise.resolve(), pause:noop, load:noop });
  globalThis.document = { createElement: kind => {
    if (kind==='canvas') return makeCanvas();
    if (kind==='audio') return audio();
    throw Error('Unsupported headless DOM element: '+kind);
  }, getElementById:()=>null, addEventListener:noop, removeEventListener:noop };
  globalThis.window = { addEventListener:noop, removeEventListener:noop, devicePixelRatio:1, innerWidth:1280, innerHeight:720 };
  globalThis.localStorage = { getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,String(v)), removeItem:k=>data.delete(k) };
  globalThis.location={protocol:'http:',hostname:'localhost',host:'localhost',origin:'http://localhost',search:''};
  globalThis.requestAnimationFrame=()=>0; globalThis.cancelAnimationFrame=noop;
  // The simulation has no account credentials and must never reach an API.
  globalThis.fetch=async()=>{throw Error('Network disabled in simulation');};
  globalThis.WebSocket=class { constructor(){throw Error('WebSocket disabled in simulation');} };
  return { storage:data };
}
