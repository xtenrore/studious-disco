import React,{useEffect,useRef,useState} from 'react';
import {Terminal as XTerm} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import {WebLinksAddon} from '@xterm/addon-web-links';
import {Clipboard,Copy,ArrowUp,ArrowDown,ArrowLeft,ArrowRight,Maximize2,Send,X,ChevronsUp,ChevronsDown} from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
export default function Terminal({visible,onStatus}) {
  const container=useRef(),term=useRef(),connection=useRef(),fitRef=useRef(),input=useRef(()=>{}),history=useRef(false),commands=useRef(Promise.resolve());
  const [draft,setDraft]=useState(null),[ctrl,setCtrl]=useState(false),[notice,setNotice]=useState(''),[inHistory,setInHistory]=useState(false);
  // tmux commands work even when AGY uses the terminal's alternate screen.
  // They target copy mode, rather than sending page keys into the agent.
  const tmuxCommand=command=>{commands.current=commands.current.then(async()=>{if(connection.current?.readyState!==1)return;input.current('\x02:');await new Promise(resolve=>setTimeout(resolve,80));if(connection.current?.readyState!==1)return;input.current(command+'\r');await new Promise(resolve=>setTimeout(resolve,80));});};
  function scroll(lines){
    if(!term.current||!lines)return;
    if(term.current.buffer.active.type==='normal'&&term.current.buffer.active.baseY>0&&!history.current){term.current.scrollLines(lines);return;}
    const action=`send-keys -X -N ${Math.abs(lines)} ${lines<0?'scroll-up':'scroll-down'}`;
    tmuxCommand(history.current?action:`copy-mode ; ${action}`);
    history.current=true;setInHistory(true);
  }
  function live(){if(history.current)tmuxCommand('send-keys -X cancel');history.current=false;setInHistory(false);term.current?.scrollToBottom();}
  useEffect(()=>{
    const terminal=new XTerm({cursorBlink:true,fontSize:14,fontFamily:'"SFMono-Regular", Consolas, "Liberation Mono", monospace',lineHeight:1.3,scrollback:50000,convertEol:false,allowProposedApi:false,theme:{background:'#111614',foreground:'#dce6de',cursor:'#c8f19b',selectionBackground:'#43613d',black:'#111614',red:'#f28a82',green:'#bce88f',yellow:'#ead296',blue:'#93b9e9',magenta:'#d3a2db',cyan:'#8dd6c8',white:'#dce6de'}});
    const fit=new FitAddon();terminal.loadAddon(fit);terminal.loadAddon(new WebLinksAddon((event,url)=>{event.preventDefault();const u=new URL(url);if(['https:','http:'].includes(u.protocol))window.open(url,'_blank','noopener,noreferrer');}));
    terminal.open(container.current);term.current=terminal;fitRef.current=fit;
    let stopped=false,retry=null,attempt=0,ready=false,queue=[],sending=false;
    function resize(){try{if(container.current?.clientWidth && container.current?.clientHeight){fit.fit();if(ready && connection.current?.readyState===1)connection.current.send(JSON.stringify({type:'resize',cols:terminal.cols,rows:terminal.rows}));}}catch{}}
    async function flush(){if(sending)return;sending=true;while(queue.length && ready && connection.current?.readyState===1){if(connection.current.bufferedAmount>262144){await new Promise(r=>setTimeout(r,20));continue;}connection.current.send(JSON.stringify({type:'input',data:queue.shift()}));await new Promise(r=>setTimeout(r,0));}sending=false;}
    input.current=data=>{if(!ready){setNotice('Reconnect before entering text.');return;}if(data.length>2*1024*1024){setNotice('Paste up to 2 MB at a time.');return;}for(let i=0;i<data.length;){let end=Math.min(i+8192,data.length);if(end<data.length&&/[\uD800-\uDBFF]/.test(data[end-1]))end--;queue.push(data.slice(i,end));i=end;}flush();};
    const sub=terminal.onData(data=>input.current(data));
    const element=container.current;let touchY=null;
    const touchStart=event=>{touchY=event.touches.length===1?event.touches[0].clientY:null;};
    const touchMove=event=>{
      if(touchY===null||event.touches.length!==1)return;
      const y=event.touches[0].clientY,lines=Math.trunc((touchY-y)/18);
      if(!lines)return;
      event.preventDefault();event.stopImmediatePropagation();touchY+=lines*18;
      scroll(Math.max(-30,Math.min(lines,30)));
    };
    const touchEnd=()=>{touchY=null;};
    const wheel=event=>{
      if(event.ctrlKey||(!history.current&&terminal.buffer.active.type==='normal'&&terminal.buffer.active.baseY>0))return;
      event.preventDefault();event.stopImmediatePropagation();scroll(Math.sign(event.deltaY)*3);
    };
    element.addEventListener('touchstart',touchStart,{capture:true,passive:true});
    element.addEventListener('touchmove',touchMove,{capture:true,passive:false});
    element.addEventListener('touchend',touchEnd,{capture:true,passive:true});
    element.addEventListener('touchcancel',touchEnd,{capture:true,passive:true});
    element.addEventListener('wheel',wheel,{capture:true,passive:false});
    function connect(){if(stopped)return;clearTimeout(retry);if(connection.current && [0,1].includes(connection.current.readyState))return;onStatus('connecting');ready=false;
      const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws/terminal`);connection.current=ws;
      ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.type==='ready'){ready=true;attempt=0;terminal.reset();onStatus('connected');resize();}else if(m.type==='output')terminal.write(m.data);};
      ws.onclose=event=>{ready=false;queue=[];onStatus('disconnected');if(event.code===4001){window.dispatchEvent(new Event('session-expired'));return;}if(!stopped)retry=setTimeout(connect,Math.min(1000*2**attempt++,15000));};ws.onerror=()=>{};
    }
    const observer=new ResizeObserver(resize);observer.observe(container.current);
    const resume=()=>{if(document.visibilityState==='visible'){const ws=connection.current;if(ws?.readyState===1){ws.close();}else connect();resize();}};
    const online=()=>{if(connection.current?.readyState!==1)connect();};
    document.addEventListener('visibilitychange',resume);window.addEventListener('online',online);window.visualViewport?.addEventListener('resize',resize);
    connect();return()=>{stopped=true;clearTimeout(retry);observer.disconnect();sub.dispose();element.removeEventListener('touchstart',touchStart,true);element.removeEventListener('touchmove',touchMove,true);element.removeEventListener('touchend',touchEnd,true);element.removeEventListener('touchcancel',touchEnd,true);element.removeEventListener('wheel',wheel,true);connection.current?.close();terminal.dispose();document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',online);window.visualViewport?.removeEventListener('resize',resize);};
  },[]);
  useEffect(()=>{if(visible)requestAnimationFrame(()=>{try{fitRef.current?.fit();const t=term.current;if(connection.current?.readyState===1)connection.current.send(JSON.stringify({type:'resize',cols:t.cols,rows:t.rows}));}catch{}});},[visible]);
  async function paste(){try{const text=await navigator.clipboard.readText();term.current?.paste(text);}catch{setDraft('');}}
  async function copy(){const selection=term.current?.getSelection();if(!selection){setNotice('Select terminal text to copy.');return;}try{await navigator.clipboard.writeText(selection);setNotice('Copied to clipboard.');}catch{setNotice('Use the native selection menu to copy.');}}
  const key=(data)=>{input.current(data);term.current?.focus();};
  return <section className="terminal-panel" hidden={!visible}>
    <div className="terminal-caption"><span>agy-main <span className="dim">/</span> <span className="dim">persistent terminal</span></span><button className="icon-button" title="Focus terminal" onClick={()=>term.current?.focus()}><Maximize2 size={15}/></button></div>
    <div className="terminal-scroll-controls" aria-label="Terminal scrolling"><button onClick={()=>scroll(-(term.current?.rows||20))}><ChevronsUp size={14}/>Page up</button><button onClick={()=>scroll(term.current?.rows||20)}><ChevronsDown size={14}/>Page down</button><button className={inHistory?'selected':''} onClick={live}>Live</button><span>{inHistory?'Viewing history · Live returns to AGY':'Swipe or scroll to view history'}</span></div>
    <div className="terminal" ref={container}/>
    {notice&&<div className="inline-notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={14}/></button></div>}
    <div className="terminal-toolbar"><button onClick={paste}><Clipboard size={15}/>Paste</button><button onClick={copy}><Copy size={15}/>Copy</button><button className={ctrl?'selected':''} onClick={()=>setCtrl(!ctrl)}>Ctrl</button><button onClick={()=>key('\x1b')}>Esc</button><button onClick={()=>key('\t')}>Tab</button>{[['A',ArrowUp],['B',ArrowDown],['D',ArrowLeft],['C',ArrowRight]].map(([code,Icon])=><button key={code} aria-label={{A:'Up',B:'Down',D:'Left',C:'Right'}[code]} onClick={()=>key('\x1b['+code)}><Icon size={16}/></button>)}<button onClick={()=>setDraft('')} title="Multiline input"><Send size={15}/></button></div>
    {ctrl&&<div className="control-keys">{['C','D','Z','L','A','E','U','W'].map(c=><button key={c} onClick={()=>{key(String.fromCharCode(c.charCodeAt(0)-64));setCtrl(false);}}>Ctrl + {c}</button>)}</div>}
    {draft!==null&&<div className="modal-backdrop"><div className="modal"><div className="section-heading"><h2>Paste into terminal</h2><button className="icon-button" onClick={()=>setDraft(null)} aria-label="Close"><X/></button></div><p>Paste or write your text here. Insert keeps the terminal’s native paste behavior; press Enter in the terminal when ready.</p><textarea className="prompt-input" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Your prompt, code, or multiline text…" autoFocus/><button className="primary" onClick={()=>{term.current?.paste(draft);setDraft(null);term.current?.focus();}}>Insert text</button></div></div>}
  </section>;
}
