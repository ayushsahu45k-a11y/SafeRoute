import{c as j,r as b,j as e,m as k,A as E,B as A,X as H,M as C,S as W,C as G,a as L}from"./index-BFSdLIVK.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]],q=j("message-square",O);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=[["polygon",{points:"12 2 19 21 12 17 5 21 12 2",key:"x8c0qg"}]],B=j("navigation-2",P);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]],U=j("send",V);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],J=j("zap",Y),K=["hello","hi","hey","good morning","good evening","good afternoon","howdy","hi there"],Q=["thank","thanks","thx","appreciate"],X=["bye","goodbye","see you","later","goodnight"];async function Z(u,o){try{const i=await fetch("/api/ai-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:u,context:o})});if(i.ok){const a=await i.json();if(a.response)return a.response}}catch(i){console.error("Gemini API error:",i)}return null}function T(u,o,i,a,y){var v,z,w;const n=u.toLowerCase(),c=new Date().getHours(),f=c>=5&&c<12?"Morning":c>=12&&c<17?"Afternoon":c>=17&&c<21?"Evening":"Night",x=c>=22||c<=5,p=(i==null?void 0:i.length)>0?Math.round(i.reduce((s,l)=>s+(l.risk_probability||0),0)/i.length*100):null,d=p!==null?100-p:null;if(K.some(s=>n.includes(s)))return`Good ${f}! 👋 Welcome to SafeRoute!

I can help you with:
• 🗺️ Route planning
• 🛡️ Safety information
• 🌤️ Weather updates
• 📍 Finding places
• 🚗 Driving tips

What would you like to know?`;if(Q.some(s=>n.includes(s)))return"You're welcome! 😊 Drive safe!";if(X.some(s=>n.includes(s)))return"Goodbye! 👋 Have a safe journey!";if(n.includes("safe")||n.includes("risk")||n.includes("danger")){if(d!==null){const s=d>=70?"Low Risk ✅":d>=40?"Moderate Risk ⚠️":"High Risk 🚨";let l="";return d<50&&(l=`

Tips:
• Reduce speed
• Increase following distance
• Stay alert`),`🛡️ **Route Safety: ${d}%**
Risk Level: ${s}${l}`}return`🛡️ No route calculated yet.

Enter a start and destination, then I can analyze your route's safety.`}if(n.includes("weather")||n.includes("rain")||n.includes("temperature")||n.includes("sunny")){const s=((z=(v=a==null?void 0:a.weather)==null?void 0:v[0])==null?void 0:z.main)||"Clear",l=(w=a==null?void 0:a.main)!=null&&w.temp?Math.round(a.main.temp-273.15):25;let t="";return s.includes("Rain")?t=`

🌧️ Drive slowly, use headlights, maintain distance.`:s.includes("Clear")?t=`

☀️ Good conditions. Drive safely!`:s.includes("Fog")&&(t=`

🌫️ Use low beams, reduce speed.`),`🌤️ **Current Weather: ${s}**
Temperature: ${l}°C

${f} time - ${x?"Drive carefully in the dark":"Have good visibility"}${t}`}if(n.includes("traffic")||n.includes("congestion")||n.includes("jam")){const s=(i==null?void 0:i.length)>0?Math.round(i.reduce((l,t)=>l+(t.traffic_level||0),0)/i.length*100):null;return s!==null?`🚗 **Traffic: ${s>=70?"Heavy 🚦":s>=40?"Moderate ⚡":"Light ✅"}**
Congestion: ${s}%`:"📍 Calculate a route to see traffic information."}if(n.includes("hospital")||n.includes("doctor")||n.includes("medical")||n.includes("clinic"))return`🏥 To find hospitals:
1. I can search nearby places
2. Click a result to get directions

Try asking "Find nearby hospitals"`;if(n.includes("gas")||n.includes("petrol")||n.includes("fuel")||n.includes("station"))return`⛽ For gas stations:
Check the map for nearby fuel stations, or I can help find them if you have a route.`;if(n.includes("tip")||n.includes("advice")||n.includes("help"))return`💡 **Quick Help:**

• Type a place name to search
• Click "Calculate Route"
• Use Voice Navigation (🔊) for audio directions
• Check weather before traveling

Ask me anything!`;if(n.includes("night")||n.includes("dark"))return x?`🌙 **Night Driving Tips:**
• Use low beams
• Reduce speed 10-15%
• Increase following distance
• Take breaks every 2 hours`:`It's currently ${f}. 🌤️

Night driving tips are available after dark.`;if(n.includes("accident")||n.includes("incident")||n.includes("roadblock")){const s=(y==null?void 0:y.length)||0;return s>0?`⚠️ **${s} incident(s) on your route**

Drive carefully and follow posted warnings.`:`✅ **No incidents detected**

Always stay alert while driving!`}if(n.includes("route")||n.includes("direction")||n.includes("navigate")){if(o){const s=(o.distance/1e3).toFixed(1),l=Math.round(o.duration/60);return`🗺️ **Route Info:**
Distance: ${s} km
Time: ${l} min${d!==null?`
Safety: ${d}%`:""}`}return"📍 Enter start and destination to calculate a route."}return n.includes("who")||n.includes("about")||n.includes("safe")?`🤖 **SafeRoute**

An intelligent traffic safety platform with:
• Real-time routing
• Safety analysis
• Weather updates
• AI assistance

Your safety is our priority!`:`I'm here to help! 😊

Try asking:
• "Is my route safe?"
• "What's the weather?"
• "Traffic conditions"
• "Driving tips"`}function ee({routeData:u,riskData:o,incidentsData:i,weather:a}){const[y,n]=b.useState(!1),[c,f]=b.useState([{role:"ai",text:`Hello! I'm your SafeRoute assistant. I can help you with:

🗺️ Route planning & safety
🌤️ Weather conditions
📍 Finding nearby places
⚠️ Traffic incidents
🚗 Vehicle tips

What would you like to know?`,suggestions:["Plan a safe route","Weather forecast","Find nearby hospitals","Traffic updates"]}]),[x,p]=b.useState(""),[d,v]=b.useState(!1),z=b.useRef(null),w=()=>{var t;(t=z.current)==null||t.scrollIntoView({behavior:"smooth"})};b.useEffect(()=>{w()},[c]);const s=()=>{var R,_,S;const t=o?Math.round(o.reduce((I,N)=>I+(N.risk_probability||N.risk_score||0),0)/o.length*100):null,h=o?Math.round(o.reduce((I,N)=>I+(N.traffic_level||0),0)/o.length*100):null,r=a?`${(_=(R=a.weather)==null?void 0:R[0])==null?void 0:_.main}, ${Math.round((((S=a.main)==null?void 0:S.temp)||298)-273.15)}°C`:"Clear",m=u?`${(u.distance/1e3).toFixed(1)} km`:"Not set",$=u?`${Math.round(u.duration/60)} mins`:"Not set",M=new Date().getHours()>=22||new Date().getHours()<=5,g=new Date().getHours(),F=g>=5&&g<12?"Morning":g>=12&&g<17?"Afternoon":g>=17&&g<21?"Evening":"Night";return{avgRisk:t,avgTraffic:h,weatherDesc:r,distDesc:m,timeDesc:$,isNight:M,timeOfDay:F}},l=async()=>{if(!x.trim()||d)return;const t=x;p(""),f(h=>[...h,{role:"user",text:t}]),v(!0);try{const h=JSON.stringify(s(u,o,a)),r=await Z(t,h);let m;r?m=r:m=T(t,u,o,a,i),f($=>[...$,{role:"ai",text:m}])}catch(h){console.error("AI Error:",h);const r=T(t,u,o,a,i);f(m=>[...m,{role:"ai",text:r}])}finally{v(!1)}};return e.jsxs(e.Fragment,{children:[e.jsx(k.button,{whileHover:{scale:1.05},whileTap:{scale:.95},onClick:()=>n(!0),className:"absolute bottom-6 right-6 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 p-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-shadow z-50",children:e.jsx(q,{size:24})}),e.jsx(E,{children:y&&e.jsxs(k.div,{initial:{opacity:0,y:20,scale:.95},animate:{opacity:1,y:0,scale:1},exit:{opacity:0,y:20,scale:.95},className:"absolute bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden",children:[e.jsxs("div",{className:"p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-md",children:[e.jsxs("div",{className:"flex items-center gap-2 text-zinc-900 dark:text-zinc-100",children:[e.jsx(A,{size:20,className:"text-emerald-500"}),e.jsx("span",{className:"font-semibold",children:"AI Assistant"})]}),e.jsx("button",{onClick:()=>n(!1),className:"text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors",children:e.jsx(H,{size:20})})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/30 dark:bg-transparent",children:[c.map((t,h)=>e.jsxs("div",{className:`flex flex-col ${t.role==="user"?"items-end":"items-start"}`,children:[t.role==="ai"&&e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx(A,{size:14,className:"text-emerald-500"}),e.jsx("span",{className:"text-xs text-zinc-400",children:"SafeRoute Assistant"})]}),e.jsx("div",{className:`max-w-[85%] p-4 rounded-2xl text-sm whitespace-pre-line ${t.role==="user"?"bg-emerald-500 text-white rounded-tr-sm":"bg-white border-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 rounded-tl-sm border dark:border-zinc-700 shadow-sm"}`,children:t.text}),t.places&&t.places.length>0&&e.jsxs("div",{className:"mt-2 max-w-[85%] space-y-2",children:[e.jsxs("p",{className:"text-xs text-zinc-500 dark:text-zinc-400 font-medium",children:[t.places.length," places found nearby:"]}),t.places.map((r,m)=>e.jsxs("div",{className:"bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 shadow-sm",children:[e.jsxs("div",{className:"flex items-start justify-between gap-2",children:[e.jsxs("div",{className:"flex items-start gap-2 flex-1 min-w-0",children:[e.jsx(C,{size:14,className:"text-emerald-500 mt-1 shrink-0"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"text-sm font-medium text-zinc-900 dark:text-zinc-100",children:r.name}),e.jsx("p",{className:"text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2",children:r.address})]})]}),r.distance&&e.jsx("span",{className:"text-xs bg-emerald-100 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full whitespace-nowrap shrink-0",children:r.distance<1e3?`${Math.round(r.distance)}m`:`${(r.distance/1e3).toFixed(1)}km`})]}),e.jsx("div",{className:"flex items-center gap-2 mt-2 ml-6",children:e.jsxs("a",{href:`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}`,target:"_blank",rel:"noopener noreferrer",className:"text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1",children:[e.jsx(B,{size:12}),"Directions"]})})]},m))]})]},h)),c.length<=2&&!d&&e.jsxs("div",{className:"space-y-3 mt-4",children:[e.jsx("p",{className:"text-xs text-zinc-400 font-medium",children:"Quick Actions:"}),e.jsx("div",{className:"grid grid-cols-2 gap-2",children:[{text:"Find hospitals",icon:C,color:"rose"},{text:"Check safety",icon:W,color:"emerald"},{text:"Weather",icon:G,color:"blue"},{text:"Traffic",icon:J,color:"amber"},{text:"Gas stations",icon:C,color:"emerald"},{text:"Driving tips",icon:L,color:"indigo"}].map((t,h)=>e.jsxs("button",{onClick:()=>{p({"Find hospitals":"Find nearby hospitals","Check safety":"Is my route safe?",Weather:"What is the weather?",Traffic:"What is the traffic like?","Gas stations":"Find nearby gas stations","Driving tips":"Give me driving tips"}[t.text])},className:"text-xs bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700 flex items-center gap-2",children:[e.jsx(t.icon,{size:14,className:`text-${t.color}-500`}),e.jsx("span",{children:t.text})]},h))})]}),d&&e.jsx("div",{className:"flex justify-start",children:e.jsxs("div",{className:"bg-white border-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-400 p-3 rounded-2xl rounded-tl-sm border dark:border-zinc-700 flex items-center gap-2 shadow-sm",children:[e.jsx(k.div,{animate:{opacity:[.4,1,.4]},transition:{repeat:1/0,duration:1.5},className:"w-2 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-full"}),e.jsx(k.div,{animate:{opacity:[.4,1,.4]},transition:{repeat:1/0,duration:1.5,delay:.2},className:"w-2 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-full"}),e.jsx(k.div,{animate:{opacity:[.4,1,.4]},transition:{repeat:1/0,duration:1.5,delay:.4},className:"w-2 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-full"})]})}),e.jsx("div",{ref:z})]}),e.jsx("div",{className:"p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900",children:e.jsxs("div",{className:"relative flex items-center gap-2",children:[e.jsx("input",{type:"text",value:x,onChange:t=>p(t.target.value),onKeyDown:t=>t.key==="Enter"&&l(),placeholder:"Ask me anything...",className:"w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full py-3 pl-5 pr-12 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"}),e.jsx("button",{onClick:l,disabled:!x.trim()||d,className:"absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 text-white rounded-full disabled:cursor-not-allowed transition-colors",children:e.jsx(U,{size:16})})]})})]})})]})}export{ee as default};
