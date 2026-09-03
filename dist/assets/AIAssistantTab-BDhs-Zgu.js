import{j as e}from"./ui-vendor-D1ow0EGi.js";import{a as u}from"./react-vendor-CFNT7hM8.js";import{j as k,z as $,a as I,D as y,c as f,E as v,h as z,H as C,B as N,I as E,l as L,g as w}from"./index-p5EncwRc.js";import"./utils-vendor-DeRmtv56.js";import"./charts-vendor-BWj1miAy.js";const b=k("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);const R=k("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);function P(){return{id:crypto.randomUUID(),role:"assistant",content:`سلام! من دستیار هوشمند ترید شما هستم. 🤖

می‌تونم در موارد زیر کمکتون کنم:
• تحلیل وضعیت بازار
• پیشنهاد سبد سهام
• بررسی سیگنال‌ها
• تحلیل اخبار و احساسات
• مدیریت ریسک

چه کمکی از دستم برمیاد؟`,timestamp:new Date}}function q(o,i,l){const n=o.toLowerCase();return n.includes("بازار")||n.includes("وضعیت")?A(i,l):n.includes("پیشنهاد")||n.includes("سبد")||n.includes("پرتفوی")?B(i,l):n.includes("سیگنال")?V(l):n.includes("ریسک")||n.includes("خطر")?F():n.includes("خبر")||n.includes("اخبار")?H():{id:crypto.randomUUID(),role:"assistant",content:`متوجه شدم. برای تحلیل دقیق‌تر، لطفاً مشخص کنید:
• کدام نماد یا صنعت مد نظرتون هست؟
• چه نوع تحلیلی نیاز دارید؟ (تکنیکال، فاندامنتال، تابلوخوانی)
• افق زمانی سرمایه‌گذاری شما چقدر است؟`,timestamp:new Date}}function A(o,i){if(o.length===0)return{id:crypto.randomUUID(),role:"assistant",content:"⚠️ داده‌ای برای تحلیل بازار موجود نیست. لطفاً ابتدا داده‌ها را بروزرسانی کنید.",timestamp:new Date};const l=o.filter(d=>d.changePercent>0).length,n=o.filter(d=>d.changePercent<0).length,s=o.length,r=l/s*100;let t="";r>60?(t=`📈 بازار مثبت است!

`,t+=`• ${l} نماد صعودی (${r.toFixed(1)}٪)
`,t+=`• ${n} نماد نزولی
`,t+=`
💡 پیشنهاد: فرصت‌های خرید مناسب وجود دارد.`):r<40?(t=`📉 بازار منفی است!

`,t+=`• ${l} نماد صعودی (${r.toFixed(1)}٪)
`,t+=`• ${n} نماد نزولی
`,t+=`
⚠️ هشدار: احتیاط کنید و از خریدهای هیجانی پرهیز کنید.`):(t=`➡️ بازار خنثی است.

`,t+=`• ${l} نماد صعودی (${r.toFixed(1)}٪)
`,t+=`• ${n} نماد نزولی
`,t+=`
💡 پیشنهاد: منتظر شکست جهت باشید.`);const m=i.filter(d=>d.signal==="buy").length,c=i.filter(d=>d.signal==="sell").length;return t+=`

📊 وضعیت سیگنال‌ها:
`,t+=`• سیگنال خرید: ${m}
`,t+=`• سیگنال فروش: ${c}
`,{id:crypto.randomUUID(),role:"assistant",content:t,timestamp:new Date}}function B(o,i){const l=i.filter(r=>r.signal==="buy"&&r.strength>=70);if(l.length===0)return{id:crypto.randomUUID(),role:"assistant",content:`❌ در حال حاضر سیگنال خرید قوی برای پیشنهاد سبد وجود ندارد.

منتظر سیگنال‌های بهتر باشید یا فیلترها را تغییر دهید.`,timestamp:new Date};const n=l.sort((r,t)=>(t.confidence||0)-(r.confidence||0)).slice(0,5);let s=`💼 پیشنهاد سبد سهام:

`;return s+=`بر اساس تحلیل فعلی، این نمادها پتانسیل خوبی دارند:

`,n.forEach((r,t)=>{const m=Math.round(100/n.length*10)/10;s+=`${t+1}. 🎯 ${r.symbol}
`,s+=`   • سهم پیشنهادی: ${m}٪
`,s+=`   • اعتماد: ${r.strength}٪
`,s+=`   • دلیل: ${r.reasons?.[0]||"تحلیل تکنیکال مثبت"}

`}),s+="⚠️ توجه: این پیشنهادها صرفاً تحلیلی هستند و مسئولیت معامله با شماست.",{id:crypto.randomUUID(),role:"assistant",content:s,timestamp:new Date}}function V(o){const i=o.filter(r=>r.signal==="buy").length,l=o.filter(r=>r.signal==="sell").length,n=o.filter(r=>r.signal==="hold").length;let s=`📡 تحلیل سیگنال‌ها:

`;return s+=`• سیگنال‌های خرید: ${i}
`,s+=`• سیگنال‌های فروش: ${l}
`,s+=`• سیگنال‌های نگهداری: ${n}

`,i>l*2?s+=`🟢 جو حاکم: صعودی
فرصت‌های خرید بیشتر از فروش است.`:l>i*2?s+=`🔴 جو حاکم: نزولی
احتیاط توصیه می‌شود.`:s+=`🟡 جو حاکم: متعادل
انتخاب نمادهای خاص مهم است.`,{id:crypto.randomUUID(),role:"assistant",content:s,timestamp:new Date}}function F(){return{id:crypto.randomUUID(),role:"assistant",content:`🛡️ اصول مدیریت ریسک:

1️⃣ حد ضرر همیشه تعیین کنید (حداکثر 5-8٪)
2️⃣ حجم معامله را کنترل کنید (حداکثر 20٪ در یک نماد)
3️⃣ تنوع سبد داشته باشید (حداقل 5 نماد)
4️⃣ طمع نکنید - به حد سود پایبند باشید
5️⃣ اخبار و گزارش‌ها را دنبال کنید

💡 فرمول حجم معامله:
حجم = (سرمایه × ریسک مجاز) ÷ (ورود - حد ضرر)`,timestamp:new Date}}function H(){return{id:crypto.randomUUID(),role:"assistant",content:`📰 تحلیل احساسات اخبار:

در حال حاضر امکان تحلیل مستقیم اخبار وجود ندارد.

برای تحلیل اخبار پیشنهاد می‌کنم:
• گزارش‌های کدال را بررسی کنید
• اخبار اقتصادی را دنبال کنید
• به تغییرات حجم مشکوک توجه کنید

این ویژگی در نسخه‌های آینده بهبود خواهد یافت.`,timestamp:new Date}}function Q(o){if(o.length===0)return 50;const i=o.filter(s=>s.changePercent>0).length/o.length,l=o.reduce((s,r)=>s+r.changePercent,0)/o.length,n=i*50+Math.max(-5,Math.min(5,l))*10+50;return Math.round(Math.max(0,Math.min(100,n)))}function T(o,i,l="medium"){const n=i.filter(t=>t.signal==="buy");let s=n;l==="low"?s=n.filter(t=>t.strength>=80):l==="high"?s=n.filter(t=>t.strength>=60):s=n.filter(t=>t.strength>=70);const r=s.sort((t,m)=>(m.confidence||0)-(t.confidence||0)).slice(0,5);return r.map(t=>({symbol:t.symbol,allocation:Math.round(100/r.length*10)/10,reason:t.reasons?.[0]||"تحلیل تکنیکال مثبت",riskLevel:t.strength>=80?"low":t.strength>=70?"medium":"high",expectedReturn:Math.round(t.strength*.3*10)/10,stopLoss:-5,takeProfit:15}))}function X(){const[o,i]=u.useState([]),[l,n]=u.useState(""),[s,r]=u.useState(!1),[t,m]=u.useState([]),[c,d]=u.useState(50),j=u.useRef(null);u.useEffect(()=>{i([P()]),S()},[]),u.useEffect(()=>{j.current?.scrollIntoView({behavior:"smooth"})},[o]);const S=async()=>{const a=w();if(a.length>0){const h=Q(a);d(h);const x=await $(a,[],30),p=T(a,x,"medium");m(p)}},g=async()=>{if(!l.trim()||s)return;const a={id:crypto.randomUUID(),role:"user",content:l,timestamp:new Date};i(h=>[...h,a]),n(""),r(!0),setTimeout(()=>{const h=w(),x=[],p=q(a.content,h,x);i(M=>[...M,p]),r(!1)},800)},U=a=>{n(a),setTimeout(()=>g(),100)},D=[{label:"تحلیل بازار",icon:z,query:"وضعیت بازار چطوره؟"},{label:"پیشنهاد سبد",icon:v,query:"چه سهامی پیشنهاد می‌کنی؟"},{label:"مدیریت ریسک",icon:C,query:"نکات مدیریت ریسک رو بگو"}];return e.jsxs("div",{dir:"rtl",className:"flex flex-col h-[calc(100vh-200px)] gap-4",children:[e.jsx("div",{className:"flex items-center justify-between",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(b,{className:"size-6 text-primary"}),e.jsx("h2",{className:"text-lg font-bold",children:"دستیار هوشمند ترید"}),e.jsxs(I,{variant:c>60?"default":c<40?"destructive":"secondary",children:["امتیاز بازار: ",c]})]})}),e.jsx(y,{className:"p-3",children:e.jsxs("div",{className:"flex items-center gap-2 text-sm",children:[e.jsx("span",{className:"text-muted-foreground",children:"وضعیت کلی بازار:"}),e.jsx("div",{className:"flex-1 h-2 bg-muted rounded-full overflow-hidden",children:e.jsx("div",{className:f("h-full transition-all duration-500",c>60?"bg-emerald-500":c<40?"bg-red-500":"bg-amber-500"),style:{width:`${c}%`}})}),e.jsx("span",{className:f("font-bold",c>60?"text-emerald-500":c<40?"text-red-500":"text-amber-500"),children:c>60?"مثبت":c<40?"منفی":"خنثی"})]})}),e.jsxs(y,{className:"flex-1 overflow-y-auto p-4 space-y-3",children:[o.map(a=>e.jsxs("div",{className:f("flex gap-3 max-w-[80%]",a.role==="user"?"mr-auto flex-row-reverse":"ml-auto"),children:[e.jsx("div",{className:f("rounded-full p-2 shrink-0",a.role==="user"?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"),children:a.role==="user"?e.jsx(R,{className:"size-4"}):e.jsx(b,{className:"size-4"})}),e.jsx("div",{className:f("rounded-2xl p-3 text-sm whitespace-pre-wrap",a.role==="user"?"bg-primary text-primary-foreground":"bg-muted"),children:a.content})]},a.id)),s&&e.jsxs("div",{className:"flex gap-3 ml-auto max-w-[80%]",children:[e.jsx("div",{className:"rounded-full p-2 bg-muted shrink-0",children:e.jsx(b,{className:"size-4 text-muted-foreground"})}),e.jsx("div",{className:"rounded-2xl p-3 bg-muted",children:e.jsxs("div",{className:"flex gap-1",children:[e.jsx("span",{className:"size-2 bg-muted-foreground/50 rounded-full animate-bounce"}),e.jsx("span",{className:"size-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]"}),e.jsx("span",{className:"size-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]"})]})})]}),e.jsx("div",{ref:j})]}),t.length>0&&e.jsxs(y,{className:"p-3",children:[e.jsxs("h3",{className:"text-sm font-semibold mb-2 flex items-center gap-2",children:[e.jsx(v,{className:"size-4 text-amber-500"}),"پیشنهادهای ویژه"]}),e.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2",children:t.slice(0,3).map((a,h)=>e.jsxs("div",{className:"border rounded-lg p-2 text-xs",children:[e.jsx("div",{className:"font-bold text-primary",children:a.symbol}),e.jsxs("div",{className:"text-muted-foreground mt-1",children:["سهم پیشنهادی: ",a.allocation,"٪"]}),e.jsxs("div",{className:"text-muted-foreground",children:["ریسک: ",a.riskLevel==="low"?"کم":a.riskLevel==="medium"?"متوسط":"زیاد"]})]},h))})]}),e.jsx("div",{className:"flex gap-2 flex-wrap",children:D.map(a=>e.jsxs(N,{variant:"outline",size:"sm",onClick:()=>U(a.query),disabled:s,className:"gap-1.5",children:[e.jsx(a.icon,{className:"size-3.5"}),a.label]},a.label))}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(E,{value:l,onChange:a=>n(a.target.value),onKeyDown:a=>a.key==="Enter"&&g(),placeholder:"سوال خود را بپرسید...",disabled:s,className:"flex-1"}),e.jsx(N,{onClick:g,disabled:s||!l.trim(),size:"icon",children:e.jsx(L,{className:"size-4"})})]})]})}export{X as AIAssistantTab};
