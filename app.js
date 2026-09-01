(() => {
  'use strict';

  const QUESTIONS = (Array.isArray(window.QUESTIONS) ? window.QUESTIONS : []).map(q => {
    const answers = Array.isArray(q.answers) && q.answers.length ? [...q.answers] : [q.answer];
    return {...q, answers:[...new Set(answers)].sort((a,b)=>a-b), answer:answers[0], multiple:answers.length>1, selectCount:answers.length};
  });
  const GLOSSARY = Array.isArray(window.GLOSSARY) ? window.GLOSSARY : [];
  const STORAGE_KEY = 'serviceCloudConsultant342Ja_v1';
  const OLD_STORAGE_KEY = 'serviceCloudConsultant196Ja_v1';
  const PASSING_SCORE = 78;
  const MOCK_CONFIG = {
    10: {size:10, duration:18*60, label:'10問ミニ模試', timeLabel:'18分'},
    60: {size:60, duration:105*60, label:'60問本番模試', timeLabel:'105分'}
  };
  const CATEGORIES = [
    {id:'industry', label:'業界知識'}, {id:'implementation', label:'実装戦略'},
    {id:'solution', label:'Service Cloudソリューション設計'}, {id:'knowledge', label:'Knowledge管理'},
    {id:'channels', label:'受付・インタラクションチャネル'}, {id:'case', label:'ケース管理'},
    {id:'analytics', label:'コンタクトセンター分析'}, {id:'integrations', label:'システム連携・データ管理'}
  ];
  const SOURCES = [
    {id:'2026-01-08', label:'2026-01-08版（80問）', short:'2026-01-08版', count:80, cls:'jan'},
    {id:'2026-04-28', label:'2026-04-28版（116問）', short:'2026-04-28版', count:116, cls:'apr'},
    {id:'2024-05-23', label:'2024-05-23版（117問）', short:'2024-05-23版', count:117, cls:'may'},
    {id:'extra-29', label:'追加問題集（29問）', short:'追加問題集', count:29, cls:'extra'}
  ];

  const defaultState = () => ({answers:{}, favorites:{}, mockHistory:[]});
  let state = loadState();
  let practice = {list:[], index:0, filter:'all', source:'all', answered:false, selected:[]};
  let mock = null;
  let mockTimer = null;

  function loadState(){
    try{
      let raw = localStorage.getItem(STORAGE_KEY);
      if(!raw){
        const old = localStorage.getItem(OLD_STORAGE_KEY);
        if(old){
          const migrated = {...defaultState(), ...JSON.parse(old)};
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          raw = JSON.stringify(migrated);
        }
      }
      return raw ? {...defaultState(), ...JSON.parse(raw)} : defaultState();
    }catch(_){ return defaultState(); }
  }
  function saveState(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(_){} }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function pct(a,b){ return b ? Math.round(a/b*100) : 0; }
  function catLabel(id){ return CATEGORIES.find(c=>c.id===id)?.label || id; }
  function sourceMeta(id){ return SOURCES.find(s=>s.id===id) || {id,label:id,short:id,count:0,cls:'extra'}; }
  function sourceClass(q){ return sourceMeta(q.source).cls; }
  function sourceTag(q){ return `<span class="source-tag ${sourceClass(q)}">${esc(q.sourceLabel)} Q${q.sourceQuestion}</span>`; }
  function sourceFilter(source){ return source==='all' ? QUESTIONS : QUESTIONS.filter(q=>q.source===source); }
  function normalizeSelection(v){
    if(v === undefined || v === null) return [];
    if(Array.isArray(v)) return [...new Set(v.map(Number))].sort((a,b)=>a-b);
    return [Number(v)];
  }
  function storedSelection(a){ return a ? normalizeSelection(a.choices ?? a.choice) : []; }
  function sameSelection(a,b){ const x=normalizeSelection(a), y=normalizeSelection(b); return x.length===y.length && x.every((v,i)=>v===y[i]); }
  function letters(arr){ return normalizeSelection(arr).map(i=>String.fromCharCode(65+i)).join('・'); }
  function answerText(q, selection){ const s=normalizeSelection(selection); return s.length ? s.map(i=>`${String.fromCharCode(65+i)}. ${esc(q.choices[i])}`).join('<br>') : '未回答'; }
  function isCompletedSelection(q, selection){ return normalizeSelection(selection).length===q.selectCount; }
  function statsFor(list=QUESTIONS){
    let attempted=0, correct=0;
    list.forEach(q=>{ const a=state.answers[q.id]; if(a){attempted++; if(a.correct) correct++;} });
    return {attempted, correct, total:list.length, rate:pct(correct,attempted)};
  }
  function wrongQuestions(){ return QUESTIONS.filter(q=>state.answers[q.id] && !state.answers[q.id].correct); }
  function passNeeded(size){ return Math.ceil(size*PASSING_SCORE/100); }

  function reviewNoteHtml(q){
    if(!q.reviewNote) return '';
    return `<div class="review-warning"><strong>⚠️ 現行仕様・出題年代のメモ</strong><div>${esc(q.reviewNote)}</div></div>`;
  }
  function choiceExplanationsHtml(q, selected){
    if(!Array.isArray(q.choiceExplanations)) return '';
    const sel=normalizeSelection(selected);
    const rows=q.choices.map((choice,i)=>{
      const isCorrect=q.answers.includes(i), isSelected=sel.includes(i);
      const cls=isCorrect?'correct-option':(isSelected?'selected-wrong-option':'wrong-option');
      return `<div class="option-explanation ${cls}">
        <div class="option-explanation-head"><span class="option-letter">${String.fromCharCode(65+i)}</span><strong>${esc(choice)}</strong>
        <span class="option-status ${isCorrect?'ok':'ng'}">${isCorrect?'正解':'不正解'}</span>${isSelected?'<span class="your-answer">あなたの回答</span>':''}</div>
        <div class="option-reason">${esc(q.choiceExplanations[i]||'')}</div></div>`;
    }).join('');
    return `<div class="choice-explanations"><div class="choice-explanations-title">選択肢ごとの解説</div>${rows}</div>${reviewNoteHtml(q)}`;
  }

  function showView(id, render=true){
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
    document.querySelectorAll('.nav-item').forEach(v=>v.classList.toggle('active',v.dataset.nav===id));
    if(id!=='mock') clearMockTimer();
    if(id!=='mock') document.getElementById('topTimer').textContent='';
    if(render){
      if(id==='home') renderHome();
      if(id==='practice') startPractice(practice.filter || 'all', practice.source || 'all');
      if(id==='mock') renderMockLanding();
      if(id==='review') renderReview();
      if(id==='analysis') renderAnalysis();
      if(id==='bank') renderBank();
      if(id==='glossary') renderGlossary();
    }
    window.scrollTo({top:0,behavior:'smooth'});
  }
  window.switchView = id => showView(id,true);
  document.addEventListener('click', e => { const nav=e.target.closest('[data-nav]'); if(nav) showView(nav.dataset.nav,true); });

  function renderHome(){
    const s=statsFor(), wrong=wrongQuestions().length;
    document.getElementById('home').innerHTML=`
      <div class="hero"><div class="hero-kicker">Salesforce Service Cloud Consultant</div>
        <h1>過去問 342問を日本語で学習</h1>
        <p>4つの問題集を統合し、重複問題も出典別にそのまま収録。単一選択・複数選択に対応し、回答後は全選択肢の「なぜ正しい／なぜ違う」を確認できます。重要用語は単語集から関連問題へ直接ジャンプできます。</p>
        <div class="hero-actions"><button class="btn primary" onclick="startPractice('all','all');showViewNoRender('practice')">一問一答を始める</button><button class="btn" onclick="switchView('mock')">模擬試験</button><button class="btn" onclick="switchView('glossary')">単語集を見る</button></div>
      </div>
      <div class="grid"><div class="card"><div class="muted small">回答済み</div><div class="stat">${s.attempted}<span class="muted" style="font-size:15px"> / ${QUESTIONS.length}</span></div><div class="progress"><div style="width:${pct(s.attempted,QUESTIONS.length)}%"></div></div></div>
      <div class="card"><div class="muted small">累計正答率</div><div class="stat">${s.rate}%</div><div class="muted small">回答済み問題ベース</div></div>
      <div class="card"><div class="muted small">要復習</div><div class="stat">${wrong}</div><div class="muted small">最後の回答が不正解</div></div></div>
      <div class="section-title"><h2>収録元</h2><p class="muted small">${QUESTIONS.length}問・重複保持</p></div>
      <div class="source-grid">${SOURCES.map(src=>{const list=QUESTIONS.filter(q=>q.source===src.id), x=statsFor(list);return `<div class="card source-card"><div class="source-number">${list.length}</div><div><strong>${esc(src.short)}</strong><div class="muted small">${x.attempted}/${list.length}問回答・正答率 ${x.rate}%</div></div></div>`}).join('')}</div>
      <div class="section-title"><h2>分野別進捗</h2></div><div class="card">${CATEGORIES.map(c=>{const list=QUESTIONS.filter(q=>q.category===c.id),x=statsFor(list);return `<div class="category-row"><div><strong>${esc(c.label)}</strong><div class="muted small">${x.attempted}/${list.length}問回答</div></div><div><div class="progress"><div style="width:${x.rate}%"></div></div></div><strong style="text-align:right">${x.rate}%</strong></div>`}).join('')}</div>
      <div class="section-title"><h2>学習ツール</h2></div><div class="grid two"><div class="card"><h3>📖 Service Cloud 単語集</h3><p class="muted">${GLOSSARY.length}語をカテゴリ別・検索付きで収録。意味、試験での見分け方、関連問題まで確認できます。</p><button class="btn" onclick="switchView('glossary')">単語集を開く</button></div><div class="card"><h3>📝 模擬試験</h3><p class="muted">10問ミニ模試と60問本番模試。合格ラインは${PASSING_SCORE}%で、複数選択問題にも対応しています。</p><button class="btn" onclick="switchView('mock')">模擬試験を開く</button></div></div>
      <div class="section-title"><h2>データ管理</h2></div><div class="card"><button class="btn danger" onclick="resetProgress()">学習履歴をリセット</button><div class="muted small" style="margin-top:9px">学習履歴はこのブラウザのlocalStorageだけに保存されます。</div></div>
      <div class="footer-note">Service Cloud Consultant 自習用・日本語学習サイト</div>`;
  }
  window.showViewNoRender=id=>showView(id,false);

  function sourceSelect(value='all', id='sourceFilter'){
    return `<select id="${id}" aria-label="出典"><option value="all" ${value==='all'?'selected':''}>全${QUESTIONS.length}問</option>${SOURCES.map(s=>`<option value="${s.id}" ${value===s.id?'selected':''}>${esc(s.label)}</option>`).join('')}</select>`;
  }
  function practiceFilterSelect(value='all'){
    return `<select id="practiceFilter"><option value="all" ${value==='all'?'selected':''}>すべて</option><option value="unanswered" ${value==='unanswered'?'selected':''}>未回答</option><option value="wrong" ${value==='wrong'?'selected':''}>間違いのみ</option><option value="fav" ${value==='fav'?'selected':''}>お気に入り</option>${CATEGORIES.map(c=>`<option value="${c.id}" ${value===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select>`;
  }
  function buildPracticeList(filter='all',source='all'){
    let list=sourceFilter(source);
    if(filter==='wrong') list=list.filter(q=>state.answers[q.id]&&!state.answers[q.id].correct);
    else if(filter==='fav') list=list.filter(q=>state.favorites[q.id]);
    else if(filter==='unanswered') list=list.filter(q=>!state.answers[q.id]);
    else if(filter!=='all') list=list.filter(q=>q.category===filter);
    return shuffle(list);
  }
  window.startPractice=function(filter='all',source='all'){
    practice={list:buildPracticeList(filter,source),index:0,filter,source,answered:false,selected:[]}; renderPractice();
  };
  function renderPractice(){
    const root=document.getElementById('practice');
    if(!practice.list.length){root.innerHTML=`<div class="toolbar">${practiceFilterSelect(practice.filter)}${sourceSelect(practice.source)}</div><div class="card empty">対象の問題がありません。</div>`; bindPracticeFilters(); return;}
    const q=practice.list[practice.index];
    const selected=practice.answered ? storedSelection(state.answers[q.id]) : practice.selected;
    root.innerHTML=`<div class="toolbar">${practiceFilterSelect(practice.filter)}${sourceSelect(practice.source)}<button class="btn" onclick="startPractice('${practice.filter}','${practice.source}')">🔀 並び替え</button><div class="spacer"></div><span class="muted">${practice.index+1} / ${practice.list.length}</span></div>
      ${questionCardHtml(q,selected,practice.answered,'practice')}`;
    bindPracticeFilters();
  }
  function bindPracticeFilters(){
    const f=document.getElementById('practiceFilter'), s=document.getElementById('sourceFilter');
    if(f) f.onchange=()=>startPractice(f.value,s?.value||'all');
    if(s) s.onchange=()=>startPractice(f?.value||'all',s.value);
  }
  function questionCardHtml(q,selected,answered,mode){
    const sel=normalizeSelection(selected);
    const choices=q.choices.map((c,i)=>{
      let cls=sel.includes(i)?'selected':'';
      if(answered){ if(q.answers.includes(i)) cls='correct'; else if(sel.includes(i)) cls='wrong'; }
      const handler=mode==='practice'?`pickPractice(${i})`:`pickMock(${i})`;
      return `<button class="choice ${cls}" onclick="${handler}" ${answered?'disabled':''}><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(c)}</span></button>`;
    }).join('');
    const multiNote=q.multiple?`<div class="multi-hint">☑️ <strong>${q.selectCount}つ選択</strong>してください。${answered?'':'選択後に「回答を確定」を押します。'}</div>`:'';
    let after='';
    if(answered){
      const correct=sameSelection(sel,q.answers);
      after=`<div class="notice ${correct?'success-note':''}" style="margin-top:15px"><strong>${correct?'✅ 正解':'❌ 不正解'}</strong>　正解：${letters(q.answers)}</div><div class="explain"><strong>全体解説</strong>${esc(q.explanation)}</div>${choiceExplanationsHtml(q,sel)}`;
    }
    const footer=mode==='practice'?`<div class="quiz-footer">${q.multiple&&!answered?`<button class="btn primary" onclick="submitPracticeAnswer()" ${sel.length!==q.selectCount?'disabled':''}>回答を確定（${sel.length}/${q.selectCount}）</button>`:''}${answered?`<button class="btn primary" onclick="nextPractice()">${practice.index+1<practice.list.length?'次の問題 →':'最初から'}</button>`:''}<button class="btn ghost" onclick="toggleFavorite('${q.id}')">${state.favorites[q.id]?'★ お気に入り':'☆ お気に入り'}</button></div>`:'';
    return `<div class="question-card"><div class="q-head"><div class="q-meta"><span class="q-number">${esc(q.id)}</span>${sourceTag(q)}<span class="tag">${esc(catLabel(q.category))}</span><span class="tag">${esc(q.concept)}</span>${q.multiple?`<span class="tag multi-tag">複数選択 ${q.selectCount}つ</span>`:''}</div>${mode==='practice'?`<button class="heart ${state.favorites[q.id]?'on':''}" onclick="toggleFavorite('${q.id}')">${state.favorites[q.id]?'♥':'♡'}</button>`:''}</div>${multiNote}<div class="q-text">${esc(q.question)}</div><div class="choices">${choices}</div>${after}${footer}</div>`;
  }
  window.pickPractice=function(i){
    if(practice.answered) return; const q=practice.list[practice.index];
    if(q.multiple){ const s=new Set(practice.selected); if(s.has(i))s.delete(i); else if(s.size<q.selectCount)s.add(i); practice.selected=[...s].sort((a,b)=>a-b); renderPractice(); }
    else { practice.selected=[i]; submitPracticeAnswer(); }
  };
  window.submitPracticeAnswer=function(){
    const q=practice.list[practice.index], sel=normalizeSelection(practice.selected); if(!isCompletedSelection(q,sel))return;
    const correct=sameSelection(sel,q.answers); state.answers[q.id]={choices:sel,correct,at:Date.now()}; saveState(); practice.answered=true; renderPractice();
  };
  window.nextPractice=function(){ if(practice.index+1>=practice.list.length) practice.index=0; else practice.index++; practice.answered=false; practice.selected=[]; renderPractice(); window.scrollTo({top:0,behavior:'smooth'}); };
  window.toggleFavorite=function(id){ if(state.favorites[id]) delete state.favorites[id]; else state.favorites[id]=true; saveState(); renderPractice(); };

  function renderMockLanding(){
    clearMockTimer(); const root=document.getElementById('mock');
    root.innerHTML=`<div class="section-title"><h2>模擬試験</h2><p class="muted small">合格ライン ${PASSING_SCORE}%</p></div>
      <div class="grid two mock-mode-grid">${Object.values(MOCK_CONFIG).map(c=>`<div class="card mock-mode-card"><div class="mock-mode-number">${c.size}</div><h3>${c.label}</h3><p class="muted">制限時間 ${c.timeLabel}。${c.size}問中 <strong>${passNeeded(c.size)}問以上</strong>で合格判定。</p><button class="btn primary" onclick="startMock(${c.size})">開始する</button></div>`).join('')}</div>
      <div class="section-title"><h2>出題範囲</h2></div><div class="card"><div class="toolbar">${sourceSelect('all','mockSource')}</div><p class="muted small">「全342問」または特定の問題集だけからランダム出題できます。複数選択は指定数すべて一致した場合のみ正解です。</p></div>
      ${mockHistoryHtml()}`;
  }
  function mockHistoryHtml(){
    if(!state.mockHistory.length)return '';
    return `<div class="section-title"><h2>最近の模試</h2></div><div class="card table-wrap"><table class="table"><thead><tr><th>日時</th><th>モード</th><th>出典</th><th>得点</th><th>判定</th></tr></thead><tbody>${state.mockHistory.slice(0,10).map(h=>`<tr><td>${new Date(h.at).toLocaleString('ja-JP')}</td><td>${h.size}問</td><td>${esc(h.sourceLabel||'全問題')}</td><td>${h.correct}/${h.size}（${h.rate}%）</td><td class="${h.passed?'good-text':'bad-text'}">${h.passed?'合格':'不合格'}</td></tr>`).join('')}</tbody></table></div>`;
  }
  window.startMock=function(size){
    const cfg=MOCK_CONFIG[size]; if(!cfg)return; const source=document.getElementById('mockSource')?.value||'all'; const pool=sourceFilter(source); if(pool.length<cfg.size){alert('選択した出典の問題数が不足しています。');return;}
    mock={size:cfg.size,duration:cfg.duration,source,list:shuffle(pool).slice(0,cfg.size),index:0,answers:{},flagged:{},remaining:cfg.duration,finished:false,result:null}; renderMockQuestion(); startMockTimer();
  };
  function startMockTimer(){ clearMockTimer(); updateTopTimer(); mockTimer=setInterval(()=>{if(!mock||mock.finished)return; mock.remaining--; updateTopTimer(); if(mock.remaining<=0)finishMock();},1000); }
  function clearMockTimer(){ if(mockTimer){clearInterval(mockTimer);mockTimer=null;} }
  function updateTopTimer(){ if(!mock||mock.finished)return; const m=Math.floor(mock.remaining/60),s=mock.remaining%60; document.getElementById('topTimer').textContent=`残り ${m}:${String(s).padStart(2,'0')}`; }
  function renderMockQuestion(){
    if(!mock)return; const q=mock.list[mock.index], selected=mock.answers[q.id]||[]; const answeredCount=mock.list.filter(x=>isCompletedSelection(x,mock.answers[x.id]||[])).length;
    document.getElementById('mock').innerHTML=`<div class="mock-layout"><div>${questionCardHtml(q,selected,false,'mock')}<div class="quiz-footer"><button class="btn" onclick="mockPrev()" ${mock.index===0?'disabled':''}>← 前へ</button><button class="btn primary" onclick="mockNext()">${mock.index+1===mock.list.length?'採点へ':'次へ →'}</button><button class="btn ghost" onclick="toggleMockFlag()">${mock.flagged[q.id]?'🚩 フラグ解除':'⚑ 後で見直す'}</button></div></div>
      <aside class="card mock-side"><div class="pass-line"><strong>合格ライン ${PASSING_SCORE}%</strong><br>${mock.size}問中 ${passNeeded(mock.size)}問以上</div><div class="mock-summary"><div class="mock-summary-row"><span>回答完了</span><strong>${answeredCount}/${mock.size}</strong></div><div class="mock-summary-row"><span>複数選択</span><strong>${mock.list.filter(x=>x.multiple).length}問</strong></div></div><div class="q-grid" style="margin-top:14px">${mock.list.map((x,i)=>`<button class="${isCompletedSelection(x,mock.answers[x.id]||[])?'answered':''} ${i===mock.index?'current':''} ${mock.flagged[x.id]?'flagged':''}" onclick="jumpMock(${i})">${i+1}</button>`).join('')}</div><button class="btn danger" style="width:100%;margin-top:14px" onclick="confirmFinishMock()">採点する</button></aside></div>`; updateTopTimer();
  }
  window.pickMock=function(i){ if(!mock||mock.finished)return; const q=mock.list[mock.index], cur=normalizeSelection(mock.answers[q.id]); if(q.multiple){const s=new Set(cur);if(s.has(i))s.delete(i);else if(s.size<q.selectCount)s.add(i);mock.answers[q.id]=[...s].sort((a,b)=>a-b);}else mock.answers[q.id]=[i]; renderMockQuestion(); };
  window.mockPrev=()=>{if(mock&&mock.index>0){mock.index--;renderMockQuestion();}};
  window.mockNext=()=>{if(!mock)return;if(mock.index+1<mock.list.length){mock.index++;renderMockQuestion();}else confirmFinishMock();};
  window.jumpMock=i=>{if(mock){mock.index=i;renderMockQuestion();}};
  window.toggleMockFlag=()=>{if(!mock)return;const id=mock.list[mock.index].id;mock.flagged[id]=!mock.flagged[id];renderMockQuestion();};
  window.confirmFinishMock=function(){ if(!mock)return; const unanswered=mock.list.filter(q=>!isCompletedSelection(q,mock.answers[q.id]||[])).length; if(unanswered&&!confirm(`未回答または選択数不足が ${unanswered}問あります。採点しますか？`))return; finishMock(); };
  function finishMock(){
    if(!mock||mock.finished)return; clearMockTimer(); document.getElementById('topTimer').textContent=''; let correct=0;
    mock.list.forEach(q=>{if(sameSelection(mock.answers[q.id]||[],q.answers))correct++;}); const rate=pct(correct,mock.size),passed=rate>=PASSING_SCORE; mock.finished=true; mock.result={correct,rate,passed};
    state.mockHistory.unshift({at:Date.now(),size:mock.size,correct,rate,passed,source:mock.source,sourceLabel:mock.source==='all'?`全${QUESTIONS.length}問`:sourceMeta(mock.source).label}); state.mockHistory=state.mockHistory.slice(0,30); saveState(); renderMockResult();
  }
  function renderMockResult(){
    const {correct,rate,passed}=mock.result; const byCat=CATEGORIES.map(c=>{const l=mock.list.filter(q=>q.category===c.id);return {label:c.label,total:l.length,correct:l.filter(q=>sameSelection(mock.answers[q.id]||[],q.answers)).length};}).filter(x=>x.total);
    document.getElementById('mock').innerHTML=`<div class="card result-hero"><div class="result-status ${passed?'pass':'fail'}">${passed?'✅ 合格':'❌ 不合格'}</div><div class="score">${rate}%</div><div>${correct} / ${mock.size}問正解</div><div class="result-pass-line muted">合格基準：${PASSING_SCORE}%（${passNeeded(mock.size)}問以上）</div><div style="margin-top:18px"><button class="btn primary" onclick="renderMockLanding()">別の模試を受ける</button></div></div>
      <div class="section-title"><h2>分野別結果</h2></div><div class="card">${byCat.map(x=>`<div class="category-row"><div><strong>${esc(x.label)}</strong><div class="muted small">${x.correct}/${x.total}問正解</div></div><div><div class="progress"><div style="width:${pct(x.correct,x.total)}%"></div></div></div><strong>${pct(x.correct,x.total)}%</strong></div>`).join('')}</div>
      <div class="section-title"><h2>問題別解説</h2><p class="muted small">不正解は自動で展開</p></div><div class="mock-review-list">${mock.list.map((q,i)=>mockQuestionReviewHtml(q,i)).join('')}</div>`;
  }
  window.renderMockLanding=renderMockLanding;
  function mockQuestionReviewHtml(q,index){
    const selected=mock.answers[q.id]||[], correct=sameSelection(selected,q.answers);
    return `<details class="mock-review-item" ${!correct?'open':''}><summary><span class="review-index">Q${index+1}</span><span class="${correct?'good-text':'bad-text'}">${correct?'正解':'不正解'}</span><span class="review-question-short">${esc(q.question)}</span></summary><div class="mock-review-body"><div class="q-meta">${sourceTag(q)}<span class="tag">${esc(catLabel(q.category))}</span>${q.multiple?`<span class="tag multi-tag">${q.selectCount}つ選択</span>`:''}</div><div class="q-text review-q-text">${esc(q.question)}</div><div class="answer-summary"><strong>あなたの回答：</strong><br>${answerText(q,selected)}<br><br><strong>正解：</strong><br>${answerText(q,q.answers)}</div><div class="explain"><strong>全体解説</strong>${esc(q.explanation)}</div>${choiceExplanationsHtml(q,selected)}</div></details>`;
  }

  function renderReview(){
    const list=wrongQuestions(); const root=document.getElementById('review');
    if(!list.length){root.innerHTML='<div class="card empty">現在、復習対象の問題はありません。</div>';return;}
    root.innerHTML=`<div class="section-title"><h2>間違い復習</h2><p class="muted small">${list.length}問</p></div><div class="bank-list">${list.map(q=>`<div class="bank-item" onclick="practiceSpecific('${q.id}')"><div class="bank-top">${sourceTag(q)}<span class="tag">${esc(catLabel(q.category))}</span>${q.multiple?`<span class="tag multi-tag">${q.selectCount}つ選択</span>`:''}</div><div class="bank-q">${esc(q.question)}</div><div class="bank-answer">正解：${letters(q.answers)}　あなた：${letters(storedSelection(state.answers[q.id]))||'未回答'}</div></div>`).join('')}</div>`;
  }
  window.practiceSpecific=function(id){const q=QUESTIONS.find(x=>x.id===id);if(!q)return;practice={list:[q],index:0,filter:'all',source:q.source,answered:false,selected:[]};showView('practice',false);renderPractice();};

  function renderAnalysis(){
    const root=document.getElementById('analysis'), overall=statsFor();
    root.innerHTML=`<div class="section-title"><h2>学習分析</h2></div><div class="grid"><div class="card"><div class="muted small">全体正答率</div><div class="stat">${overall.rate}%</div></div><div class="card"><div class="muted small">回答済み</div><div class="stat">${overall.attempted}</div></div><div class="card"><div class="muted small">未回答</div><div class="stat">${overall.total-overall.attempted}</div></div></div>
      <div class="section-title"><h2>出典別</h2></div><div class="card">${SOURCES.map(s=>{const l=QUESTIONS.filter(q=>q.source===s.id),x=statsFor(l);return `<div class="category-row"><div><strong>${esc(s.short)}</strong><div class="muted small">${x.attempted}/${l.length}問回答</div></div><div><div class="progress"><div style="width:${x.rate}%"></div></div></div><strong>${x.rate}%</strong></div>`}).join('')}</div>
      <div class="section-title"><h2>分野別</h2></div><div class="card">${CATEGORIES.map(c=>{const l=QUESTIONS.filter(q=>q.category===c.id),x=statsFor(l);return `<div class="category-row"><div><strong>${esc(c.label)}</strong><div class="muted small">${x.attempted}/${l.length}問回答</div></div><div><div class="progress"><div style="width:${x.rate}%"></div></div></div><strong>${x.rate}%</strong></div>`}).join('')}</div>`;
  }

  function renderBank(){
    const root=document.getElementById('bank'); root.innerHTML=`<div class="section-title"><h2>問題バンク</h2><p class="muted small">${QUESTIONS.length}問</p></div><div class="toolbar"><input id="bankSearch" placeholder="問題文・用語を検索"><select id="bankCat"><option value="all">全分野</option>${CATEGORIES.map(c=>`<option value="${c.id}">${esc(c.label)}</option>`).join('')}</select>${sourceSelect('all','bankSource')}</div><div id="bankResults"></div>`;
    ['bankSearch','bankCat','bankSource'].forEach(id=>document.getElementById(id).oninput=renderBankResults); renderBankResults();
  }
  function renderBankResults(){
    const q=(document.getElementById('bankSearch')?.value||'').trim().toLowerCase(),cat=document.getElementById('bankCat')?.value||'all',src=document.getElementById('bankSource')?.value||'all';
    const list=QUESTIONS.filter(x=>(cat==='all'||x.category===cat)&&(src==='all'||x.source===src)&&(!q||`${x.question} ${x.concept} ${x.choices.join(' ')} ${x.explanation}`.toLowerCase().includes(q)));
    document.getElementById('bankResults').innerHTML=`<div class="muted small" style="margin:0 0 10px">${list.length}件</div><div class="bank-list">${list.map(x=>`<div class="bank-item" onclick="practiceSpecific('${x.id}')"><div class="bank-top">${sourceTag(x)}<span class="tag">${esc(catLabel(x.category))}</span><span class="tag">${esc(x.concept)}</span>${x.multiple?`<span class="tag multi-tag">${x.selectCount}つ選択</span>`:''}</div><div class="bank-q">${esc(x.question)}</div><div class="bank-answer">正解：${letters(x.answers)}</div></div>`).join('')}</div>`;
  }

  function glossaryRelated(term){
    const needles=[term.jp,term.en,...(term.aliases||[])].filter(Boolean).map(x=>x.toLowerCase());
    return QUESTIONS.filter(q=>{const hay=`${q.question} ${q.concept} ${q.choices.join(' ')} ${q.explanation}`.toLowerCase();return needles.some(n=>n.length>=3&&hay.includes(n));});
  }
  function renderGlossary(){
    const cats=[...new Set(GLOSSARY.map(g=>g.category))];
    document.getElementById('glossary').innerHTML=`<div class="glossary-hero card"><div><div class="hero-kicker">SERVICE CLOUD WORD BOOK</div><h2>📖 Service Cloud 単語集</h2><p class="muted">重要用語を「意味」だけでなく、<strong>試験でどう見分けるか</strong>まで整理。各用語から関連問題だけを出題できます。</p></div><div class="glossary-count"><strong>${GLOSSARY.length}</strong><span>用語</span></div></div><div class="toolbar glossary-toolbar"><input id="glossarySearch" placeholder="例：オムニチャネル / SLA / Knowledge"><select id="glossaryCat"><option value="all">すべてのカテゴリ</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div id="glossaryResults"></div>`;
    document.getElementById('glossarySearch').oninput=renderGlossaryResults;document.getElementById('glossaryCat').onchange=renderGlossaryResults;renderGlossaryResults();
  }
  function renderGlossaryResults(){
    const search=(document.getElementById('glossarySearch')?.value||'').trim().toLowerCase(),cat=document.getElementById('glossaryCat')?.value||'all';
    const list=GLOSSARY.filter(g=>(cat==='all'||g.category===cat)&&(!search||`${g.jp} ${g.en} ${g.summary} ${g.examTip} ${(g.aliases||[]).join(' ')}`.toLowerCase().includes(search)));
    document.getElementById('glossaryResults').innerHTML=`<div class="glossary-result-head"><span>${list.length}語</span><span class="muted small">カードを検索・カテゴリ絞り込みできます</span></div><div class="glossary-grid">${list.map(g=>{const rel=glossaryRelated(g);return `<article class="glossary-card"><div class="glossary-card-top"><span class="glossary-category">${esc(g.category)}</span><span class="related-count">関連 ${rel.length}問</span></div><h3>${esc(g.jp)}</h3><div class="glossary-en">${esc(g.en)}</div><p>${esc(g.summary)}</p><div class="exam-tip"><strong>🎯 試験ポイント</strong>${esc(g.examTip)}</div>${rel.length?`<button class="btn glossary-practice" onclick="startGlossaryPractice('${g.id}')">関連問題を解く (${rel.length})</button>`:''}</article>`}).join('')}</div>`;
  }
  window.startGlossaryPractice=function(id){const g=GLOSSARY.find(x=>x.id===id);if(!g)return;const list=shuffle(glossaryRelated(g));practice={list,index:0,filter:'all',source:'all',answered:false,selected:[]};showView('practice',false);renderPractice();};

  window.resetProgress=function(){if(!confirm('学習履歴・お気に入り・模試履歴をリセットしますか？'))return;state=defaultState();saveState();renderHome();};

  if(QUESTIONS.length!==342) console.warn(`Expected 342 questions, got ${QUESTIONS.length}`);
  renderHome();
})();
