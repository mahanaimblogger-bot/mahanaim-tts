(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);

  const guionEl    = $("guion");
  const fileInput  = $("fileInput");
  const vozIdioma  = $("vozIdioma");
  const voz1Sel    = $("voz1");
  const voz2Sel    = $("voz2");
  const velRange   = $("velocidad");
  const volRange   = $("volumen");
  const btnRepro   = $("btnReproducir");
  const btnDetener = $("btnDetener");
  const btnLimpiar = $("btnLimpiar");
  const btnEjemplo = $("btnEjemplo");
  const estadoEl   = $("estado");

  const synth = window.speechSynthesis;
  let cortar   = false;
  let usuariosEligieron = {};  // para no pisar la eleccion mientras aparecen voces

  const setEstado = (m) => estadoEl.textContent = m || "";

  const ROL_NARRADOR = "Narrador";
  const ROL_VOZ2     = "Voz2";

  let voces = [];

  // Conserva la voz que el usuario eligio en cada selector.
  function valorSel(sel){ return sel.value || sel.getAttribute("data-val") || ""; }
  function guardar(sel){ sel.setAttribute("data-val", sel.value || ""); }
  function restaurar(sel){
    const v = sel.getAttribute("data-val");
    if(v && [...sel.options].some(o=>o.value===v)) sel.value = v;
    else if(sel.options.length && !sel.value) sel.value = sel.options[0].value;
    sel.setAttribute("data-val", sel.value);
    return sel.value;
  }

  function listaDisponible(){
    const iso2 = (vozIdioma.value||"es").substring(0,2).toLowerCase();
    const cat  = voces.filter(v=>v.lang && v.lang.toLowerCase().startsWith(iso2));
    const base = cat.length ? cat : voces;
    const lat  = base.filter(v=>/-(mx|co|ar|us|pr|cl|pe|ve|ec|bo|uy|pa|cr|gt|hn|ni|sv|do)\b/i.test(v.lang||""));
    return [ ...lat, ...base.filter(x=>!lat.includes(x)) ];
  }

  function rellenar(sel){
    guardar(sel);                       // 1º guardar lo que se eligio
    sel.innerHTML = "";
    listaDisponible().forEach(v=> sel.add(new Option(v.name+" ("+v.lang+")", v.voiceURI)));
    restaurar(sel);                     // 3º restaurar lo elegido / primer fallback
  }

  function llenarVoces(){
    voces = synth.getVoices().slice() || [];
    rellenar(voz1Sel);
    rellenar(voz2Sel);
    // Si quedaron vacios por falta de voces, elegir sensato pero sin pisar lo manual
    if(!voz1Sel.value && voces.length) auto1();
    if(!voz2Sel.value && voces.length) auto2();
    guardar(voz1Sel); guardar(voz2Sel);
  }

  function auto1(){
    const prefer = voces.find(x=>/es-(mx|es)\b/i.test(x.lang||"")) || voces[0];
    if(prefer && voces.some(v=>v.voiceURI===prefer.voiceURI)){ voz1Sel.value=prefer.voiceURI; }
  }
  function auto2(){
    const u1 = voz1Sel.value;
    const femen = voces.find(x=>x.voiceURI!==u1 && /female|zira|hu|sabina|jeany|helena|paulina|marta|hazel|camila/i.test(x.name||""));
    const v2 = femen || voces.find(x=>x.voiceURI!==u1) || voces[0];
    if(v2 && voces.some(v=>v.voiceURI===v2.voiceURI)) voz2Sel.value = v2.voiceURI;
  }

  synth.onvoiceschanged = llenarVoces;
  vozIdioma.addEventListener("change", llenarVoces);
  voz1Sel.addEventListener("change", ()=> guardar(voz1Sel));
  voz2Sel.addEventListener("change", ()=> guardar(voz2Sel));
  if(synth.getVoices().length) llenarVoces();
  // Las voces pueden cargar luego; aseguramos que no toque elecciones manuales
  setTimeout(()=>{ if(synth.getVoices().length) llenarVoces(); }, 700);

  function getVoice(sel){
    const uri = sel.value;
    return voces.find(v=>v.voiceURI===uri) || null;
  }
  function rolAId(etiqueta){
    const t = String(etiqueta||"").trim();
    if(/^narrador$/i.test(t)) return ROL_NARRADOR;
    return ROL_VOZ2;
  }
  function vozParaRol(rol){
    // Clave: nunca re-llenar selectores durante la lectura.
    return rol===ROL_NARRADOR ? getVoice(voz1Sel) : getVoice(voz2Sel);
  }

  /* ===== PARSEO ===== */
  function parsear(raw){
    const pasos=[];
    const lineas=raw.split(/\r?\n/);
    let enfPend=false;
    let rolActual=ROL_NARRADOR;

    for(const linea of lineas){
      const t=linea.trim();
      if(!t) continue;
      if(/^#/.test(t)) continue;
      if(/^\[(INTRO|CUERPO|CIERRE|FIN)\]$/i.test(t)) continue;

      let m=t.match(/^\[PAUSA\s+(\d+(?:\.\d+)?)\s*s?\]$/i);
      if(m){ pasos.push({tipo:"pausa",seg:parseFloat(m[1])}); continue; }
      if(/^\(tono/i.test(t)) continue;

      m=t.match(/^LOCUTOR\s*=\s*(.+)$/i);
      if(m){ rolActual = rolAId(m[1]); continue; }

      if(/^\[ENFASIS\]$/i.test(t)){ enfPend=true; continue; }
      if(/^\[EXPECTATIVA\]$/i.test(t)){ pasos.push({tipo:"pausa",seg:0.35}); continue; }
      if(/^\[[A-Za-zÁÉÍÓÚÑáéíóú\s-]+\]$/i.test(t)) continue;

      const pregunta=/[?¿]\s*$/.test(t);
      pasos.push({tipo:"texto", rol:rolActual, txt:t, enfasis:enfPend, pregunta});
      enfPend=false;
      if(/[.!]\s*$/.test(t)) pasos.push({tipo:"pausa",seg:0.2});
    }
    return pasos;
  }

  function espera(ms){ return new Promise(r=>setTimeout(r,ms)); }
  function hablar(paso){
    return new Promise((ok)=>{
      const u=new SpeechSynthesisUtterance(paso.txt);
      guardar(voz1Sel); guardar(voz2Sel);
      const voz = vozParaRol(paso.rol);
      if(voz){ u.voice=voz; }
      u.lang = voz ? voz.lang : (vozIdioma.value||"es-ES");
      u.rate  = parseFloat(velRange.value) || 1;
      u.volume= parseFloat(volRange.value) || 1;
      let terminado=false;
      const fin=()=>{ if(terminado) return; terminado=true; clearTimeout(seguro); ok(); };
      u.onend=fin; u.onerror=fin;
      // Seguridad: evita colgarse si el navegador no dispara onend.
      // Estimamos la duracion segun la cantidad de caracteres y la velocidad.
      const msPorChar = 90 / u.rate;           // ~90ms por caracter a velocidad 1
      const dur = Math.min(Math.max(paso.txt.length * msPorChar + 2000, 5000), 600000);
      const seguro = setTimeout(fin, dur);
      synth.speak(u);
    });
  }

  async function reproducir(){
    if(!synth) return setEstado("Tu navegador no soporta voz.");
    synth.cancel(); cortar=false;
    // NO relenemos aca para no pisar las voces elegidas.
    setEstado("Preparando…");
    const pasos=parsear(guionEl.value);
    if(!pasos.length){ setEstado("No hay texto para leer."); return; }
    for(const paso of pasos){
      if(cortar){ synth.cancel(); setEstado("Detenido."); return; }
      if(paso.tipo==="pausa"){ await espera(paso.seg*1000); continue; }
      if(paso.tipo==="texto"){
        setEstado((paso.rol===ROL_NARRADOR?"	Voz Narrador":"Voz Locutor 2")+" hablando…");
        await hablar(paso);
      }
    }
    setEstado("Reproduccion terminada.");
  }

  btnRepro.addEventListener("click", reproducir);
  btnDetener.addEventListener("click", ()=>{ cortar=true; if(synth) synth.cancel(); setEstado("Detenido."); });

  guionEl.addEventListener("input", ()=>{ const c=cuentas(); setEstado(`Pausas: ${c.p} · Enfasis: ${c.e} · Lineas: ${c.n}`); });
  function cuentas(){ const s=guionEl.value; return { p:(s.match(/\[PAUSA\s+\d+\s*s?\]/gi)||[]).length, e:(s.match(/\[ENFASIS\]/gi)||[]).length, n:s.split(/\r?\n/).filter(x=>x.trim()).length }; }

  fileInput.addEventListener("change",(e)=>{ const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ guionEl.value=rd.result; setEstado("Guion cargado. Listo."); }; rd.readAsText(f,"utf-8"); });
  btnLimpiar.addEventListener("click",()=>{ guionEl.value=""; if(synth) synth.cancel(); setEstado(""); });

  const EJEMPLO = `#FORMATO=mahanaim-tts:v1
#IDIOMA=es-ES
#EPISODIO=Ejemplo — Dialogo a dos voces
#VOZ_PRINCIPAL=Narrador
[INTRO]
(tono enérgico)
LOCUTOR=Narrador
Imagina que sobrevives al diluvio y el mundo cambia para siempre.
[PAUSA 2s]
LOCUTOR=Locutor
¿Como se comienza de nuevo después de algo tan grande?
[PAUSA 1s]
LOCUTOR=Narrador
Con un pacto de gracia de parte de Dios.
[PAUSA 1s]
LOCUTOR=Narrador
Génesis nueve habla del pacto con Noé.
[ENFASIS]
El arco iris es la señal de la misericordia.
[PAUSA 2s]
LOCUTOR=Locutor
Y hoy Dios sigue ofreciendo su pacto de paz.
[CIERRE]
(tono sereno y de llamado)
LOCUTOR=Narrador
Ven a Cristo, nuestro arco de paz.
[FIN]
`;
  btnEjemplo.addEventListener("click",()=>{ guionEl.value=EJEMPLO; setEstado("Ejemplo de 2 voces cargado."); });

  setEstado("Listo. Elige Narrador y Locutor 2.");
})();