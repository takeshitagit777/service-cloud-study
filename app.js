const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const STORE_KEY='sc-study-v1';
const STUDY_GOAL=80;
let questions=[], currentView='dashboard', studyPool=[], studyIndex=0, studyFilter='all', studySource='2026-04-28', studyCategory='all';
let mock=null;
let state = JSON.parse(localStorage.getItem(STORE_KEY)||'null') || { progress:{}, streak:0, bestStreak:0, sessions:[], theme:'dark' };

function save(){ localStorage.setItem(STORE_KEY,JSON.stringify(state)); }
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function p(uid){return state.progress[uid] || {attempts:0,correct:0,last:null,favorite:false};}
function metrics(){
  const vals=Object.values(state.progress), attempted=vals.filter(x=>x.attempts>0), attempts=attempted.reduce((a,x)=>a+x.attempts,0), correct=attempted.reduce((a,x)=>a+x.correct,0);
  return {attempted:attempted.length, attempts, correct, accuracy:attempts?Math.round(correct/attempts*100):0, favorites:vals.filter(x=>x.favorite).length, wrong:vals.filter(x=>x.attempts>x.correct).length};
}
function applyTheme(){document.body.classList.toggle('light',state.theme==='light')}


function setView(view){
  currentView=view; $$('.view').forEach(v=>v.classList.remove('active')); $('#view-'+view).classList.add('active');
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const titles={dashboard:'学習ダッシュボード',study:'一問一答',mock:'模擬試験',review:'復習',library:'問題一覧'}; $('#pageTitle').textContent=titles[view];
  $('#sidebar').classList.remove('open'); render(view);
}
function render(view){ updateGlobal(); ({dashboard:renderDashboard,study:renderStudy,mock:renderMock,review:renderReview,library:renderLibrary}[view])(); }
function updateGlobal(){const m=metrics();$('#sideAccuracy').textContent=m.accuracy+'%';$('#sideProgress').style.width=Math.min(100,m.attempted/questions.length*100)+'%';$('#sideSolved').textContent=`${m.attempted} / ${questions.length} 問に挑戦`;$('#topStreak').textContent=state.streak||0}

function renderDashboard(){
 const m=metrics(), cats=categoryStats(), recent=state.sessions.slice(-5).reverse();
 $('#view-dashboard').innerHTML=`
 <div class="grid stats-grid">
  ${stat('✓','総合正答率',m.accuracy+'%',m.attempts?`${m.correct} / ${m.attempts} 正解`:'まだ回答がありません','green')}
  ${stat('◎','挑戦した問題',m.attempted,`全 ${questions.length} 問`)}
  ${stat('🔥','最高連続正解',state.bestStreak||0,'自己ベスト','')}
  ${stat('↺','復習対象',m.wrong,`お気に入り ${m.favorites} 問`,'red')}
 </div>
 <div class="card big-action">
   <p class="eyebrow">TODAY'S STUDY</p><h2>過去問を、ひたすら解く。</h2>
   <p>最新116問と旧版80問を収録。日本語は事前に精査済みで、Trailhead / Omni-Channel / Einstein Next Best Action などの固有名詞は原文を維持します。外部翻訳APIへの通信はありません。</p>
   <button class="primary-btn" id="dashStart">一問一答を始める →</button>
 </div>
 <div class="grid dashboard-grid" style="margin-top:16px">
  <div class="card section-card"><div class="section-head"><div><h2>分野別パフォーマンス</h2><p>正答率が低い分野から優先して復習</p></div></div>
   <div class="category-list">${cats.slice(0,8).map(c=>`<div class="cat-row"><span class="name">${esc(c.name)}</span><div class="bar"><i style="width:${c.acc}%"></i></div><b>${c.attempts?c.acc+'%':'--'}</b></div>`).join('')}</div>
  </div>
  <div class="card section-card"><div class="section-head"><div><h2>進捗</h2><p>一度でも回答した問題</p></div></div>
    <div class="progress-ring" style="--p:${Math.round(m.attempted/questions.length*100)}"><div><strong>${Math.round(m.attempted/questions.length*100)}%</strong><span>${m.attempted}/${questions.length}</span></div></div>
    <div style="margin-top:20px">${recent.length?recent.map(s=>`<div class="side-stat"><span>${esc(s.label)}</span><b>${s.score}%</b></div>`).join(''):'<div class="empty" style="padding:20px">模擬試験の結果がここに表示されます</div>'}</div>
  </div>
 </div>`;
 $('#dashStart').onclick=()=>setView('study');
}
function stat(icon,label,val,sub,cls=''){return `<div class="card stat-card"><span class="stat-icon">${icon}</span><div class="stat-label">${label}</div><div class="stat-value ${cls}">${val}</div><div class="stat-sub">${sub}</div></div>`}
function categoryStats(){
 const map={}; questions.forEach(q=>{map[q.category] ||= {name:q.category,attempts:0,correct:0}; const x=p(q.uid);map[q.category].attempts+=x.attempts;map[q.category].correct+=x.correct});
 return Object.values(map).map(x=>({...x,acc:x.attempts?Math.round(x.correct/x.attempts*100):0})).sort((a,b)=>a.attempts&&b.attempts?a.acc-b.acc:b.attempts-a.attempts);
}

function buildStudyPool(){
 studyPool=questions.filter(q=>(studySource==='all'||q.source===studySource)&&(studyCategory==='all'||q.category===studyCategory));
 if(studyFilter==='wrong') studyPool=studyPool.filter(q=>p(q.uid).attempts>p(q.uid).correct);
 if(studyFilter==='unseen') studyPool=studyPool.filter(q=>p(q.uid).attempts===0);
 if(studyFilter==='favorite') studyPool=studyPool.filter(q=>p(q.uid).favorite);
 if(studyFilter==='random') studyPool=studyPool.sort(()=>Math.random()-.5);
 studyIndex=Math.min(studyIndex,Math.max(0,studyPool.length-1));
}
function renderStudy(){
 buildStudyPool(); const cats=[...new Set(questions.map(q=>q.category))].sort();
 $('#view-study').innerHTML=`<div class="filters">
  <select id="studySource" class="select"><option value="2026-04-28">最新 116問</option><option value="2026-01-08">旧版 80問</option><option value="all">両方 196問</option></select>
  <select id="studyCategory" class="select"><option value="all">すべての分野</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select>
  ${[['all','すべて'],['unseen','未回答'],['wrong','間違い'],['favorite','★ お気に入り'],['random','シャッフル']].map(([v,l])=>`<button class="filter-chip ${studyFilter===v?'active':''}" data-filter="${v}">${l}</button>`).join('')}
 </div><div id="studyBody"></div>`;
 $('#studySource').value=studySource; $('#studyCategory').value=studyCategory;
 $('#studySource').onchange=e=>{studySource=e.target.value;studyIndex=0;renderStudy()}; $('#studyCategory').onchange=e=>{studyCategory=e.target.value;studyIndex=0;renderStudy()};
 $$('[data-filter]').forEach(b=>b.onclick=()=>{studyFilter=b.dataset.filter;studyIndex=0;renderStudy()});
 renderStudyQuestion();
}
function renderStudyQuestion(){
 const host=$('#studyBody'); if(!studyPool.length){host.innerHTML=`<div class="card empty"><strong>対象の問題がありません</strong>フィルターを変更してください。</div>`;return}
 const q=studyPool[studyIndex], prog=p(q.uid);
 host.innerHTML=`<div class="question-layout"><div class="card question-card" id="studyQuestion">${questionHTML(q,prog,false)}
  <div class="question-actions"><div class="left-actions"><button class="tiny-btn ${prog.favorite?'active':''}" id="favBtn">★ お気に入り</button><button class="tiny-btn" id="showEnglish">EN 原文</button></div><div><button class="secondary-btn" id="prevQ" ${studyIndex===0?'disabled':''}>← 前へ</button> <button class="primary-btn" id="nextQ">次へ →</button></div></div>
 </div><aside class="card side-panel"><h3>学習ステータス</h3><div class="side-stat"><span>現在位置</span><b>${studyIndex+1} / ${studyPool.length}</b></div><div class="side-stat"><span>この問題の回答回数</span><b>${prog.attempts}</b></div><div class="side-stat"><span>この問題の正答率</span><b>${prog.attempts?Math.round(prog.correct/prog.attempts*100)+'%':'--'}</b></div><div class="jump-row"><input class="select" id="jumpNo" type="number" min="1" max="${studyPool.length}" value="${studyIndex+1}"><button class="secondary-btn" id="jumpBtn">移動</button></div><div class="keyboard-hint">ショートカット<br>1〜4: 選択肢 / →: 次へ / F: お気に入り</div></aside></div>`;
 wireQuestion($('#studyQuestion'),q,false);
 $('#favBtn').onclick=()=>{const x=p(q.uid);x.favorite=!x.favorite;state.progress[q.uid]=x;save();renderStudyQuestion()};
 $('#showEnglish').onclick=()=>toggleOriginal($('#studyQuestion'),$('#showEnglish'));
 $('#prevQ').onclick=()=>{studyIndex=Math.max(0,studyIndex-1);renderStudyQuestion()}; $('#nextQ').onclick=()=>{studyIndex=(studyIndex+1)%studyPool.length;renderStudyQuestion()};
 $('#jumpBtn').onclick=()=>{studyIndex=Math.max(0,Math.min(studyPool.length-1,(+$('#jumpNo').value||1)-1));renderStudyQuestion()};
}
function toggleOriginal(root,button){
 const on=root.classList.toggle('show-en'); if(button)button.textContent=on?'JP 日本語':'EN 原文';
}
function questionHTML(q,prog,isMock){
 const ja=q.ja||{question:q.question,options:q.options,explanation:q.explanation};
 const note=q.sourceNote?`<div class="source-note"><strong>原文注意</strong>${esc(q.sourceNote)}</div>`:'';
 const opts=Object.keys(q.options).map(l=>`<button class="option" data-answer="${l}"><span class="option-letter">${l}</span><span class="option-copy"><span class="option-text">${esc(ja.options[l]||q.options[l])}</span><span class="option-original">${esc(q.options[l])}</span></span></button>`).join('');
 return `<div class="question-meta"><span class="badge">${esc(q.category)}</span><span class="badge muted">${esc(q.source)}</span><span class="term-policy">固有名詞は原文維持</span><span class="question-no">Q${q.id}</span></div>
 ${note}<h2 class="question-text">${esc(ja.question)}</h2><div class="original-text"><span class="original-label">PDF原文</span>${esc(q.question)}</div>
 <div class="options">${opts}</div>
 <div class="answer-box"><div class="answer-title"></div><p>${esc(ja.explanation)}</p><div class="answer-source">※ 正解・解説は添付問題集の記載を基準にしています。Salesforce の仕様変更や元資料の誤植により、現行仕様と異なる可能性があります。</div><div class="original-text answer-original" style="margin-top:10px"><span class="original-label">PDF原文の解説</span>${esc(q.explanation)}</div></div>`;
}
function wireQuestion(root,q,isMock){
 $$('.option',root).forEach(btn=>btn.onclick=()=>{
   if(isMock){mock.answers[q.uid]=btn.dataset.answer;saveMockSelection(root,btn.dataset.answer);return}
   if(root.dataset.answered==='1') return; root.dataset.answered='1'; const selected=btn.dataset.answer, ok=selected===q.answer;
   const x=p(q.uid);x.attempts++;x.correct+=ok?1:0;x.last=ok?'correct':'wrong';x.lastAt=Date.now();state.progress[q.uid]=x;
   if(ok){state.streak=(state.streak||0)+1;state.bestStreak=Math.max(state.bestStreak||0,state.streak)}else state.streak=0;save();
   $$('.option',root).forEach(o=>{o.disabled=true;if(o.dataset.answer===q.answer)o.classList.add('correct');if(o.dataset.answer===selected&&!ok)o.classList.add('wrong')});
   const box=$('.answer-box',root);box.classList.add('show');$('.answer-title',box).innerHTML=ok?'<span class="green">✓ 正解</span>':'<span class="red">✕ 不正解</span> <span>問題集記載の正解: '+q.answer+'</span>';updateGlobal();
 });
}
function saveMockSelection(root,l){$$('.option',root).forEach(o=>o.classList.toggle('selected',o.dataset.answer===l));renderMockFooter()}

function renderMock(){
 if(mock?.finished){renderMockResult();return} if(mock?.active){renderMockQuestion();return}
 $('#view-mock').innerHTML=`<div class="card mock-setup"><p class="eyebrow">MOCK EXAM</p><h2>模擬試験を作成</h2><p style="color:var(--muted);font-size:12px;line-height:1.8">最新116問からランダム出題。途中では正解を表示せず、最後に点数と分野別成績をまとめて表示します。</p>
 <div class="mode-grid">${[[10,'クイック'],[30,'集中'],[60,'本番練習']].map(([n,l],i)=>`<div class="mode-card ${i===0?'active':''}" data-count="${n}"><strong>${n}問</strong><span>${l}モード</span></div>`).join('')}</div>
 <div class="filters"><select id="mockSource" class="select"><option value="2026-04-28">最新 116問</option><option value="all">両方 196問</option></select><label class="filter-chip"><input type="checkbox" id="mockTimer"> 60問では105分タイマーを使う</label></div>
 <button class="primary-btn" id="startMock">試験を開始 →</button></div>`;
 let count=10;$$('.mode-card').forEach(c=>c.onclick=()=>{$$('.mode-card').forEach(x=>x.classList.remove('active'));c.classList.add('active');count=+c.dataset.count});
 $('#startMock').onclick=()=>startMock(count,$('#mockSource').value,$('#mockTimer').checked);
}
function startMock(count,source,useTimer){
 let pool=questions.filter(q=>source==='all'||q.source===source).sort(()=>Math.random()-.5).slice(0,count);
 mock={active:true,finished:false,questions:pool,index:0,answers:{},started:Date.now(),duration:useTimer&&count===60?105*60:null,timer:null};
 if(mock.duration){mock.timer=setInterval(()=>{if(!mock?.active)return;const left=mock.duration-Math.floor((Date.now()-mock.started)/1000);const el=$('#mockTimerDisplay');if(el)el.textContent=formatTime(Math.max(0,left));if(left<=0)finishMock()},1000)}
 renderMockQuestion();
}
function formatTime(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function renderMockQuestion(){
 const q=mock.questions[mock.index]; const selected=mock.answers[q.uid];
 $('#view-mock').innerHTML=`<div class="question-layout"><div class="card question-card" id="mockQuestion">${questionHTML(q,p(q.uid),true)}</div><aside class="card side-panel"><h3>模擬試験</h3><div class="side-stat"><span>進捗</span><b>${mock.index+1} / ${mock.questions.length}</b></div><div class="side-stat"><span>回答済み</span><b>${Object.keys(mock.answers).length}</b></div>${mock.duration?`<div class="side-stat"><span>残り時間</span><b class="timer" id="mockTimerDisplay">${formatTime(Math.max(0,mock.duration-Math.floor((Date.now()-mock.started)/1000)))}</b></div>`:''}<button class="tiny-btn source-toggle" id="mockEnglish">EN 原文</button></aside></div><div id="mockFooter"></div>`;
 const root=$('#mockQuestion');wireQuestion(root,q,true); if(selected)saveMockSelection(root,selected); $('#mockEnglish').onclick=()=>toggleOriginal(root,$('#mockEnglish'));renderMockFooter();
}
function renderMockFooter(){
 const h=$('#mockFooter');if(!h||!mock)return;h.innerHTML=`<div class="card mock-footer"><div class="mock-dots">${mock.questions.map((q,i)=>`<i class="mock-dot ${mock.answers[q.uid]?'done':''} ${i===mock.index?'current':''}"></i>`).join('')}</div><div><button class="secondary-btn" id="mockPrev" ${mock.index===0?'disabled':''}>←</button> ${mock.index===mock.questions.length-1?'<button class="primary-btn" id="finishMock">採点する</button>':'<button class="primary-btn" id="mockNext">次へ →</button>'}</div></div>`;
 if($('#mockPrev'))$('#mockPrev').onclick=()=>{mock.index--;renderMockQuestion()};if($('#mockNext'))$('#mockNext').onclick=()=>{mock.index++;renderMockQuestion()};if($('#finishMock'))$('#finishMock').onclick=finishMock;
}
function finishMock(){
 if(!mock||mock.finished)return; if(mock.timer)clearInterval(mock.timer); let correct=0;
 mock.questions.forEach(q=>{const ans=mock.answers[q.uid];if(ans===q.answer)correct++;if(ans){const x=p(q.uid);x.attempts++;x.correct+=ans===q.answer?1:0;x.last=ans===q.answer?'correct':'wrong';x.lastAt=Date.now();state.progress[q.uid]=x}});
 const score=Math.round(correct/mock.questions.length*100);state.sessions.push({at:Date.now(),label:`模擬 ${mock.questions.length}問`,score,correct,total:mock.questions.length});state.sessions=state.sessions.slice(-30);state.streak=0;save();mock.result={score,correct};mock.active=false;mock.finished=true;renderMockResult();updateGlobal();
}
function renderMockResult(){
 const r=mock.result, pass=r.score>=STUDY_GOAL, cat={};mock.questions.forEach(q=>{cat[q.category]||={n:0,c:0};cat[q.category].n++;if(mock.answers[q.uid]===q.answer)cat[q.category].c++});
 $('#view-mock').innerHTML=`<div class="card result-hero"><p class="eyebrow">RESULT</p><div class="score-big ${pass?'green':'red'}">${r.score}<span> / 100</span></div><div class="result-status">${pass?`学習目標 ${STUDY_GOAL}% をクリア`:`${STUDY_GOAL}%まであと ${Math.max(0,STUDY_GOAL-r.score)}pt`}</div><p style="color:var(--muted);font-size:11px">※ ${STUDY_GOAL}%はこのアプリ内の学習目標で、Salesforce 公式の合格ラインを示すものではありません。</p><div class="result-grid"><div class="result-mini"><b>${r.correct}</b><span>正解</span></div><div class="result-mini"><b>${mock.questions.length-r.correct}</b><span>不正解</span></div><div class="result-mini"><b>${Object.keys(mock.answers).length}</b><span>回答数</span></div></div><button class="primary-btn" id="retryMock">もう一度</button> <button class="secondary-btn" id="goReview">間違いを復習</button></div><div class="card section-card" style="margin-top:16px"><div class="section-head"><h2>分野別スコア</h2></div><div class="category-list">${Object.entries(cat).map(([n,x])=>{const a=Math.round(x.c/x.n*100);return `<div class="cat-row"><span class="name">${esc(n)}</span><div class="bar"><i style="width:${a}%"></i></div><b>${a}%</b></div>`}).join('')}</div></div>`;
 $('#retryMock').onclick=()=>{mock=null;renderMock()};$('#goReview').onclick=()=>setView('review');
}

function renderReview(){
 const wrong=questions.filter(q=>p(q.uid).attempts>p(q.uid).correct), fav=questions.filter(q=>p(q.uid).favorite);
 $('#view-review').innerHTML=`<div class="filters"><button class="filter-chip active" data-r="wrong">間違えた問題 ${wrong.length}</button><button class="filter-chip" data-r="fav">お気に入り ${fav.length}</button></div><div id="reviewList"></div>`;
 function draw(arr){$('#reviewList').innerHTML=arr.length?`<div class="review-grid">${arr.map(listItem).join('')}</div>`:`<div class="card empty"><strong>まだありません</strong>一問一答を進めると、ここに復習対象がたまります。</div>`;wireList(arr)} draw(wrong);
 $$('[data-r]').forEach(b=>b.onclick=()=>{$$('[data-r]').forEach(x=>x.classList.remove('active'));b.classList.add('active');draw(b.dataset.r==='wrong'?wrong:fav)});
}
function listItem(q){const x=p(q.uid),status=x.attempts?(x.last==='correct'?'<span class="status-pill ok">直近 正解</span>':'<span class="status-pill ng">直近 不正解</span>'):'<span class="status-pill">未回答</span>';const title=q.ja?.question||q.question;return `<div class="card list-item" data-uid="${q.uid}"><div class="list-num">Q${q.id}</div><div><h3>${esc(title)}</h3><p>${esc(q.category)} ・ ${q.source} ・ ${x.attempts}回回答</p></div>${status}</div>`}
function wireList(arr){$$('[data-uid]').forEach(el=>el.onclick=()=>{const q=questions.find(x=>x.uid===el.dataset.uid);studySource=q.source;studyCategory='all';studyFilter='all';buildStudyPool();studyIndex=studyPool.findIndex(x=>x.uid===q.uid);setView('study')})}

function renderLibrary(){
 const cats=[...new Set(questions.map(q=>q.category))].sort();
 $('#view-library').innerHTML=`<div class="filters"><input id="libSearch" class="search-input" placeholder="問題文・選択肢を検索"><select id="libSource" class="select"><option value="all">両方 196問</option><option value="2026-04-28">最新 116問</option><option value="2026-01-08">旧版 80問</option></select><select id="libCat" class="select"><option value="all">すべての分野</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div id="libList"></div>`;
 const draw=()=>{const s=$('#libSearch').value.toLowerCase(),src=$('#libSource').value,cat=$('#libCat').value;const arr=questions.filter(q=>{const hay=[q.ja?.question||'',...Object.values(q.ja?.options||{}),q.question,...Object.values(q.options)].join(' ').toLowerCase();return (src==='all'||q.source===src)&&(cat==='all'||q.category===cat)&&(!s||hay.includes(s))});$('#libList').innerHTML=arr.length?`<div class="library-list">${arr.map(listItem).join('')}</div>`:'<div class="card empty"><strong>見つかりません</strong>検索条件を変更してください。</div>';wireList(arr)};
 $('#libSearch').oninput=draw;$('#libSource').onchange=draw;$('#libCat').onchange=draw;draw();
}

function exportData(){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='service-cloud-study-backup.json';a.click();URL.revokeObjectURL(a.href)}
function importData(file){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.state)throw 0;state=d.state;save();applyTheme();render(currentView);toast('学習データを読み込みました')}catch(e){toast('読み込みに失敗しました')}};r.readAsText(file)}

async function init(){
 questions=await fetch('./questions.json').then(r=>r.json()); applyTheme();
 $$('.nav-item').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('#themeBtn').onclick=()=>{state.theme=state.theme==='light'?'dark':'light';save();applyTheme()};$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
 $('#exportBtn').onclick=exportData;$('#importInput').onchange=e=>e.target.files[0]&&importData(e.target.files[0]);
 document.addEventListener('keydown',e=>{if(currentView!=='study'||!studyPool.length||['INPUT','SELECT'].includes(document.activeElement.tagName))return;const q=studyPool[studyIndex],root=$('#studyQuestion');if(['1','2','3','4'].includes(e.key)){const l=['A','B','C','D'][+e.key-1];const b=$(`.option[data-answer="${l}"]`,root);if(b&&!b.disabled)b.click()}if(e.key==='ArrowRight')$('#nextQ')?.click();if(e.key.toLowerCase()==='f')$('#favBtn')?.click()});
 renderDashboard();updateGlobal();
}
init();
