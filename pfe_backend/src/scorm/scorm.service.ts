import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import JSZip from 'jszip';
import { Scenario } from 'src/scenario/scenario.entity';
import { StatutScenario } from 'src/common/enums';

@Injectable()
export class ScormService {
  constructor(
    @InjectRepository(Scenario)
    private readonly scenarioRepo: Repository<Scenario>,
  ) {}

  // ─── Public entry point ──────────────────────────────────────────────────

  async generateScormPackage(scenarioId: number): Promise<Buffer> {
    const scenario = await this.scenarioRepo.findOne({
      where: { id: scenarioId },
      relations: [
        'user',
        'modules',
        'modules.sequences',
        'modules.sequences.activites',
        'modules.sequences.activites.quiz',
        'modules.sequences.activites.quiz.questions',
        'modules.sequences.activites.quiz.questions.reponses',
        'ressources',
      ],
    });

    if (!scenario)
      throw new NotFoundException(`Scénario #${scenarioId} introuvable`);

    const allowed = [StatutScenario.FINALISE, StatutScenario.EXPORTE];
    if (!allowed.includes(scenario.statut)) {
      throw new BadRequestException(
        `Seul un scénario finalisé ou exporté peut être packagé en SCORM. Statut actuel : "${scenario.statut}"`,
      );
    }

    // Sort by ordre
    scenario.modules?.sort((a, b) => a.ordre - b.ordre);
    scenario.modules?.forEach((mod) => {
      mod.sequences?.sort((a, b) => a.id - b.id);
      mod.sequences?.forEach((seq) => {
        seq.activites?.sort((a, b) => a.ordre - b.ordre);
      });
    });

    const zip = new JSZip();
    zip.file('imsmanifest.xml', this.buildManifest(scenario));
    zip.file('scorm_api.js', this.buildScormApi());
    zip.file('content/style.css', this.buildStylesheet());
    zip.file('index.html', this.buildIndexHtml(scenario));

    return zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  }

  // ─── Manifest ────────────────────────────────────────────────────────────

  private buildManifest(scenario: Scenario): string {
    const uid = `SCO_${scenario.id}_${Date.now()}`;

    const buildItems = (modules: Scenario['modules']): string =>
      (modules ?? [])
        .map(
          (mod, mi) => `
      <item identifier="ITEM_M${mi}" identifierref="RESOURCE_SCO">
        <title>${this.escXml(mod.titre)}</title>
        ${(mod.sequences ?? [])
          .map(
            (seq, si) => `
        <item identifier="ITEM_M${mi}_S${si}" parameters="mi=${mi}&amp;si=${si}">
          <title>${this.escXml(seq.titre)}</title>
        </item>`,
          )
          .join('')}
      </item>`,
        )
        .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${uid}" version="1.1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
    http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG_001">
    <organization identifier="ORG_001" structure="hierarchical">
      <title>${this.escXml(scenario.titre)}</title>
      ${buildItems(scenario.modules)}
    </organization>
  </organizations>
  <resources>
    <resource identifier="RESOURCE_SCO" type="webcontent"
              adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm_api.js"/>
      <file href="content/style.css"/>
    </resource>
  </resources>
</manifest>`;
  }

  // ─── SCORM 1.2 API shim ──────────────────────────────────────────────────

  private buildScormApi(): string {
    return `/* SCORM 1.2 API – EduScenario */
var API = (function () {
  var data = {
    'cmi.core.lesson_status': 'not attempted',
    'cmi.core.score.raw': '',
    'cmi.core.session_time': '0000:00:00',
    'cmi.suspend_data': ''
  };
  var startTime = Date.now();
  function pad(n, l) { return String(n).padStart(l, '0'); }
  function fmtTime(ms) {
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60), sec = s % 60;
    return pad(h, 4) + ':' + pad(m, 2) + ':' + pad(sec, 2);
  }
  return {
    LMSInitialize: function () { data['cmi.core.lesson_status'] = 'incomplete'; return 'true'; },
    LMSFinish: function () { data['cmi.core.session_time'] = fmtTime(Date.now() - startTime); return 'true'; },
    LMSGetValue: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : ''; },
    LMSSetValue: function (k, v) { data[k] = v; return 'true'; },
    LMSCommit: function () { return 'true'; },
    LMSGetLastError: function () { return '0'; },
    LMSGetErrorString: function () { return ''; },
    LMSGetDiagnostic: function () { return ''; },
    _getData: function () { return data; }
  };
})();`;
  }

  // ─── CSS ─────────────────────────────────────────────────────────────────

  private buildStylesheet(): string {
    return `
:root{--bg:#0f1117;--sidebar:#161b27;--card:#1e2435;--accent:#6366f1;--text:#e2e8f0;--muted:#64748b;--ok:#10b981;--err:#ef4444;--warn:#f59e0b;--border:#2d3748;--r:10px;--sw:280px}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.app{display:flex;min-height:100vh}
.sidebar{width:var(--sw);background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;overflow-y:auto;z-index:10}
.sidebar-header{padding:20px 16px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
.sidebar-logo{font-size:26px}
.sidebar-title{font-size:12px;font-weight:700;color:var(--text);line-height:1.3}
.sidebar-nav{flex:1;padding:10px 0}
.sidebar-nav ul{list-style:none}
.nav-module-title{display:flex;align-items:center;gap:8px;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text);transition:background .2s}
.nav-module-title:hover{background:rgba(99,102,241,.12)}
.module-icon{font-size:15px}
.chevron{margin-left:auto;font-size:11px;color:var(--muted)}
.nav-seqs{list-style:none}
.nav-seq{padding:8px 16px 8px 38px;cursor:pointer;font-size:12px;color:var(--muted);transition:all .2s;border-left:2px solid transparent}
.nav-seq:hover{color:var(--text);background:rgba(99,102,241,.08)}
.nav-seq.active{color:var(--accent);border-left-color:var(--accent);background:rgba(99,102,241,.12)}
.sidebar-progress{padding:16px;border-top:1px solid var(--border)}
.progress-label{font-size:11px;color:var(--muted);margin-bottom:6px}
.progress-bar{background:var(--border);border-radius:99px;height:6px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),#818cf8);border-radius:99px;transition:width .4s ease;width:0%}
.progress-pct{font-size:11px;color:var(--muted);margin-top:4px;text-align:right}
.main-content{margin-left:var(--sw);flex:1;padding:32px;max-width:860px}
.hidden{display:none!important}
.content-section{animation:fadeIn .3s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.breadcrumb{font-size:12px;color:var(--muted);margin-bottom:12px}
.breadcrumb .sep{margin:0 6px}
.seq-title{font-size:22px;font-weight:700;margin-bottom:12px;color:var(--text)}
.seq-text{background:var(--card);border-radius:var(--r);padding:16px 20px;margin-bottom:16px;line-height:1.7;font-size:14px;border-left:3px solid var(--accent)}
.seq-desc{color:var(--muted);font-size:13px;margin-bottom:16px}
.activity{background:var(--card);border-radius:var(--r);padding:20px;margin-bottom:20px;border:1px solid var(--border)}
.activity-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.activity-badge{background:rgba(99,102,241,.18);color:var(--accent);font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;letter-spacing:.5px}
.consigne{font-size:13px;color:var(--muted);margin-bottom:14px;padding:10px 14px;background:rgba(99,102,241,.06);border-radius:6px}
.quiz-header{margin-bottom:16px}
.quiz-header h3{font-size:16px;font-weight:600;margin-bottom:6px}
.quiz-desc{font-size:13px;color:var(--muted);margin-bottom:8px}
.badge{font-size:11px;background:rgba(16,185,129,.15);color:var(--ok);padding:2px 8px;border-radius:4px}
.question{margin-bottom:20px}
.question-text{font-size:14px;margin-bottom:10px;line-height:1.5}
.options{display:flex;flex-direction:column;gap:8px}
.option-label{display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:13px;transition:all .2s}
.option-label:hover{border-color:var(--accent);background:rgba(99,102,241,.08)}
.option-label.selected{border-color:var(--accent);background:rgba(99,102,241,.15)}
.feedback{margin-top:8px;padding:8px 12px;border-radius:6px;font-size:13px}
.feedback.success{background:rgba(16,185,129,.15);color:var(--ok)}
.feedback.error{background:rgba(239,68,68,.12);color:var(--err)}
.feedback.warning{background:rgba(245,158,11,.12);color:var(--warn)}
.btn-submit{margin-top:16px;padding:10px 24px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .2s}
.btn-submit:hover{opacity:.85}
.btn-submit:disabled{opacity:.4;cursor:not-allowed}
.quiz-result{margin-top:14px;padding:12px 16px;border-radius:8px;font-size:14px}
.quiz-result.passed{background:rgba(16,185,129,.15);color:var(--ok)}
.quiz-result.failed{background:rgba(239,68,68,.12);color:var(--err)}
.nav-buttons{display:flex;justify-content:space-between;margin-top:24px}
.btn-prev,.btn-next{padding:9px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.btn-prev{background:transparent;border:1px solid var(--border);color:var(--muted)}
.btn-prev:hover{border-color:var(--accent);color:var(--text)}
.btn-next{background:var(--accent);border:1px solid transparent;color:#fff}
.btn-next:hover{opacity:.85}
.welcome{text-align:center;padding:40px 20px}
.welcome h1{font-size:28px;font-weight:800;margin-bottom:12px}
.scenario-desc{color:var(--muted);font-size:15px;max-width:600px;margin:0 auto 28px;line-height:1.6}
.meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:32px;text-align:left}
.meta-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;display:flex;align-items:flex-start;gap:10px;font-size:13px}
.meta-card span{font-size:20px}
.meta-card strong{display:block;font-size:11px;color:var(--muted);margin-bottom:2px}
.meta-card p{color:var(--text);font-weight:600}
.btn-start{padding:12px 32px;background:linear-gradient(135deg,var(--accent),#818cf8);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:opacity .2s;box-shadow:0 4px 20px rgba(99,102,241,.35)}
.btn-start:hover{opacity:.88}
.no-content{color:var(--muted);font-size:13px;font-style:italic}
`;
  }

  // ─── Main HTML page ───────────────────────────────────────────────────────

  private buildIndexHtml(scenario: Scenario): string {
    const modules = scenario.modules ?? [];

    /* Sidebar nav */
    const navItems = modules
      .map(
        (mod, mi) => `
    <li class="nav-module">
      <div class="nav-module-title" onclick="toggleModule(${mi})">
        <span class="module-icon">📦</span>
        <span>${this.escHtml(mod.titre)}</span>
        <span class="chevron" id="chev_${mi}">▾</span>
      </div>
      <ul class="nav-seqs" id="seqs_${mi}">
        ${(mod.sequences ?? [])
          .map(
            (seq, si) => `
        <li class="nav-seq" onclick="showContent(${mi},${si})" id="nav_${mi}_${si}">
          📄 ${this.escHtml(seq.titre)}
        </li>`,
          )
          .join('')}
      </ul>
    </li>`,
      )
      .join('');

    /* Content sections */
    const sections = modules
      .map((mod, mi) =>
        (mod.sequences ?? [])
          .map((seq, si) => {
            const activitesHtml = (seq.activites ?? [])
              .map((act) => {
                let quizBlock = '';
                if (act.quiz) {
                  const questions = act.quiz.questions ?? [];
                  const correctAnswers = JSON.stringify(
                    questions.map((q) => ({
                      correct: (q.reponses ?? []).findIndex(
                        (r) => r.estCorrect,
                      ),
                      feedbacks: (q.reponses ?? []).map(
                        (r) => r.feedback ?? '',
                      ),
                      points: q.points,
                    })),
                  );
                  const questionsHtml = questions
                    .map(
                      (q, qi) => `
                  <div class="question">
                    <p class="question-text"><strong>Q${qi + 1}.</strong> ${this.escHtml(q.titre)}</p>
                    <div class="options">
                      ${(q.reponses ?? [])
                        .map(
                          (r, ri) => `
                      <label class="option-label" onclick="selectOpt(this)">
                        <input type="radio" name="q_${mi}_${si}_${qi}" value="${ri}"/>
                        <span>${this.escHtml(r.texte)}</span>
                      </label>`,
                        )
                        .join('')}
                    </div>
                    <div class="feedback hidden" id="fb_${mi}_${si}_${qi}"></div>
                  </div>`,
                    )
                    .join('');

                  quizBlock = `
                <div class="quiz-container" data-pass="${act.quiz.scorePourReussir}" data-ans='${this.escHtml(correctAnswers)}'>
                  <div class="quiz-header">
                    <h3>🎯 ${this.escHtml(act.quiz.titre)}</h3>
                    ${act.quiz.description ? `<p class="quiz-desc">${this.escHtml(act.quiz.description)}</p>` : ''}
                    <span class="badge">Score requis : ${act.quiz.scorePourReussir}%</span>
                  </div>
                  ${questionsHtml}
                  <button class="btn-submit" onclick="submitQuiz(this,${mi},${si})">Valider</button>
                  <div class="quiz-result hidden" id="result_${mi}_${si}"></div>
                </div>`;
                }

                return `
              <div class="activity">
                <div class="activity-header">
                  <span class="activity-badge">${this.escHtml(act.type)}</span>
                  <h3>${this.escHtml(act.titre)}</h3>
                </div>
                ${act.consigne ? `<p class="consigne">📌 <strong>Consigne :</strong> ${this.escHtml(act.consigne)}</p>` : ''}
                ${quizBlock || '<p class="no-content">Activité sans quiz associé.</p>'}
              </div>`;
              })
              .join('');

            return `
          <div class="content-section hidden" id="content_${mi}_${si}">
            <div class="breadcrumb">
              <span>${this.escHtml(mod.titre)}</span>
              <span class="sep">›</span>
              <span>${this.escHtml(seq.titre)}</span>
            </div>
            <h2 class="seq-title">${this.escHtml(seq.titre)}</h2>
            ${seq.texte ? `<div class="seq-text">${this.escHtml(seq.texte)}</div>` : ''}
            <div class="activities">
              ${activitesHtml || '<p class="no-content">Aucune activité dans cette séquence.</p>'}
            </div>
            <div class="nav-buttons">
              <button class="btn-prev" onclick="navigate(-1,${mi},${si})">← Précédent</button>
              <button class="btn-next" onclick="navigate(1,${mi},${si})">Suivant →</button>
            </div>
          </div>`;
          })
          .join(''),
      )
      .join('');

    /* flat nav for prev/next */
    const flatNav: [number, number][] = [];
    modules.forEach((mod, mi) =>
      (mod.sequences ?? []).forEach((_, si) => flatNav.push([mi, si])),
    );

    const totalSeqs = flatNav.length;
    const totalDuration = scenario.dureeScenario ?? 0;

    /* Welcome screen */
    const welcome = `
        <div class="content-section" id="content_welcome">
          <div class="welcome">
            <h1>📚 ${this.escHtml(scenario.titre)}</h1>
            ${scenario.description ? `<p class="scenario-desc">${this.escHtml(scenario.description)}</p>` : ''}
            <div class="meta-grid">
              ${scenario.objectif ? `<div class="meta-card"><span>🎯</span><div><strong>Objectif</strong><p>${this.escHtml(scenario.objectif)}</p></div></div>` : ''}
              ${scenario.niveau ? `<div class="meta-card"><span>📊</span><div><strong>Niveau</strong><p>${this.escHtml(scenario.niveau)}</p></div></div>` : ''}
              <div class="meta-card"><span>📦</span><div><strong>Modules</strong><p>${modules.length}</p></div></div>
              <div class="meta-card"><span>📄</span><div><strong>Séquences</strong><p>${totalSeqs}</p></div></div>
              ${totalDuration ? `<div class="meta-card"><span>⏱️</span><div><strong>Durée</strong><p>${totalDuration} min</p></div></div>` : ''}
            </div>
            <button class="btn-start" onclick="startCourse()">Commencer le cours →</button>
          </div>
        </div>`;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${this.escHtml(scenario.titre)}</title>
  <link rel="stylesheet" href="content/style.css"/>
  <script src="scorm_api.js"></script>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">🎓</div>
      <div class="sidebar-title">${this.escHtml(scenario.titre)}</div>
    </div>
    <nav class="sidebar-nav">
      <ul>
        <li class="nav-module">
          <div class="nav-module-title" onclick="showWelcome()">
            <span class="module-icon">🏠</span><span>Accueil</span>
          </div>
        </li>
        ${navItems}
      </ul>
    </nav>
    <div class="sidebar-progress">
      <div class="progress-label">Progression</div>
      <div class="progress-bar"><div class="progress-fill" id="pFill"></div></div>
      <div class="progress-pct" id="pPct">0%</div>
    </div>
  </aside>
  <main class="main-content">
    ${welcome}
    ${sections}
  </main>
</div>
<script>
var NAV=${JSON.stringify(flatNav)};
var visited=new Set();
var total=${totalSeqs};

window.onload=function(){if(window.API){API.LMSInitialize('');API.LMSCommit('');}};
window.onunload=function(){if(window.API){API.LMSFinish('');}};

function hideAll(){
  document.querySelectorAll('.content-section').forEach(function(e){e.classList.add('hidden');});
  document.querySelectorAll('.nav-seq').forEach(function(e){e.classList.remove('active');});
}
function showWelcome(){hideAll();document.getElementById('content_welcome').classList.remove('hidden');}
function startCourse(){if(NAV.length>0)showContent(NAV[0][0],NAV[0][1]);}
function showContent(mi,si){
  hideAll();
  var el=document.getElementById('content_'+mi+'_'+si);
  if(el){el.classList.remove('hidden');el.scrollTop=0;}
  var nav=document.getElementById('nav_'+mi+'_'+si);
  if(nav)nav.classList.add('active');
  visited.add(mi+'_'+si);
  var pct=total>0?Math.round(visited.size/total*100):0;
  document.getElementById('pFill').style.width=pct+'%';
  document.getElementById('pPct').textContent=pct+'%';
  if(window.API){
    API.LMSSetValue('cmi.core.lesson_status',pct>=100?'completed':'incomplete');
    API.LMSSetValue('cmi.suspend_data',JSON.stringify(Array.from(visited)));
    API.LMSCommit('');
  }
}
function toggleModule(mi){
  var seqs=document.getElementById('seqs_'+mi);
  var chev=document.getElementById('chev_'+mi);
  if(seqs){var h=seqs.style.display==='none';seqs.style.display=h?'block':'none';if(chev)chev.textContent=h?'▾':'▸';}
}
function navigate(dir,mi,si){
  var idx=NAV.findIndex(function(n){return n[0]===mi&&n[1]===si;});
  var next=idx+dir;
  if(next>=0&&next<NAV.length)showContent(NAV[next][0],NAV[next][1]);
  else if(next<0)showWelcome();
}
function selectOpt(label){
  var opts=label.closest('.options');
  if(opts)opts.querySelectorAll('.option-label').forEach(function(l){l.classList.remove('selected');});
  label.classList.add('selected');
}
function submitQuiz(btn,mi,si){
  var c=btn.closest('.quiz-container');
  var answers=JSON.parse(c.getAttribute('data-ans'));
  var pass=parseFloat(c.getAttribute('data-pass'));
  var totalPts=answers.reduce(function(s,a){return s+a.points;},0);
  var earned=0;
  answers.forEach(function(ans,qi){
    var sel=c.querySelector('input[name="q_'+mi+'_'+si+'_'+qi+'"]:checked');
    var fb=document.getElementById('fb_'+mi+'_'+si+'_'+qi);
    if(fb)fb.classList.remove('hidden');
    if(sel){
      var v=parseInt(sel.value);
      if(v===ans.correct){earned+=ans.points;if(fb){fb.textContent='✅ '+(ans.feedbacks[v]||'Correct !');fb.className='feedback success';}}
      else{if(fb){fb.textContent='❌ '+(ans.feedbacks[v]||'Incorrect.');fb.className='feedback error';}}
    }else{if(fb){fb.textContent='⚠️ Aucune réponse.';fb.className='feedback warning';}}
  });
  var score=totalPts>0?Math.round(earned/totalPts*100):0;
  var passed=score>=pass;
  var res=document.getElementById('result_'+mi+'_'+si);
  if(res){res.classList.remove('hidden');res.className='quiz-result '+(passed?'passed':'failed');
    res.innerHTML=passed?'🏆 <strong>Félicitations !</strong> Score : '+score+'% — Réussi !'
      :'😞 <strong>Score : '+score+'%</strong> — Minimum requis : '+pass+'%';}
  btn.disabled=true;
  if(window.API){API.LMSSetValue('cmi.core.score.raw',score.toString());API.LMSCommit('');}
}
</script>
</body>
</html>`;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private escXml(s: string): string {
    return (s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escHtml(s: string): string {
    return (s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
