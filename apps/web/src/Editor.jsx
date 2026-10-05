import React,{useEffect,useRef} from 'react';
import {EditorView} from '@codemirror/view';
import {EditorState} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {oneDark} from '@codemirror/theme-one-dark';
import {javascript} from '@codemirror/lang-javascript';
import {json} from '@codemirror/lang-json';
import {markdown} from '@codemirror/lang-markdown';
import {python} from '@codemirror/lang-python';
export default function Editor({content,file,onChange}){
  const ref=useRef(),callback=useRef(onChange);callback.current=onChange;
  useEffect(()=>{
    const extension=/\.([jt]sx?)$/.test(file)?javascript({typescript:/\.tsx?$/.test(file),jsx:/x$/.test(file)}):/\.json$/.test(file)?json():/\.md$/.test(file)?markdown():/\.py$/.test(file)?python():[];
    const view=new EditorView({parent:ref.current,state:EditorState.create({doc:content,extensions:[basicSetup,oneDark,extension,EditorView.lineWrapping,EditorView.updateListener.of(update=>{if(update.docChanged)callback.current(update.state.doc.toString());}),EditorView.theme({'&':{height:'100%'},'.cm-scroller':{overflow:'auto',fontSize:'13px'},'.cm-content':{minHeight:'200px'}})]})});return()=>view.destroy();
  },[file]);
  return <div className="editor" ref={ref}/>;
}
