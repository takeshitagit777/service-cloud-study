(() => {
  'use strict';

  const QUESTIONS = Array.isArray(window.QUESTIONS) ? window.QUESTIONS : [];
  const STORAGE_KEY = 'serviceCloudConsultant196Ja_v1';
  const CATEGORIES = [
    {id:'industry', label:'業界知識'},
    {id:'implementation', label:'実装戦略'},
    {id:'solution', label:'Service Cloudソリューション設計'},
    {id:'knowledge', label:'Knowledge管理'},
    {id:'channels', label:'受付・インタラクションチャネル'},
    {id:'case', label:'ケース管理'},
    {id:'analytics', label:'コンタクトセンター分析'},
    {id:'integrations', label:'システム連携・データ管理'}
  ];
  const SOURCE_LABELS = {
    '2026-01-08': '2026-01-08版（80問）',
    '2026-04-28': '2026-04-28版（116問）'
  };

  const defaultState = () => ({answers:{}, favorites:{}, mockHistory:[]});
  let state = loadState();
  let practice = {list:[], index:0, filter:'all', source:'all', answered:false, selected:null};
  let mock = null;
  let mockTimer = null;

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? {...defaultState(), ...JSON.parse(raw)} : defaultState();
    }catch(_){ return defaultState(); }
  }
  function saveState(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(_){} }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function pct(a,b){ return b ? Math.round(a/b*100) : 0; }
  function catLabel(id){ return CATEGORIES.find(c=>c.id===id)?.label || id; }
  function sourceClass(q){ return q.source==='2026-01-08' ? 'jan' : 'apr'; }
  function sourceTag(q){ return `<span class="source-tag ${sourceClass(q)}">${esc(q.sourceLabel)} Q${q.sourceQuestion}</span>`; }
  function sourceFilter(source){ return source==='all' ? QUESTIONS : QUESTIONS.filter(q=>q.source===source); }
  function statsFor(list=QUESTIONS){
    let attempted=0, correct=0;
    list.forEach(q=>{ const a=state.answers[q.id]; if(a){attempted++; if(a.correct) correct++;} });
    return {attempted, correct, total:list.length, rate:pct(correct,attempted)};
  }
  function wrongQuestions(){ return QUESTIONS.filter(q=>state.answers[q.id] && !state.answers[q.id].correct); }

  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]');
    if(nav){ switchView(nav.dataset.nav); }
  });

  function switchView(id){
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
    document.querySelectorAll('.nav-item').forEach(v=>v.classList.toggle('active',v.dataset.nav===id));
    clearMockTimer();
    document.getElementById('topTimer').textContent='';
    if(id==='home') renderHome();
    if(id==='practice') startPractice(practice.filter || 'all', practice.source || 'all');
    if(id==='mock') renderMockLanding();
    if(id==='review') renderReview();
    if(id==='analysis') renderAnalysis();
    if(id==='bank') renderBank();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderHome(){
    const s=statsFor();
    const wrong=wrongQuestions().length;
    const jan=statsFor(QUESTIONS.filter(q=>q.source==='2026-01-08'));
    const apr=statsFor(QUESTIONS.filter(q=>q.source==='2026-04-28'));
    document.getElementById('home').innerHTML = `
      <div class="hero">
        <div class="hero-kicker">Salesforce Service Cloud Consultant</div>
        <h1>過去問 196問を日本語で学習</h1>
        <p>2026-01-08版の80問と、2026-04-28版の116問を両方そのまま収録しています。重複問題も削除せず、出典ごとに別問題として保持。学習履歴はこのブラウザに自動保存されます。</p>
        <div class="hero-actions"><button class="btn primary" onclick="switchView('practice')">一問一答を始める</button><button class="btn" onclick="switchView('mock')">60問模試を受ける</button></div>
      </div>
      <div class="grid">
        <div class="card"><div class="muted small">回答済み</div><div class="stat">${s.attempted}<span class="muted" style="font-size:15px"> / 196</span></div><div class="progress"><div style="width:${pct(s.attempted,196)}%"></div></div></div>
        <div class="card"><div class="muted small">累計正答率</div><div class="stat">${s.rate}%</div><div class="muted small">回答済み問題ベース</div></div>
        <div class="card"><div class="muted small">要復習</div><div class="stat">${wrong}</div><div class="muted small">最後の回答が不正解の問題</div></div>
      </div>
      <div class="section-title"><h2>収録元</h2><p class="muted small">2つのPDFを統合・重複保持</p></div>
      <div class="source-grid">
        <div class="card source-card"><div class="source-number">80</div><div><strong>2026-01-08版</strong><div class="muted small">${jan.attempted}/80問回答・正答率 ${jan.rate}%</div></div></div>
        <div class="card source-card"><div class="source-number">116</div><div><strong>2026-04-28版</strong><div class="muted small">${apr.attempted}/116問回答・正答率 ${apr.rate}%</div></div></div>
      </div>
      <div class="section-title"><h2>分野別進捗</h2></div>
      <div class="card">${CATEGORIES.map(c=>{const list=QUESTIONS.filter(q=>q.category===c.id);const x=statsFor(list);return `<div class="category-row"><div><strong>${esc(c.label)}</strong><div class="muted small">${x.attempted}/${list.length}問回答</div></div><div><div class="progress"><div style="width:${x.rate}%"></div></div></div><strong style="text-align:right">${x.rate}%</strong></div>`;}).join('')}</div>
      <div class="section-title"><h2>データ管理</h2></div>
      <div class="card"><div class="actions" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn danger" onclick="resetProgress()">学習履歴をリセット</button></div><div class="muted small" style="margin-top:9px">履歴はlocalStorageに保存され、GitHub/Vercel側へ送信されません。</div></div>
      <div class="footer-note">Service Cloud Consultant 自習用・日本語学習サイト</div>`;
  }

  function sourceSelect(value='all'){
    return `<select id="sourceFilter" aria-label="出典"><option value="all" ${value==='all'?'selected':''}>全196問</option><option value="2026-01-08" ${value==='2026-01-08'?'selected':''}>2026-01-08版（80問）</option><option value="2026-04-28" ${value==='2026-04-28'?'selected':''}>2026-04-28版（116問）</option></select>`;
  }
  function practiceFilterSelect(value='all'){
    return `<select id="practiceFilter" aria-label="問題フィルター"><option value="all" ${value==='all'?'selected':''}>すべて</option><option value="unanswered" ${value==='unanswered'?'selected':''}>未回答</option><option value="wrong" ${value==='wrong'?'selected':''}>間違いのみ</option><option value="fav" ${value==='fav'?'selected':''}>お気に入り</option>${CATEGORIES.map(c=>`<option value="${c.id}" ${value===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select>`;
  }

  function buildPracticeList(filter='all', source='all'){
    let list=sourceFilter(source);
    if(filter==='wrong') list=list.filter(q=>state.answers[q.id] && !state.answers[q.id].correct);
    else if(filter==='fav') list=list.filter(q=>state.favorites[q.id]);
    else if(filter==='unanswered') list=list.filter(q=>!state.answers[q.id]);
    else if(filter!=='all') list=list.filter(q=>q.category===filter);
    return shuffle(list);
  }

  window.startPractice = function(filter='all', source='all'){
    practice={list:buildPracticeList(filter,source),index:0,filter,source,answered:false,selected:null};
    renderPractice();
  };
  function renderPractice(){
    const root=document.getElementById('practice');
    if(!practice.list.length){
      root.innerHTML=`<div class="toolbar">${sourceSelect(practice.source)}${practiceFilterSelect(practice.filter)}<button class="btn" onclick="applyPracticeFilters()">適用</button></div><div class="card empty">条件に該当する問題がありません。</div>`;return;
    }
    const q=practice.list[practice.index];
    root.innerHTML=`
      <div class="toolbar">${sourceSelect(practice.source)}${practiceFilterSelect(practice.filter)}<button class="btn" onclick="applyPracticeFilters()">適用</button><button class="btn" onclick="reshufflePractice()">🔀 並び替え</button><div class="spacer"></div><span class="muted small">${practice.index+1} / ${practice.list.length}</span></div>
      ${questionCard(q,practice.selected,practice.answered,'practice')}`;
  }
  window.applyPracticeFilters=function(){ startPractice(document.getElementById('practiceFilter').value,document.getElementById('sourceFilter').value); };
  window.reshufflePractice=function(){ practice.list=shuffle(practice.list);practice.index=0;practice.answered=false;practice.selected=null;renderPractice(); };
  window.answerPractice=function(choice){
    if(practice.answered) return;
    const q=practice.list[practice.index];
    const correct=choice===q.answer;
    state.answers[q.id]={choice,correct,at:Date.now()};saveState();
    practice.selected=choice;practice.answered=true;renderPractice();
  };
  window.nextPractice=function(delta){
    const next=practice.index+delta;if(next<0||next>=practice.list.length)return;
    practice.index=next;practice.answered=false;practice.selected=null;renderPractice();window.scrollTo({top:0,behavior:'smooth'});
  };
  window.toggleFavorite=function(id,rerender='practice'){
    state.favorites[id]=!state.favorites[id];if(!state.favorites[id])delete state.favorites[id];saveState();
    if(rerender==='practice')renderPractice();if(rerender==='review')renderReview();
  };

  function questionCard(q,selected,answered,mode){
    const fav=!!state.favorites[q.id];
    const choices=q.choices.map((c,i)=>{
      let cls='choice'; if(answered){if(i===q.answer)cls+=' correct'; else if(i===selected)cls+=' wrong';} else if(i===selected)cls+=' selected';
      const handler=mode==='practice'?`answerPractice(${i})`:'';
      return `<button class="${cls}" ${answered||mode!=='practice'?'disabled':''} ${handler?`onclick="${handler}"`:''}><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(c)}</span></button>`;
    }).join('');
    const result=answered?`<div class="explain"><strong class="${selected===q.answer?'good-text':'bad-text'}">${selected===q.answer?'正解！':'不正解'}　正解：${String.fromCharCode(65+q.answer)}. ${esc(q.choices[q.answer])}</strong>${esc(q.explanation)}</div>`:'';
    return `<div class="question-card"><div class="q-head"><div class="q-meta"><span class="q-number">${esc(q.id)}</span>${sourceTag(q)}<span class="tag">${esc(catLabel(q.category))}</span><span class="tag">${esc(q.concept)}</span></div><button class="heart ${fav?'on':''}" onclick="toggleFavorite('${q.id}','${mode}')" aria-label="お気に入り">${fav?'♥':'♡'}</button></div><div class="q-text">${esc(q.question)}</div><div class="choices">${choices}</div>${result}<div class="quiz-footer"><button class="btn" onclick="nextPractice(-1)" ${practice.index===0?'disabled':''}>← 前へ</button><div class="spacer"></div><button class="btn primary" onclick="nextPractice(1)" ${practice.index===practice.list.length-1?'disabled':''}>次へ →</button></div></div>`;
  }

  function renderMockLanding(){
    document.getElementById('mock').innerHTML=`<div class="hero"><div class="hero-kicker">Mock Exam</div><h1>60問 模擬試験</h1><p>196問から60問をランダム出題します。出典を片方に絞ることもできます。制限時間は105分。終了後に正答率と分野別結果を確認できます。</p></div><div class="section-title"><h2>模試設定</h2></div><div class="card"><div class="toolbar">${sourceSelect('all')}<button class="btn primary" onclick="startMockFromUi()">模試を開始</button></div><div class="muted small">※同一内容の問題が2つのPDFに収録されている場合も、別問題として抽選対象になります。</div></div>${state.mockHistory.length?mockHistoryHtml():''}`;
  }
  function mockHistoryHtml(){return `<div class="section-title"><h2>最近の模試</h2></div><div class="card table-wrap"><table class="table"><thead><tr><th>日時</th><th>出典</th><th>正答</th><th>正答率</th></tr></thead><tbody>${state.mockHistory.slice(0,8).map(h=>`<tr><td>${new Date(h.at).toLocaleString('ja-JP')}</td><td>${esc(h.sourceLabel)}</td><td>${h.correct}/${h.total}</td><td>${h.rate}%</td></tr>`).join('')}</tbody></table></div>`;}
  window.startMockFromUi=function(){ startMock(document.getElementById('sourceFilter').value); };
  function startMock(source='all'){
    const pool=sourceFilter(source);const size=Math.min(60,pool.length);
    mock={questions:shuffle(pool).slice(0,size),index:0,answers:{},flagged:{},startedAt:Date.now(),duration:105*60,source};
    renderMock();startMockTimer();
  }
  function startMockTimer(){clearMockTimer();updateTimer();mockTimer=setInterval(updateTimer,1000);}
  function clearMockTimer(){if(mockTimer){clearInterval(mockTimer);mockTimer=null;}}
  function updateTimer(){if(!mock)return;const left=Math.max(0,mock.duration-Math.floor((Date.now()-mock.startedAt)/1000));const mm=String(Math.floor(left/60)).padStart(2,'0'),ss=String(left%60).padStart(2,'0');document.getElementById('topTimer').textContent=`残り ${mm}:${ss}`;if(left<=0)finishMock();}
  function renderMock(){
    const root=document.getElementById('mock'),q=mock.questions[mock.index],selected=mock.answers[q.id];
    root.innerHTML=`<div class="mock-layout"><div class="question-card"><div class="q-head"><div class="q-meta"><span class="q-number">${mock.index+1} / ${mock.questions.length}</span>${sourceTag(q)}<span class="tag">${esc(catLabel(q.category))}</span></div><button class="heart ${mock.flagged[q.id]?'on':''}" onclick="toggleMockFlag('${q.id}')">⚑</button></div><div class="q-text">${esc(q.question)}</div><div class="choices">${q.choices.map((c,i)=>`<button class="choice ${selected===i?'selected':''}" onclick="answerMock(${i})"><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(c)}</span></button>`).join('')}</div><div class="quiz-footer"><button class="btn" onclick="goMock(-1)" ${mock.index===0?'disabled':''}>← 前へ</button><div class="spacer"></div><button class="btn" onclick="goMock(1)" ${mock.index===mock.questions.length-1?'disabled':''}>次へ →</button><button class="btn primary" onclick="confirmFinishMock()">採点する</button></div></div><aside class="card mock-side"><strong>問題一覧</strong><div class="q-grid" style="margin-top:10px">${mock.questions.map((x,i)=>`<button class="${mock.answers[x.id]!==undefined?'answered':''} ${i===mock.index?'current':''} ${mock.flagged[x.id]?'flagged':''}" onclick="jumpMock(${i})">${i+1}</button>`).join('')}</div><div class="mock-summary"><div class="mock-summary-row"><span class="muted">回答済み</span><strong>${Object.keys(mock.answers).length}/${mock.questions.length}</strong></div><div class="mock-summary-row"><span class="muted">見直し</span><strong>${Object.keys(mock.flagged).length}</strong></div></div></aside></div>`;
  }
  window.answerMock=function(i){mock.answers[mock.questions[mock.index].id]=i;renderMock();};
  window.goMock=function(d){const i=mock.index+d;if(i>=0&&i<mock.questions.length){mock.index=i;renderMock();window.scrollTo({top:0,behavior:'smooth'});}};
  window.jumpMock=function(i){mock.index=i;renderMock();window.scrollTo({top:0,behavior:'smooth'});};
  window.toggleMockFlag=function(id){mock.flagged[id]=!mock.flagged[id];if(!mock.flagged[id])delete mock.flagged[id];renderMock();};
  window.confirmFinishMock=function(){const remain=mock.questions.length-Object.keys(mock.answers).length;if(remain&&!confirm(`未回答が${remain}問あります。採点しますか？`))return;finishMock();};
  function finishMock(){if(!mock)return;clearMockTimer();let correct=0;mock.questions.forEach(q=>{const choice=mock.answers[q.id];if(choice===q.answer)correct++;if(choice!==undefined){state.answers[q.id]={choice,correct:choice===q.answer,at:Date.now()};}});const rate=pct(correct,mock.questions.length);state.mockHistory.unshift({at:Date.now(),source:mock.source,sourceLabel:mock.source==='all'?'全196問':SOURCE_LABELS[mock.source],correct,total:mock.questions.length,rate});state.mockHistory=state.mockHistory.slice(0,20);saveState();renderMockResult(correct,rate);}
  function renderMockResult(correct,rate){
    const qs=mock.questions;document.getElementById('topTimer').textContent='';
    const catRows=CATEGORIES.map(c=>{const list=qs.filter(q=>q.category===c.id);if(!list.length)return'';const ok=list.filter(q=>mock.answers[q.id]===q.answer).length;return `<tr><td>${esc(c.label)}</td><td>${ok}/${list.length}</td><td>${pct(ok,list.length)}%</td></tr>`;}).join('');
    document.getElementById('mock').innerHTML=`<div class="card result-hero"><div class="muted">模擬試験結果</div><div class="score ${rate>=65?'good-text':'bad-text'}">${rate}%</div><div><strong>${correct} / ${qs.length} 問正解</strong></div><div style="margin-top:16px"><button class="btn primary" onclick="renderMockLanding()">もう一度受ける</button></div></div><div class="grid two"><div class="card table-wrap"><h3>分野別</h3><table class="table"><thead><tr><th>分野</th><th>正解</th><th>正答率</th></tr></thead><tbody>${catRows}</tbody></table></div><div class="card"><h3>復習ポイント</h3><p class="muted">不正解だった問題は「間違い復習」に自動追加されます。一問一答の回答履歴にも反映されています。</p><button class="btn" onclick="switchView('review')">間違いを復習する</button></div></div>`;mock=null;
  }

  function renderReview(){
    const list=wrongQuestions();const root=document.getElementById('review');
    if(!list.length){root.innerHTML='<div class="card empty">現在、要復習の問題はありません。🎉</div>';return;}
    root.innerHTML=`<div class="section-title"><h2>間違い復習</h2><span class="muted small">${list.length}問</span></div><div class="bank-list">${list.map(q=>{const a=state.answers[q.id];return `<div class="bank-item" onclick="openQuestionFromBank('${q.id}')"><div class="bank-top">${sourceTag(q)}<span class="tag">${esc(catLabel(q.category))}</span><span class="tag">${esc(q.concept)}</span></div><div class="bank-q">${esc(q.question)}</div><div class="bank-answer">あなたの回答：${a.choice!==undefined?String.fromCharCode(65+a.choice):'-'} ／ 正解：${String.fromCharCode(65+q.answer)}. ${esc(q.choices[q.answer])}</div></div>`;}).join('')}</div>`;
  }

  function renderAnalysis(){
    const all=statsFor();const jan=statsFor(QUESTIONS.filter(q=>q.source==='2026-01-08')),apr=statsFor(QUESTIONS.filter(q=>q.source==='2026-04-28'));
    document.getElementById('analysis').innerHTML=`<div class="section-title"><h2>学習分析</h2></div><div class="grid"><div class="card"><div class="muted small">全体正答率</div><div class="stat">${all.rate}%</div><div>${all.correct}/${all.attempted} 正解</div></div><div class="card"><div class="muted small">80問版</div><div class="stat">${jan.rate}%</div><div>${jan.attempted}/80 回答</div></div><div class="card"><div class="muted small">116問版</div><div class="stat">${apr.rate}%</div><div>${apr.attempted}/116 回答</div></div></div><div class="section-title"><h2>分野別</h2></div><div class="card table-wrap"><table class="table"><thead><tr><th>分野</th><th>問題数</th><th>回答済み</th><th>正解</th><th>正答率</th></tr></thead><tbody>${CATEGORIES.map(c=>{const list=QUESTIONS.filter(q=>q.category===c.id),s=statsFor(list);return `<tr><td>${esc(c.label)}</td><td>${list.length}</td><td>${s.attempted}</td><td>${s.correct}</td><td><strong>${s.rate}%</strong></td></tr>`;}).join('')}</tbody></table></div>`;
  }

  function renderBank(){
    const root=document.getElementById('bank');root.innerHTML=`<div class="section-title"><h2>問題バンク</h2><span class="muted small">196問</span></div><div class="toolbar">${sourceSelect('all')}<select id="bankCategory"><option value="all">全分野</option>${CATEGORIES.map(c=>`<option value="${c.id}">${esc(c.label)}</option>`).join('')}</select><input id="bankSearch" type="search" placeholder="問題文・選択肢・論点を検索" /><button class="btn" onclick="applyBankFilter()">検索</button></div><div id="bankResults"></div>`;applyBankFilter();
  }
  window.applyBankFilter=function(){
    const source=document.getElementById('sourceFilter')?.value||'all',cat=document.getElementById('bankCategory')?.value||'all',term=(document.getElementById('bankSearch')?.value||'').trim().toLowerCase();let list=sourceFilter(source);if(cat!=='all')list=list.filter(q=>q.category===cat);if(term)list=list.filter(q=>[q.question,q.concept,...q.choices].join(' ').toLowerCase().includes(term));
    document.getElementById('bankResults').innerHTML=list.length?`<div class="bank-list">${list.map(q=>`<div class="bank-item" onclick="openQuestionFromBank('${q.id}')"><div class="bank-top">${sourceTag(q)}<span class="tag">${esc(catLabel(q.category))}</span><span class="tag">${esc(q.concept)}</span></div><div class="bank-q">${esc(q.question)}</div><div class="bank-answer">正解：${String.fromCharCode(65+q.answer)}. ${esc(q.choices[q.answer])}</div></div>`).join('')}</div>`:'<div class="card empty">該当する問題がありません。</div>';
  };
  window.openQuestionFromBank=function(id){const q=QUESTIONS.find(x=>x.id===id);if(!q)return;practice={list:[q],index:0,filter:'all',source:'all',answered:false,selected:null};document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='practice'));document.querySelectorAll('.nav-item').forEach(v=>v.classList.toggle('active',v.dataset.nav==='practice'));renderPractice();window.scrollTo({top:0,behavior:'smooth'});};
  window.resetProgress=function(){if(!confirm('回答履歴・お気に入り・模試履歴をすべて削除しますか？'))return;state=defaultState();saveState();renderHome();};

  window.switchView = switchView;
  window.renderMockLanding = renderMockLanding;


  if(QUESTIONS.length!==196){document.getElementById('home').innerHTML=`<div class="notice">問題データの読み込みに失敗しました（${QUESTIONS.length}/196問）。data/questions.js を確認してください。</div>`;}else{renderHome();}
})();
