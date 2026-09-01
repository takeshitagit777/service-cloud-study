(() => {
  'use strict';

  const QUESTIONS = Array.isArray(window.QUESTIONS) ? window.QUESTIONS : [];
  const STORAGE_KEY = 'serviceCloudConsultant196Ja_v1';
  const PASSING_SCORE = 78;
  const MOCK_CONFIG = {
    10: {size:10, duration:18*60, label:'10問ミニ模試', timeLabel:'18分'},
    60: {size:60, duration:105*60, label:'60問本番模試', timeLabel:'105分'}
  };
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

  function reviewNoteHtml(q){
    if(!q.reviewNote) return '';
    return `<div class="review-warning"><strong>⚠️ 公式仕様との整合性メモ</strong><div>${esc(q.reviewNote)}</div></div>`;
  }

  function choiceExplanationsHtml(q, selected){
    if(!Array.isArray(q.choiceExplanations)) return '';
    const rows=q.choices.map((choice,i)=>{
      const isCorrect=i===q.answer;
      const isSelected=selected===i;
      const status=isCorrect?'正解':'不正解';
      const cls=isCorrect?'correct-option':(isSelected?'selected-wrong-option':'wrong-option');
      const selectedBadge=isSelected?`<span class="your-answer">${isCorrect?'あなたの回答':'あなたの回答'}</span>`:'';
      return `<div class="option-explanation ${cls}">
        <div class="option-explanation-head">
          <span class="option-letter">${String.fromCharCode(65+i)}</span>
          <strong>${esc(choice)}</strong>
          <span class="option-status ${isCorrect?'ok':'ng'}">${status}</span>
          ${selectedBadge}
        </div>
        <div class="option-reason">${esc(q.choiceExplanations[i]||'')}</div>
      </div>`;
    }).join('');
    return `<div class="choice-explanations"><div class="choice-explanations-title">選択肢ごとの解説</div>${rows}</div>${reviewNoteHtml(q)}`;
  }

  function mockQuestionReviewHtml(q, index){
    const selected=mock.answers[q.id];
    const correct=selected===q.answer;
    const answerText=selected===undefined?'未回答':`${String.fromCharCode(65+selected)}. ${esc(q.choices[selected])}`;
    return `<details class="mock-review-item" ${!correct?'open':''}>
      <summary>
        <span class="review-index">Q${index+1}</span>
        <span class="${correct?'good-text':'bad-text'}">${correct?'正解':'不正解'}</span>
        <span class="review-question-short">${esc(q.question)}</span>
      </summary>
      <div class="mock-review-body">
        <div class="q-meta">${sourceTag(q)}<span class="tag">${esc(catLabel(q.category))}</span><span class="tag">${esc(q.concept)}</span></div>
        <div class="q-text review-q-text">${esc(q.question)}</div>
        <div class="answer-summary"><strong>あなたの回答：</strong>${answerText}<br><strong>正解：</strong>${String.fromCharCode(65+q.answer)}. ${esc(q.choices[q.answer])}</div>
        <div class="explain"><strong>全体解説</strong>${esc(q.explanation)}</div>
        ${choiceExplanationsHtml(q,selected)}
      </div>
    </details>`;
  }

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
        <div class="hero-actions"><button class="btn primary" onclick="switchView('practice')">一問一答を始める</button><button class="btn" onclick="switchView('mock')">模擬試験を受ける</button></div>
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
      <div class="notice explanation-policy" style="margin-top:16px"><strong>選択肢別解説を収録</strong><br>回答後に、正解だけでなく全選択肢について「なぜ正しいか／なぜ違うか」を表示します。元PDFの基本解説を基準に、Salesforce機能の用途・制約を補足しています。現行公式仕様との整合性に注意が必要な設問は警告表示します。</div>
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
    const result=answered?`<div class="explain"><strong class="${selected===q.answer?'good-text':'bad-text'}">${selected===q.answer?'正解！':'不正解'}　正解：${String.fromCharCode(65+q.answer)}. ${esc(q.choices[q.answer])}</strong><div class="explain-label">全体解説</div>${esc(q.explanation)}</div>${choiceExplanationsHtml(q,selected)}`:'';
    return `<div class="question-card"><div class="q-head"><div class="q-meta"><span class="q-number">${esc(q.id)}</span>${sourceTag(q)}<span class="tag">${esc(catLabel(q.category))}</span><span class="tag">${esc(q.concept)}</span></div><button class="heart ${fav?'on':''}" onclick="toggleFavorite('${q.id}','${mode}')" aria-label="お気に入り">${fav?'♥':'♡'}</button></div><div class="q-text">${esc(q.question)}</div><div class="choices">${choices}</div>${result}<div class="quiz-footer"><button class="btn" onclick="nextPractice(-1)" ${practice.index===0?'disabled':''}>← 前へ</button><div class="spacer"></div><button class="btn primary" onclick="nextPractice(1)" ${practice.index===practice.list.length-1?'disabled':''}>次へ →</button></div></div>`;
  }

  function requiredCorrect(total){ return Math.ceil(total * PASSING_SCORE / 100); }
  function mockPass(rate){ return rate >= PASSING_SCORE; }

  function renderMockLanding(){
    document.getElementById('mock').innerHTML=`
      <div class="hero">
        <div class="hero-kicker">Mock Exam</div>
        <h1>模擬試験</h1>
        <p>196問からランダム出題。10問の短時間チェックと、60問の本番想定模試を選べます。合格ラインは ${PASSING_SCORE}% です。</p>
      </div>
      <div class="section-title"><h2>模試を選ぶ</h2><span class="muted small">合格ライン ${PASSING_SCORE}%</span></div>
      <div class="grid two mock-mode-grid">
        <div class="card mock-mode-card">
          <div class="muted small">QUICK MOCK</div>
          <div class="mock-mode-number">10問</div>
          <h3>10問ミニ模試</h3>
          <p class="muted">短時間で実力チェック。制限時間18分。本番105分を問題数に比例させた練習用時間です。</p>
          <div class="pass-line">合格目安 <strong>8 / 10問以上</strong>（${PASSING_SCORE}%基準）</div>
          <button class="btn primary" onclick="selectMockSize(10)">10問模試を開始</button>
        </div>
        <div class="card mock-mode-card">
          <div class="muted small">FULL MOCK</div>
          <div class="mock-mode-number">60問</div>
          <h3>60問本番模試</h3>
          <p class="muted">本番想定の60問。制限時間105分。終了時に合否・正答率・分野別結果を表示します。</p>
          <div class="pass-line">合格目安 <strong>47 / 60問以上</strong>（${PASSING_SCORE}%基準）</div>
          <button class="btn primary" onclick="selectMockSize(60)">60問模試を開始</button>
        </div>
      </div>
      <div id="mockSettings"></div>
      <div class="notice" style="margin-top:16px">合格判定は ${PASSING_SCORE}% を基準にしています。10問模試は問題数が少ないため、整数換算で8問以上を合格と判定します。</div>
      ${state.mockHistory.length?mockHistoryHtml():''}`;
  }

  window.selectMockSize=function(size){
    const cfg=MOCK_CONFIG[size]; if(!cfg)return;
    document.getElementById('mockSettings').innerHTML=`<div class="section-title"><h2>${cfg.label} 設定</h2></div><div class="card"><div class="toolbar">${sourceSelect('all')}<button class="btn primary" onclick="startMockFromUi(${size})">${size}問模試を開始</button></div><div class="muted small">※同一内容の問題が2つのPDFに収録されている場合も、別問題として抽選対象になります。</div></div>`;
    document.getElementById('mockSettings').scrollIntoView({behavior:'smooth',block:'start'});
  };

  function mockHistoryHtml(){return `<div class="section-title"><h2>最近の模試</h2></div><div class="card table-wrap"><table class="table"><thead><tr><th>日時</th><th>形式</th><th>出典</th><th>正答</th><th>正答率</th><th>判定</th></tr></thead><tbody>${state.mockHistory.slice(0,8).map(h=>{const passed=(h.pass!==undefined?h.pass:mockPass(h.rate));return `<tr><td>${new Date(h.at).toLocaleString('ja-JP')}</td><td>${h.total}問</td><td>${esc(h.sourceLabel)}</td><td>${h.correct}/${h.total}</td><td>${h.rate}%</td><td><strong class="${passed?'good-text':'bad-text'}">${passed?'合格':'不合格'}</strong></td></tr>`}).join('')}</tbody></table></div>`;}

  window.startMockFromUi=function(size){ startMock(document.getElementById('sourceFilter').value, size); };
  function startMock(source='all', requestedSize=60){
    const cfg=MOCK_CONFIG[requestedSize] || MOCK_CONFIG[60];
    const pool=sourceFilter(source); const size=Math.min(cfg.size,pool.length);
    mock={questions:shuffle(pool).slice(0,size),index:0,answers:{},flagged:{},startedAt:Date.now(),duration:cfg.duration,source,requestedSize:cfg.size,label:cfg.label};
    renderMock();startMockTimer();
  }
  function startMockTimer(){clearMockTimer();updateTimer();mockTimer=setInterval(updateTimer,1000);}
  function clearMockTimer(){if(mockTimer){clearInterval(mockTimer);mockTimer=null;}}
  function updateTimer(){if(!mock)return;const left=Math.max(0,mock.duration-Math.floor((Date.now()-mock.startedAt)/1000));const mm=String(Math.floor(left/60)).padStart(2,'0'),ss=String(left%60).padStart(2,'0');document.getElementById('topTimer').textContent=`残り ${mm}:${ss}`;if(left<=0)finishMock();}
  function renderMock(){
    const root=document.getElementById('mock'),q=mock.questions[mock.index],selected=mock.answers[q.id];
    root.innerHTML=`<div class="mock-layout"><div class="question-card"><div class="q-head"><div class="q-meta"><span class="q-number">${mock.index+1} / ${mock.questions.length}</span><span class="tag">${esc(mock.label)}</span>${sourceTag(q)}<span class="tag">${esc(catLabel(q.category))}</span></div><button class="heart ${mock.flagged[q.id]?'on':''}" onclick="toggleMockFlag('${q.id}')">⚑</button></div><div class="q-text">${esc(q.question)}</div><div class="choices">${q.choices.map((c,i)=>`<button class="choice ${selected===i?'selected':''}" onclick="answerMock(${i})"><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(c)}</span></button>`).join('')}</div><div class="quiz-footer"><button class="btn" onclick="goMock(-1)" ${mock.index===0?'disabled':''}>← 前へ</button><div class="spacer"></div><button class="btn" onclick="goMock(1)" ${mock.index===mock.questions.length-1?'disabled':''}>次へ →</button><button class="btn primary" onclick="confirmFinishMock()">採点する</button></div></div><aside class="card mock-side"><strong>問題一覧</strong><div class="q-grid" style="margin-top:10px">${mock.questions.map((x,i)=>`<button class="${mock.answers[x.id]!==undefined?'answered':''} ${i===mock.index?'current':''} ${mock.flagged[x.id]?'flagged':''}" onclick="jumpMock(${i})">${i+1}</button>`).join('')}</div><div class="mock-summary"><div class="mock-summary-row"><span class="muted">合格ライン</span><strong>${requiredCorrect(mock.questions.length)}/${mock.questions.length}</strong></div><div class="mock-summary-row"><span class="muted">回答済み</span><strong>${Object.keys(mock.answers).length}/${mock.questions.length}</strong></div><div class="mock-summary-row"><span class="muted">見直し</span><strong>${Object.keys(mock.flagged).length}</strong></div></div></aside></div>`;
  }
  window.answerMock=function(i){mock.answers[mock.questions[mock.index].id]=i;renderMock();};
  window.goMock=function(d){const i=mock.index+d;if(i>=0&&i<mock.questions.length){mock.index=i;renderMock();window.scrollTo({top:0,behavior:'smooth'});}};
  window.jumpMock=function(i){mock.index=i;renderMock();window.scrollTo({top:0,behavior:'smooth'});};
  window.toggleMockFlag=function(id){mock.flagged[id]=!mock.flagged[id];if(!mock.flagged[id])delete mock.flagged[id];renderMock();};
  window.confirmFinishMock=function(){const remain=mock.questions.length-Object.keys(mock.answers).length;if(remain&&!confirm(`未回答が${remain}問あります。採点しますか？`))return;finishMock();};
  function finishMock(){
    if(!mock)return; clearMockTimer(); let correct=0;
    mock.questions.forEach(q=>{const choice=mock.answers[q.id];if(choice===q.answer)correct++;if(choice!==undefined){state.answers[q.id]={choice,correct:choice===q.answer,at:Date.now()};}});
    const rate=pct(correct,mock.questions.length), pass=mockPass(rate);
    state.mockHistory.unshift({at:Date.now(),source:mock.source,sourceLabel:mock.source==='all'?'全196問':SOURCE_LABELS[mock.source],correct,total:mock.questions.length,rate,pass,passingScore:PASSING_SCORE});
    state.mockHistory=state.mockHistory.slice(0,20); saveState(); renderMockResult(correct,rate,pass);
  }
  function renderMockResult(correct,rate,pass){
    const qs=mock.questions; const needed=requiredCorrect(qs.length); document.getElementById('topTimer').textContent='';
    const catRows=CATEGORIES.map(c=>{const list=qs.filter(q=>q.category===c.id);if(!list.length)return'';const ok=list.filter(q=>mock.answers[q.id]===q.answer).length;return `<tr><td>${esc(c.label)}</td><td>${ok}/${list.length}</td><td>${pct(ok,list.length)}%</td></tr>`;}).join('');
    const reviewRows=qs.map((q,i)=>mockQuestionReviewHtml(q,i)).join('');
    document.getElementById('mock').innerHTML=`<div class="card result-hero"><div class="result-status ${pass?'pass':'fail'}">${pass?'合格':'不合格'}</div><div class="muted">${qs.length}問 模擬試験結果</div><div class="score ${pass?'good-text':'bad-text'}">${rate}%</div><div><strong>${correct} / ${qs.length} 問正解</strong></div><div class="pass-line result-pass-line">合格ライン ${PASSING_SCORE}% ／ ${needed}問以上正解</div><div style="margin-top:16px"><button class="btn primary" onclick="renderMockLanding()">別の模試を受ける</button></div></div><div class="grid two"><div class="card table-wrap"><h3>分野別</h3><table class="table"><thead><tr><th>分野</th><th>正解</th><th>正答率</th></tr></thead><tbody>${catRows}</tbody></table></div><div class="card"><h3>復習ポイント</h3><p class="muted">不正解だった問題は「間違い復習」に自動追加されます。下の「問題別解説」では、正解だけでなく全選択肢について、なぜ正しい／なぜ違うのかを確認できます。</p><button class="btn" onclick="switchView('review')">間違いを復習する</button></div></div><div class="section-title"><h2>問題別解説</h2><span class="muted small">各問題を開くと全選択肢の理由を確認できます</span></div><div class="mock-review-list">${reviewRows}</div><div class="notice explanation-policy"><strong>解説について</strong><br>元PDFに収録された正答・基本解説を学習データの基準とし、各不正解選択肢の理由はSalesforce各機能の用途・制約を踏まえて補足しています。現行の公式仕様と整合性に注意が必要な問題には警告を表示します。</div>`; mock=null;
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
