(()=>{
const $=s=>document.querySelector(s);
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- табло боксов: статусы сами сменяются по кругу ---------- */
const ST={free:['Свободен','var(--free)'],wash:['Моется','var(--wash)'],ready:['Ждёт оплату','var(--ready)'],paid:['Оплачено','var(--paid)']};
const NEXT={free:'wash',wash:'ready',ready:'paid',paid:'free'};
const PLATES=['A 123 BC 02','777 KZA 01','451 ABK 05','318 AAH 02','902 ZXC 01','064 MRT 13','220 BNS 17','515 KLM 02'];
const PAY=['QR','карта','наличные'];
let pi=0;
const B=[{s:'wash',p:PLATES[pi++],t:3},{s:'ready',p:PLATES[pi++],t:0},{s:'wash',p:PLATES[pi++],t:7},{s:'free',p:'',t:0}];
const boxes=$('#boxes');
boxes.innerHTML=B.map((b,i)=>'<div class="bx"><div class="n"><span>Бокс '+(i+1)+'</span><span class="tm"></span></div><span class="pl"></span><span class="s"></span><div class="bar"><i></i></div></div>').join('');
const els=[...boxes.children];
function paint(i){const b=B[i],e=els[i],[name,c]=ST[b.s];
  e.style.setProperty('--c',c);e.classList.toggle('on',b.s!=='free');
  e.querySelector('.pl').textContent=b.p||'—';e.querySelector('.s').textContent=name;
  e.querySelector('.tm').textContent=b.s==='wash'?b.t+' мин':'';
  e.querySelector('.bar i').style.width=b.s==='wash'?Math.min(95,b.t*6)+'%':b.s==='free'?'0':'100%';}
B.forEach((_,i)=>paint(i));

/* лента событий */
const feed=$('#feed');
function ev(text,c,k){const d=new Date(),t=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  const r=document.createElement('div');r.className='ev'+(k?' '+k:'');r.innerHTML='<i style="color:'+c+';background:'+c+'"></i><time>'+t+'</time><span>'+text+'</span>';
  feed.prepend(r);while(feed.children.length>4)feed.lastChild.remove();}
ev('Бокс 2 · '+B[1].p+' — мойка готова','var(--ready)');
ev('Бокс 3 · 555 AQA 01 без заказа — директору','var(--debt)','alert');
ev('Бокс 1 · '+B[0].p+' — машина заехала','var(--wash)');

let tn=0;
const EXTRA=[()=>ev('Запись из приложения · завтра 11:30','var(--acc)','rev'),()=>ev('Бокс 3 · 555 AQA 01 без заказа — директору','var(--debt)','alert'),()=>ev('Отзыв ★★★★★ · '+PLATES[(pi+3)%PLATES.length]+' · бонус 300 ₸','var(--acc)','rev'),()=>ev('Отзыв ★★ · Бокс 2 — директору','var(--debt)','alert'),()=>ev('WhatsApp «−15%» · 3 клиента не заезжали 3 недели','var(--acc)','rev')];
function tick(){
  if(++tn%4===0){EXTRA[(tn/4-1)%EXTRA.length]();return}
  B.forEach(b=>{if(b.s==='wash')b.t++});
  /* за один шаг меняется один бокс — так за табло легко следить */
  const i=Math.floor(Math.random()*B.length),b=B[i],n=NEXT[b.s];
  if(b.s==='wash'&&b.t<6){B.forEach((_,k)=>paint(k));return}
  b.s=n;
  if(n==='wash'){b.p=PLATES[pi++%PLATES.length];b.t=0;ev('Бокс '+(i+1)+' · '+b.p+' — машина заехала','var(--wash)')}
  if(n==='ready')ev('Бокс '+(i+1)+' · '+b.p+' — мойка готова','var(--ready)');
  if(n==='paid'){const kc=$('#kCars'),kr=$('#kRev');kc.textContent=+kc.textContent+1;kr.textContent=(+kr.textContent.replace(/\D/g,'')+[3500,5000,6500][i%3]).toLocaleString('ru-RU').replace(/\u00a0|,/g,' ')+' ₸'}
  if(n==='paid')ev('Бокс '+(i+1)+' · оплата, '+PAY[i%3],'var(--paid)');
  if(n==='free'){ev('Бокс '+(i+1)+' свободен','var(--free)');b.p=''}
  B.forEach((_,k)=>paint(k));
}
if(!still)setInterval(tick,2200);

{const v=document.getElementById('vposter'),im=document.querySelector('.shot>img');if(v&&im)v.style.backgroundImage='url('+im.src+')';}
/* камера: живое время кадра, время заезда и счётчик в боксе */
{const z=$('#zoom'),im=$('.shot>img');if(z&&im)z.style.backgroundImage='url('+im.src+')';
 const p2=v=>String(v).padStart(2,'0'),t0=Date.now()-(12*60+48)*1000,e0=new Date(t0);
 if($('#inT'))$('#inT').textContent=p2(e0.getHours())+':'+p2(e0.getMinutes());
 const tc=()=>{const d=new Date(),sec=Math.floor((Date.now()-t0)/1000);$('#camT').textContent=p2(d.getHours())+':'+p2(d.getMinutes())+':'+p2(d.getSeconds());$('#inBox').textContent=Math.floor(sec/60)+' мин '+p2(sec%60)+' с'};
 if($('#camT')){tc();setInterval(tc,1000)}}

/* камера: цикл распознавания номера */
{const cam=$('#cam'),card=$('#anpr');
 if(cam&&card){
  const PL='777 ACB',RG='01',sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const set=(...c)=>{cam.className='shot cam '+c.join(' ')};
  const acc=v=>{$('#mAcc').textContent=v.toFixed(1).replace('.',',')+'%';card.style.setProperty('--a',v+'%')};
  const reset=()=>{set();card.className='anpr';$('#aHead').textContent='Распознаю номер…';$('#pLbl').textContent='Ищу номер…';
    ['#pTxt','#kzN','#kzR'].forEach(q=>{$(q).textContent='';$(q).classList.remove('typed')});
    $('#mReg').textContent='—';$('#mAcc').textContent='—';$('#mT').textContent='—';card.style.setProperty('--a','0%')};
  const final=()=>{set('s2','s3','s4','s5');card.className='anpr on logged';$('#aHead').textContent='Номер распознан';$('#pLbl').textContent='KZ · номер найден';
    $('#pTxt').textContent=PL+' '+RG;$('#kzN').textContent=PL;$('#kzR').textContent=RG;$('#mReg').textContent='Казахстан · 01 Астана';acc(99.4);$('#mT').textContent='0,18 с'};
  async function type(el,txt,ms){el.classList.add('typed');for(let i=1;i<=txt.length;i++){el.textContent=txt.slice(0,i);await sleep(ms)}el.classList.remove('typed')}
  let visible=true;
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting},{threshold:.2}).observe(cam);
  async function loop(){
   for(;;){
    if(!visible||document.hidden){await sleep(500);continue}
    reset();await sleep(400);
    set('s1');await sleep(1100);
    set('s1','s2');await sleep(700);
    set('s2','s3');await sleep(650);
    set('s2','s3','s4');$('#pLbl').textContent='Номер найден · читаю';await sleep(900);
    set('s2','s3','s4','s5');$('#pLbl').textContent='KZ · номер найден';card.classList.add('on');$('#aHead').textContent='Номер распознан';
    const full=PL+' '+RG;
    await Promise.all([type($('#pTxt'),full,70),type($('#kzN'),PL,80).then(()=>type($('#kzR'),RG,80)),
      (async()=>{for(let v=62;v<=99.4;v+=2.6){acc(Math.min(v,99.4));await sleep(30)}acc(99.4)})()]);
    $('#mReg').textContent='Казахстан · 01 Астана';$('#mT').textContent='0,18 с';
    await sleep(500);card.classList.add('logged');
    await sleep(4200);
    set('s2','s3','s4','s5','out');card.classList.remove('logged');await sleep(700);
   }
  }
  if(still)final();else loop();
 }}


/* ---------- калькулятор потерь ---------- */
{const fmt=n=>Math.round(n).toLocaleString('ru-RU').replace(/ |,/g,' ');
 const ids=['box','cars','chk','pct'],inp={};ids.forEach(k=>inp[k]=$('#c-'+k));
 const PRICE=15900;
 function calc(){
  const v={};ids.forEach(k=>{const e=inp[k];v[k]=+e.value;e.style.setProperty('--p',((e.value-e.min)/(e.max-e.min)*100)+'%')});
  $('#o-box').textContent=v.box;$('#o-cars').textContent=v.cars;$('#o-chk').textContent=fmt(v.chk)+' ₸';$('#o-pct').textContent=v.pct+'%';
  const cars=v.box*v.cars*30*v.pct/100,loss=cars*v.chk,cost=v.box*PRICE;
  $('#r-loss').textContent=fmt(loss)+' ₸';$('#r-cars').textContent=fmt(cars);$('#r-year').textContent=fmt(loss*12)+' ₸';
  const need=Math.ceil(PRICE/v.chk);
  $('#r-verdict').innerHTML=loss>cost
   ?'Тариф «R8 КОНТРОЛЬ» на '+v.box+' '+(v.box%10===1&&v.box!==11?'бокс':(v.box%10>=2&&v.box%10<=4&&(v.box<12||v.box>14)?'бокса':'боксов'))+' стоит '+fmt(cost)+' ₸ в месяц — <b>в '+(loss/cost).toFixed(1).replace('.',',')+' раза меньше</b> этих потерь.'
   :'Тариф окупается, если камера найдёт <b>'+need+' '+(need===1?'машину':need<5?'машины':'машин')+' без заказа на бокс</b> в месяц.';
 }
 ids.forEach(k=>inp[k].addEventListener('input',calc));calc();}

/* ---------- шапка и появление блоков ---------- */
const top=$('#top');
const onScroll=()=>top.classList.toggle('sc',scrollY>8);
addEventListener('scroll',onScroll,{passive:true});onScroll();
if(!still&&'IntersectionObserver' in window){
  const rv=[...document.querySelectorAll('.rv')].filter(el=>el.getBoundingClientRect().top>innerHeight);
  rv.forEach(el=>el.classList.add('pre'));
  const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.remove('pre');io.unobserve(en.target)}}),{rootMargin:'0px 0px -8% 0px'});
  rv.forEach(el=>io.observe(el));
}

/* ---------- решения по типу мойки ---------- */
{const I={
  pin:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  doc:'<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  cal:'<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  cam:'<path d="M3 7h3l2-3h8l2 3h3v12H3z"/><circle cx="12" cy="13" r="3.5"/>',
  case:'<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  book:'<path d="M2.5 5.5c3-1.3 6.2-1.3 9.5.5 3.3-1.8 6.5-1.8 9.5-.5v14c-3-1.3-6.2-1.3-9.5.5-3.3-1.8-6.5-1.8-9.5-.5zM12 6v14"/>',
  user:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18.5c1.2-2 3.2-3 5.5-3s4.3 1 5.5 3"/>',
  smile:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8M9 9.5h.01M15 9.5h.01"/>',
  grow:'<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>',
  box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
  bars:'<path d="M4 21h16M7 17v-6M12 17V6M17 17v-9"/>',
  phone:'<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  gift:'<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  free:'<path d="M4 12h16M14 6l6 6-6 6"/>'};
 const SOL={
 't-new':[['pin','Привлечём клиентов с первых дней открытия','Интеграции и сервисы приведут клиентов из Яндекса, 2ГИС и приложения AquaGo.'],
          ['clock','Запуск за 1 день','Заведём прайс, мойщиков и боксы за день. Настройка и обучение бесплатно.'],
          ['doc','Правильный учёт с первой машины','База клиентов, касса и честная зарплата мойщиков — с первого дня работы.'],
          ['cal','14 дней бесплатно','Попробуйте R8 на своей мойке. Договора на год нет.']],
 't-own':[['shield','Защитим до 98% ваших финансов от воровства','Обеспечим чёткую фиксацию машин с помощью ИИ.'],
          ['doc','Автоматизируем учёт заказов','Чтобы всё было под контролем и вы не теряли время на проверку.'],
          ['cal','Сделаем удобную онлайн-запись','Чтобы привлекать новых клиентов, а постоянные заезжали в 2 раза чаще.'],
          ['star','Улучшим вашу репутацию у клиентов','После мойки CRM просит оценку, а плохой отзыв попадает к директору раньше, чем в 2ГИС.']],
 't-net':[['cam','Проверка камер за несколько минут','ИИ отмечает кадры на видеозаписях при заезде каждой машины.'],
          ['case','Простая работа с юр. лицами','Настройка прайс-листов, готовые шаблоны и учёт задолженностей.'],
          ['book','Обучаем весь персонал сети','Проводим внедрение до момента «всё работает», регулярно на связи.'],
          ['user','Единая учётная запись на все филиалы','Удобное переключение между филиалами, оперативный доступ ко всем отчётам.']],
 't-self':[['clock','Контроль времени мойки клиентами','Видно, сколько времени клиенты проводят на посту и какие режимы выбирают.'],
          ['smile','Построение клиентского сервиса','Клиентская база, бонусы, кешбэк и отзывы — без администратора на месте.'],
          ['grow','Поиск точек роста бизнеса','Пиковые часы, простои постов и средний чек подскажут, где мойка недозарабатывает.'],
          ['box','Автоматизация учёта магазина и склада','Продажи магазина и остатки химии — в одной системе.'],
          ['bars','Аналитика','Выручка по каждому посту и отчёты в телефоне — без поездок на мойку.']],
 't-sw':[['gift','Специальные условия при переходе от конкурентов','И настроим работу под ваш запрос.'],
          ['phone','Бесплатное мобильное приложение с онлайн-записью','Для повышения качества мойки и возвращения клиентов.'],
          ['cam','Система фиксации машин на основе ИИ','Для защиты от воровства. Проверка видео за 2 минуты на 1 бокс.'],
          ['star','Лучший функционал','Расчёт ЗП по вашим условиям, предзапись, удобный расчёт бонусов и кешбэка.']]};
 const svg=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+I[k]+'</svg>';
 const tabs=[...document.querySelectorAll('.tab')],pan=$('#p-sol');
 const show=id=>{const l=SOL[id];pan.style.setProperty('--n',l.length);
   pan.innerHTML=l.map(([k,h,p])=>'<div class="si"><span class="ic">'+svg(k)+'</span><h3>'+h+'</h3><p>'+p+'</p></div>').join('');
   tabs.forEach(t=>t.setAttribute('aria-selected',t.id===id));pan.setAttribute('aria-labelledby',id)};
 tabs.forEach(t=>t.addEventListener('click',()=>show(t.id)));show('t-new');}

/* ---------- видео: играет прямо на странице ---------- */
{const v=$('#vposter');
 if(v){const play=()=>{if(v.classList.contains('playing'))return;v.classList.add('playing');
   v.innerHTML='<iframe src="https://www.youtube-nocookie.com/embed/'+v.dataset.yt+'?autoplay=1&rel=0&playsinline=1" title="Видео о R8 CRM" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
   v.removeAttribute('role');v.removeAttribute('tabindex');v.removeAttribute('aria-label')};
  v.addEventListener('click',play);v.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();play()}});}}

/* ---------- отправка заявок на почту info@webmoika.kz ----------
   Скрипт лежит на хостинге webmoika.kz (папка server/ в репозитории), письмо уходит через SMTP ящика info@. */
const LEAD_URL='https://webmoika.kz/lead/send.php';
const hp=s=>{const el=$(s);return el?el.value:''}; // скрытое поле-ловушка; если в разметке его нет, форма всё равно работает
async function sendLead(data){
  const fd=new FormData();Object.entries(data).forEach(([k,v])=>fd.append(k,v));fd.append('page',location.href);
  const r=await fetch(LEAD_URL,{method:'POST',body:fd});
  let j=null;try{j=await r.json()}catch(_){}
  if(!r.ok||!j||!j.ok)throw new Error((j&&j.message)||('HTTP '+r.status));
}

/* ---------- угловая форма ---------- */
{const pop=$('#cpop'),btn=$('#cbtn');let opened=false;
 const open=v=>{pop.hidden=!v;btn.setAttribute('aria-expanded',v);if(v){opened=true;}};
 btn.addEventListener('click',()=>{open(pop.hidden);if(!pop.hidden)setTimeout(()=>$('#cp-phone')&&$('#cp-phone').focus(),50)});
 $('#cpX').addEventListener('click',()=>open(false));
 addEventListener('keydown',e=>{if(e.key==='Escape')open(false)});
 if(innerWidth>900)setTimeout(()=>{if(!opened)open(true)},30000);
 $('#cpForm').addEventListener('submit',async e=>{e.preventDefault();const ph=$('#cp-phone');
   if(ph.value.replace(/\D/g,'').length<10){ph.setAttribute('aria-invalid','true');$('#cpErr').textContent='Укажите телефон полностью';ph.focus();return}
   const b=e.target.querySelector('button[type=submit]');b.disabled=true;b.textContent='Отправляем…';
   try{await sendLead({form:'callback',name:$('#cp-name').value.trim(),phone:ph.value.trim(),website:hp('#cp-hp')});
     window.r8track&&r8track('lead',{form:'callback'});
     $('#cpHost').innerHTML='<div class="done" role="status"><b style="font-size:16px">Спасибо! Перезвоним в течение 15 минут.</b></div>'}
   catch(_){b.disabled=false;b.textContent='Жду звонка';$('#cpErr').textContent='Не удалось отправить. Позвоните нам: +7 701 722 02 15'}});
 $('#cp-phone').addEventListener('input',e=>{e.target.removeAttribute('aria-invalid');$('#cpErr').textContent=''});}

/* ---------- заявка на демо -> info@webmoika.kz ---------- */
document.querySelectorAll('[data-plan]').forEach(a=>a.addEventListener('click',()=>{$('#f-plan').value=a.dataset.plan}));
$('#lead').addEventListener('submit',async e=>{e.preventDefault();const ph=$('#f-phone');
  if(ph.value.replace(/\D/g,'').length<10){ph.setAttribute('aria-invalid','true');$('#ferr').textContent='Укажите телефон полностью, например +7 701 123 45 67';ph.focus();return}
  const esc=s=>s.replace(/[<>&"]/g,'');const name=esc($('#f-name').value.trim());
  const b=e.target.querySelector('button[type=submit]');b.disabled=true;b.textContent='Отправляем…';
  try{await sendLead({form:'demo',name:$('#f-name').value.trim(),phone:ph.value.trim(),boxes:$('#f-box').value,cameras:$('#f-cam').value,plan:$('#f-plan').value,website:hp('#f-hp')})}
  catch(_){b.disabled=false;b.textContent='Получить демо';$('#ferr').textContent='Не удалось отправить заявку. Позвоните или напишите в WhatsApp: +7 701 722 02 15';return}
  window.r8track&&r8track('lead',{form:'demo'});
  $('#formHost').innerHTML='<div class="done" role="status"><span class="ok"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span><h3 style="font-size:24px">Спасибо'+(name?', '+name:'')+'!</h3><p style="color:var(--ink-2)">Перезвоним по номеру '+esc(ph.value)+'.</p></div>'});
$('#f-phone').addEventListener('input',e=>{e.target.removeAttribute('aria-invalid');$('#ferr').textContent=''});

/* ---------- приложение для клиентов: мойка → время → запись, по кругу ---------- */
(()=>{const ag=$('#ag');if(!ag)return;
  const P=document.querySelectorAll('.phonew .push'),S=[...ag.querySelectorAll('.ag-s')],st=[...document.querySelectorAll('#agSteps span')],tap=$('#agTap'),slot=ag.querySelector('[data-ag="slot"]'),book=$('#agBook'),when=$('#agWhen');
  const STEP=[0,0,1,2];
  const show=i=>{S.forEach((s,k)=>{s.classList.toggle('on',k===i);s.classList.toggle('out',k<i)});st.forEach((s,k)=>s.classList.toggle('on',k===STEP[i]));P[0].classList.toggle('ag-in',i===3);P[1].classList.toggle('ag-in',i===0)};
  const pick=on=>{slot.classList.toggle('on',on);book.classList.toggle('off',!on);book.textContent=on?'Записаться на 11:30':'Выберите время';when.textContent=on?'Сегодня, 11:30 · ~40 мин':'Сегодня · время не выбрано'};
  if(still){show(2);pick(true);P.forEach(p=>p.classList.add('ag-in'));return}
  const press=el=>{const a=ag.getBoundingClientRect(),r=el.getBoundingClientRect();
    tap.style.left=(r.left-a.left+r.width*.62)+'px';tap.style.top=(r.top-a.top+r.height/2)+'px';tap.classList.add('v');
    setTimeout(()=>{tap.classList.remove('hit');void tap.offsetWidth;tap.classList.add('hit');el.classList.add('pr')},480);
    setTimeout(()=>el.classList.remove('pr'),700)};
  const T=[[1300,()=>press(ag.querySelector('[data-ag="w"]'))],[2200,()=>{tap.classList.remove('v');show(1)}],
    [3600,()=>press(ag.querySelector('[data-ag="time"]'))],[4500,()=>{tap.classList.remove('v');show(2)}],
    [5800,()=>press(slot)],[6300,()=>pick(true)],[7300,()=>press(book)],[8200,()=>{tap.classList.remove('v');show(3)}],
    [11800,()=>{ag.classList.add('rs');pick(false);show(0);void ag.offsetWidth;ag.classList.remove('rs')}]];
  let vis=false,t0=0,run=null;
  const loop=()=>{if(!vis){run=null;return}const t=performance.now()-t0;
    while(T[run.i]&&t>=T[run.i][0])T[run.i++][1]();
    if(run.i>=T.length){t0=performance.now();run.i=0}
    run.f=requestAnimationFrame(loop)};
  const start=()=>{if(run)return;run={i:0};t0=performance.now();ag.classList.add('rs');pick(false);show(0);void ag.offsetWidth;ag.classList.remove('rs');loop()};
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis)start()},{threshold:.3}).observe(ag);else{vis=true;start()}
})();
})();