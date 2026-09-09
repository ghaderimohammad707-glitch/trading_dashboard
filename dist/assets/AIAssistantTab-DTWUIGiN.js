import{c as M,l as w,n as h,p as $,t as I,u as z}from"./badge-C5XVeXoz.js";import{a as j}from"./clientFetch-CFjqBWZq.js";import{D as C,E as v,O as q,S as N,T as L,b as _,g as E,n as p}from"./index-CijVfH1M.js";var y=w("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]),P=w("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]),d=$(z(),1);function R(){return{id:crypto.randomUUID(),role:"assistant",content:`سلام! من دستیار هوشمند ترید شما هستم. 🤖

می‌تونم در موارد زیر کمکتون کنم:
• تحلیل وضعیت بازار
• پیشنهاد سبد سهام
• بررسی سیگنال‌ها
• تحلیل اخبار و احساسات
• مدیریت ریسک

چه کمکی از دستم برمیاد؟`,timestamp:new Date}}function A(i,o,r){const s=i.toLowerCase();return s.includes("بازار")||s.includes("وضعیت")?B(o,r):s.includes("پیشنهاد")||s.includes("سبد")||s.includes("پرتفوی")?T(o,r):s.includes("سیگنال")?V(r):s.includes("ریسک")||s.includes("خطر")?F():s.includes("خبر")||s.includes("اخبار")?Q():{id:crypto.randomUUID(),role:"assistant",content:`متوجه شدم. برای تحلیل دقیق‌تر، لطفاً مشخص کنید:
• کدام نماد یا صنعت مد نظرتون هست؟
• چه نوع تحلیلی نیاز دارید؟ (تکنیکال، فاندامنتال، تابلوخوانی)
• افق زمانی سرمایه‌گذاری شما چقدر است؟`,timestamp:new Date}}function B(i,o){if(i.length===0)return{id:crypto.randomUUID(),role:"assistant",content:"⚠️ داده‌ای برای تحلیل بازار موجود نیست. لطفاً ابتدا داده‌ها را بروزرسانی کنید.",timestamp:new Date};const r=i.filter(c=>c.changePercent>0).length,s=i.filter(c=>c.changePercent<0).length,t=r/i.length*100;let n="";t>60?(n=`📈 بازار مثبت است!

`,n+=`• ${r} نماد صعودی (${t.toFixed(1)}٪)
`,n+=`• ${s} نماد نزولی
`,n+=`
💡 پیشنهاد: فرصت‌های خرید مناسب وجود دارد.`):t<40?(n=`📉 بازار منفی است!

`,n+=`• ${r} نماد صعودی (${t.toFixed(1)}٪)
`,n+=`• ${s} نماد نزولی
`,n+=`
⚠️ هشدار: احتیاط کنید و از خریدهای هیجانی پرهیز کنید.`):(n=`➡️ بازار خنثی است.

`,n+=`• ${r} نماد صعودی (${t.toFixed(1)}٪)
`,n+=`• ${s} نماد نزولی
`,n+=`
💡 پیشنهاد: منتظر شکست جهت باشید.`);const l=o.filter(c=>c.signal==="buy").length,u=o.filter(c=>c.signal==="sell").length;return n+=`

📊 وضعیت سیگنال‌ها:
`,n+=`• سیگنال خرید: ${l}
`,n+=`• سیگنال فروش: ${u}
`,{id:crypto.randomUUID(),role:"assistant",content:n,timestamp:new Date}}function T(i,o){const r=o.filter(n=>n.signal==="buy"&&n.strength>=70);if(r.length===0)return{id:crypto.randomUUID(),role:"assistant",content:`❌ در حال حاضر سیگنال خرید قوی برای پیشنهاد سبد وجود ندارد.

منتظر سیگنال‌های بهتر باشید یا فیلترها را تغییر دهید.`,timestamp:new Date};const s=r.sort((n,l)=>(l.confidence||0)-(n.confidence||0)).slice(0,5);let t=`💼 پیشنهاد سبد سهام:

`;return t+=`بر اساس تحلیل فعلی، این نمادها پتانسیل خوبی دارند:

`,s.forEach((n,l)=>{const u=Math.round(100/s.length*10)/10;t+=`${l+1}. 🎯 ${n.symbol}
`,t+=`   • سهم پیشنهادی: ${u}٪
`,t+=`   • اعتماد: ${n.strength}٪
`,t+=`   • دلیل: ${n.reasons?.[0]||"تحلیل تکنیکال مثبت"}

`}),t+="⚠️ توجه: این پیشنهادها صرفاً تحلیلی هستند و مسئولیت معامله با شماست.",{id:crypto.randomUUID(),role:"assistant",content:t,timestamp:new Date}}function V(i){const o=i.filter(n=>n.signal==="buy").length,r=i.filter(n=>n.signal==="sell").length,s=i.filter(n=>n.signal==="hold").length;let t=`📡 تحلیل سیگنال‌ها:

`;return t+=`• سیگنال‌های خرید: ${o}
`,t+=`• سیگنال‌های فروش: ${r}
`,t+=`• سیگنال‌های نگهداری: ${s}

`,o>r*2?t+=`🟢 جو حاکم: صعودی
فرصت‌های خرید بیشتر از فروش است.`:r>o*2?t+=`🔴 جو حاکم: نزولی
احتیاط توصیه می‌شود.`:t+=`🟡 جو حاکم: متعادل
انتخاب نمادهای خاص مهم است.`,{id:crypto.randomUUID(),role:"assistant",content:t,timestamp:new Date}}function F(){return{id:crypto.randomUUID(),role:"assistant",content:`🛡️ اصول مدیریت ریسک:

1️⃣ حد ضرر همیشه تعیین کنید (حداکثر 5-8٪)
2️⃣ حجم معامله را کنترل کنید (حداکثر 20٪ در یک نماد)
3️⃣ تنوع سبد داشته باشید (حداقل 5 نماد)
4️⃣ طمع نکنید - به حد سود پایبند باشید
5️⃣ اخبار و گزارش‌ها را دنبال کنید

💡 فرمول حجم معامله:
حجم = (سرمایه × ریسک مجاز) ÷ (ورود - حد ضرر)`,timestamp:new Date}}function Q(){return{id:crypto.randomUUID(),role:"assistant",content:`📰 تحلیل احساسات اخبار:

در حال حاضر امکان تحلیل مستقیم اخبار وجود ندارد.

برای تحلیل اخبار پیشنهاد می‌کنم:
• گزارش‌های کدال را بررسی کنید
• اخبار اقتصادی را دنبال کنید
• به تغییرات حجم مشکوک توجه کنید

این ویژگی در نسخه‌های آینده بهبود خواهد یافت.`,timestamp:new Date}}function H(i){if(i.length===0)return 50;const o=i.filter(t=>t.changePercent>0).length/i.length,r=i.reduce((t,n)=>t+n.changePercent,0)/i.length,s=o*50+Math.max(-5,Math.min(5,r))*10+50;return Math.round(Math.max(0,Math.min(100,s)))}function K(i,o,r="medium"){const s=o.filter(l=>l.signal==="buy");let t=s;r==="low"?t=s.filter(l=>l.strength>=80):r==="high"?t=s.filter(l=>l.strength>=60):t=s.filter(l=>l.strength>=70);const n=t.sort((l,u)=>(u.confidence||0)-(l.confidence||0)).slice(0,5);return n.map(l=>({symbol:l.symbol,allocation:Math.round(100/n.length*10)/10,reason:l.reasons?.[0]||"تحلیل تکنیکال مثبت",riskLevel:l.strength>=80?"low":l.strength>=70?"medium":"high",expectedReturn:Math.round(l.strength*.3*10)/10,stopLoss:-5,takeProfit:15}))}var e=M();function J(){const[i,o]=(0,d.useState)([]),[r,s]=(0,d.useState)(""),[t,n]=(0,d.useState)(!1),[l,u]=(0,d.useState)([]),[c,S]=(0,d.useState)(50),b=(0,d.useRef)(null);(0,d.useEffect)(()=>{o([R()]),k()},[]),(0,d.useEffect)(()=>{b.current?.scrollIntoView({behavior:"smooth"})},[i]);const k=async()=>{const a=j();if(a.length>0){const m=H(a);S(m);const g=await E(a,[],30),x=K(a,g,"medium");u(x)}},f=async()=>{if(!r.trim()||t)return;const a={id:crypto.randomUUID(),role:"user",content:r,timestamp:new Date};o(m=>[...m,a]),s(""),n(!0),setTimeout(()=>{const m=j(),g=A(a.content,m,[]);o(x=>[...x,g]),n(!1)},800)},U=a=>{s(a),setTimeout(()=>f(),100)},D=[{label:"تحلیل بازار",icon:L,query:"وضعیت بازار چطوره؟"},{label:"پیشنهاد سبد",icon:v,query:"چه سهامی پیشنهاد می‌کنی؟"},{label:"مدیریت ریسک",icon:C,query:"نکات مدیریت ریسک رو بگو"}];return(0,e.jsxs)("div",{dir:"rtl",className:"flex flex-col h-[calc(100vh-200px)] gap-4",children:[(0,e.jsx)("div",{className:"flex items-center justify-between",children:(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[(0,e.jsx)(y,{className:"size-6 text-primary"}),(0,e.jsx)("h2",{className:"text-lg font-bold",children:"دستیار هوشمند ترید"}),(0,e.jsxs)(I,{variant:c>60?"default":c<40?"destructive":"secondary",children:["امتیاز بازار: ",c]})]})}),(0,e.jsx)(p,{className:"p-3",children:(0,e.jsxs)("div",{className:"flex items-center gap-2 text-sm",children:[(0,e.jsx)("span",{className:"text-muted-foreground",children:"وضعیت کلی بازار:"}),(0,e.jsx)("div",{className:"flex-1 h-2 bg-muted rounded-full overflow-hidden",children:(0,e.jsx)("div",{className:h("h-full transition-all duration-500",c>60?"bg-emerald-500":c<40?"bg-red-500":"bg-amber-500"),style:{width:`${c}%`}})}),(0,e.jsx)("span",{className:h("font-bold",c>60?"text-emerald-500":c<40?"text-red-500":"text-amber-500"),children:c>60?"مثبت":c<40?"منفی":"خنثی"})]})}),(0,e.jsxs)(p,{className:"flex-1 overflow-y-auto p-4 space-y-3",children:[i.map(a=>(0,e.jsxs)("div",{className:h("flex gap-3 max-w-[80%]",a.role==="user"?"mr-auto flex-row-reverse":"ml-auto"),children:[(0,e.jsx)("div",{className:h("rounded-full p-2 shrink-0",a.role==="user"?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"),children:a.role==="user"?(0,e.jsx)(P,{className:"size-4"}):(0,e.jsx)(y,{className:"size-4"})}),(0,e.jsx)("div",{className:h("rounded-2xl p-3 text-sm whitespace-pre-wrap",a.role==="user"?"bg-primary text-primary-foreground":"bg-muted"),children:a.content})]},a.id)),t&&(0,e.jsxs)("div",{className:"flex gap-3 ml-auto max-w-[80%]",children:[(0,e.jsx)("div",{className:"rounded-full p-2 bg-muted shrink-0",children:(0,e.jsx)(y,{className:"size-4 text-muted-foreground"})}),(0,e.jsx)("div",{className:"rounded-2xl p-3 bg-muted",children:(0,e.jsxs)("div",{className:"flex gap-1",children:[(0,e.jsx)("span",{className:"size-2 bg-muted-foreground/50 rounded-full animate-bounce"}),(0,e.jsx)("span",{className:"size-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]"}),(0,e.jsx)("span",{className:"size-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]"})]})})]}),(0,e.jsx)("div",{ref:b})]}),l.length>0&&(0,e.jsxs)(p,{className:"p-3",children:[(0,e.jsxs)("h3",{className:"text-sm font-semibold mb-2 flex items-center gap-2",children:[(0,e.jsx)(v,{className:"size-4 text-amber-500"}),"پیشنهادهای ویژه"]}),(0,e.jsx)("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2",children:l.slice(0,3).map((a,m)=>(0,e.jsxs)("div",{className:"border rounded-lg p-2 text-xs",children:[(0,e.jsx)("div",{className:"font-bold text-primary",children:a.symbol}),(0,e.jsxs)("div",{className:"text-muted-foreground mt-1",children:["سهم پیشنهادی: ",a.allocation,"٪"]}),(0,e.jsxs)("div",{className:"text-muted-foreground",children:["ریسک: ",a.riskLevel==="low"?"کم":a.riskLevel==="medium"?"متوسط":"زیاد"]})]},m))})]}),(0,e.jsx)("div",{className:"flex gap-2 flex-wrap",children:D.map(a=>(0,e.jsxs)(N,{variant:"outline",size:"sm",onClick:()=>U(a.query),disabled:t,className:"gap-1.5",children:[(0,e.jsx)(a.icon,{className:"size-3.5"}),a.label]},a.label))}),(0,e.jsxs)("div",{className:"flex gap-2",children:[(0,e.jsx)(_,{value:r,onChange:a=>s(a.target.value),onKeyDown:a=>a.key==="Enter"&&f(),placeholder:"سوال خود را بپرسید...",disabled:t,className:"flex-1"}),(0,e.jsx)(N,{onClick:f,disabled:t||!r.trim(),size:"icon",children:(0,e.jsx)(q,{className:"size-4"})})]})]})}export{J as AIAssistantTab};
