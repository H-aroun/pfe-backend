import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import JSZip from 'jszip';
import { Scenario } from 'src/scenario/scenario.entity';
import {
  CourseBlock,
  CourseDocument,
  CoursePage,
} from 'src/scenario/course-document.types';

@Injectable()
export class ScormService {
  constructor(
    @InjectRepository(Scenario)
    private readonly scenarioRepo: Repository<Scenario>,
  ) {}

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
      ],
    });

    if (!scenario) {
      throw new NotFoundException(`Scenario #${scenarioId} not found`);
    }

    this.sortScenarioTree(scenario);
    const course =
      scenario.courseDocument ?? this.buildCourseFromLegacy(scenario);
    const zip = new JSZip();

    zip.file('imsmanifest.xml', this.buildManifest(scenario, course));
    zip.file('index.html', this.buildIndexHtml(course));
    zip.file('course.json', JSON.stringify(course, null, 2));
    zip.file('runtime.js', this.buildRuntime());
    zip.file('scorm.js', this.buildScormWrapper(course.settings.scormVersion));
    zip.file('styles.css', this.buildStylesheet());

    return zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  }

  private buildManifest(scenario: Scenario, course: CourseDocument): string {
    const uid = `SCO_${scenario.id}_${Date.now()}`;
    const files = [
      'index.html',
      'course.json',
      'runtime.js',
      'scorm.js',
      'styles.css',
    ]
      .map((file) => `<file href="${file}"/>`)
      .join('\n      ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${uid}" version="1.1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
    http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>${course.settings.scormVersion === '2004' ? '2004 4th Edition' : '1.2'}</schemaversion>
  </metadata>
  <organizations default="ORG_001">
    <organization identifier="ORG_001" structure="hierarchical">
      <title>${this.escXml(course.title)}</title>
      ${course.pages
        .map(
          (page, index) => `
      <item identifier="ITEM_${index}" identifierref="RESOURCE_SCO" parameters="page=${index}">
        <title>${this.escXml(page.title)}</title>
      </item>`,
        )
        .join('')}
    </organization>
  </organizations>
  <resources>
    <resource identifier="RESOURCE_SCO" type="webcontent" adlcp:scormtype="sco" href="index.html">
      ${files}
    </resource>
  </resources>
</manifest>`;
  }

  private buildIndexHtml(course: CourseDocument): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${this.escHtml(course.title)}</title>
  <link rel="stylesheet" href="styles.css"/>
  <script src="scorm.js"></script>
</head>
<body>
  <div id="app" class="runtime-shell">
    <aside class="runtime-nav">
      <div class="runtime-brand">${this.escHtml(course.title)}</div>
      <div id="nav"></div>
      <div class="progress-wrap">
        <div class="progress-label">Progress</div>
        <div class="progress-track"><div id="progress-fill"></div></div>
        <div id="progress-text">0%</div>
      </div>
    </aside>
    <main class="runtime-main">
      <div id="page"></div>
    </main>
  </div>
  <script src="runtime.js"></script>
</body>
</html>`;
  }

  private buildRuntime(): string {
    return `(() => {
  let course = null;
  let currentPage = 0;
  let visited = new Set();
  let score = 0;
  let possibleScore = 0;

  const qs = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  async function init() {
    course = await fetch('course.json').then((response) => response.json());
    window.scormRuntime.init(course.settings?.scormVersion || '1.2');
    restoreState();
    renderNav();
    renderPage(currentPage);
  }

  function restoreState() {
    const suspend = window.scormRuntime.get('suspend');
    if (!suspend) return;
    try {
      const state = JSON.parse(suspend);
      currentPage = Number.isInteger(state.currentPage) ? state.currentPage : 0;
      visited = new Set(Array.isArray(state.visited) ? state.visited : []);
      score = Number(state.score) || 0;
      possibleScore = Number(state.possibleScore) || 0;
    } catch {
      currentPage = 0;
    }
  }

  function saveState() {
    const payload = JSON.stringify({
      currentPage,
      visited: Array.from(visited),
      score,
      possibleScore,
    });
    window.scormRuntime.set('location', String(currentPage));
    window.scormRuntime.set('suspend', payload);
    const progress = course.pages.length ? Math.round((visited.size / course.pages.length) * 100) : 0;
    window.scormRuntime.set('score', possibleScore ? Math.round((score / possibleScore) * 100) : progress);
    if (progress >= 100) {
      const passingScore = course.settings?.passingScore ?? 80;
      const rawScore = possibleScore ? Math.round((score / possibleScore) * 100) : 100;
      window.scormRuntime.set('status', rawScore >= passingScore ? 'passed' : 'completed');
    } else {
      window.scormRuntime.set('status', 'incomplete');
    }
    window.scormRuntime.commit();
  }

  function renderNav() {
    qs('#nav').innerHTML = course.pages.map((page, index) =>
      '<button class="nav-item" data-index="' + index + '">' +
      '<span>' + (index + 1) + '</span>' + esc(page.title) + '</button>'
    ).join('');
    document.querySelectorAll('.nav-item').forEach((button) => {
      button.addEventListener('click', () => renderPage(Number(button.dataset.index)));
    });
  }

  function renderPage(index) {
    currentPage = Math.max(0, Math.min(index, course.pages.length - 1));
    const page = course.pages[currentPage];
    visited.add(page.id);
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', Number(item.dataset.index) === currentPage);
    });
    qs('#page').innerHTML = '<section class="page-card">' + renderPageBody(page) + renderPager() + '</section>';
    bindInteractions(page);
    updateProgress();
    saveState();
  }

  function renderPageBody(page) {
    if (page.type === 'branching_scenario') return renderScenario(page);
    if (page.type === 'quiz') return renderQuiz(page);
    return '<p class="eyebrow">' + esc(page.type) + '</p><h1>' + esc(page.title) + '</h1>' +
      (page.summary ? '<p class="summary">' + esc(page.summary) + '</p>' : '') +
      (page.blocks || []).map(renderBlock).join('');
  }

  function renderBlock(block) {
    if (block.type === 'heading') return '<h2 class="block-heading">' + esc(block.content || block.title || '') + '</h2>';
    if (block.type === 'paragraph' || block.type === 'text') return '<div class="text-block"><p>' + esc(block.content || '') + '</p></div>';
    if (block.type === 'quote') return '<blockquote>' + esc(block.content || '') + '<cite>' + esc(block.metadata?.attribution || '') + '</cite></blockquote>';
    if (block.type === 'statement') return '<aside class="statement">' + esc(block.content || block.title || '') + '</aside>';
    if (block.type === 'image') return '<figure><img src="' + esc(block.assetUrl || '') + '" alt=""/><figcaption>' + esc(block.title || '') + '</figcaption></figure>';
    if (block.type === 'video') return '<video controls src="' + esc(block.assetUrl || block.content || '') + '"></video>';
    if (block.type === 'audio') return '<audio controls src="' + esc(block.assetUrl || block.content || '') + '"></audio>';
    if (block.type === 'embed') return '<iframe src="' + esc(block.assetUrl || block.content || '') + '" title="' + esc(block.title || 'Embed') + '"></iframe>';
    if (block.type === 'attachment' || block.type === 'document') return '<a class="attachment" href="' + esc(block.assetUrl || block.content || '#') + '" target="_blank" rel="noreferrer">' + esc(block.title || 'Open attachment') + '</a>';
    if (block.type === 'code') return '<pre><code>' + esc(block.content || '') + '</code></pre>';
    if (block.type === 'callout') return '<aside class="callout"><strong>' + esc(block.title || 'Note') + '</strong><p>' + esc(block.content || '') + '</p></aside>';
    if (block.type === 'knowledge_check') return renderKnowledgeCheck(block);
    if (block.type === 'divider') return '<hr/>';
    if (block.type === 'spacer') return '<div style="height:' + (Number(block.metadata?.height) || 48) + 'px"></div>';
    if (block.type === 'button') return '<a class="primary" href="' + esc(block.assetUrl || '#') + '">' + esc(block.content || block.title || 'Continue') + '</a>';
    if (Array.isArray(block.items) && block.items.length) return renderItemsBlock(block);
    return '<div class="text-block"><h2>' + esc(block.title || '') + '</h2><p>' + esc(block.content || '') + '</p></div>';
  }

  function renderItemsBlock(block) {
    return '<section class="items-block"><h2>' + esc(block.title || '') + '</h2><div class="items-grid">' +
      block.items.map((item, index) => '<article><span>' + (index + 1) + '</span><h3>' + esc(item.title || '') + '</h3><p>' + esc(item.content || '') + '</p></article>').join('') +
      '</div></section>';
  }

  function renderKnowledgeCheck(block) {
    const check = block.knowledgeCheck || block.metadata?.knowledgeCheck || {};
    return '<section class="knowledge-check"><p class="eyebrow">Knowledge check</p><h2>' + esc(check.question || block.title || '') + '</h2>' +
      '<div class="choices">' + (check.options || []).map((option) =>
        '<button class="choice" data-correct="' + (option.isCorrect ? '1' : '0') + '" data-feedback="' + esc(option.feedback || (option.isCorrect ? check.correctFeedback : check.incorrectFeedback) || '') + '">' + esc(option.text || '') + '</button>'
      ).join('') + '</div><div class="feedback"></div></section>';
  }

  function renderScenario(page) {
    const scenario = page.scenario || { nodes: [], startNodeId: '' };
    const startNode = scenario.nodes.find((node) => node.id === scenario.startNodeId) || scenario.nodes[0];
    if (!startNode) return '<h1>' + esc(page.title) + '</h1><p>No scenario nodes yet.</p>';
    return '<div class="scenario" data-page="' + esc(page.id) + '" data-node="' + esc(startNode.id) + '">' +
      renderScenarioNode(startNode, scenario.nodes) + '</div>';
  }

  function renderScenarioNode(node, nodes) {
    return '<p class="eyebrow">Branching scenario</p><h1>' + esc(node.speaker || 'Scenario') + '</h1>' +
      '<p class="dialogue">' + esc(node.text) + '</p>' +
      '<div class="choices">' + (node.choices || []).map((choice) =>
        '<button class="choice" data-next="' + esc(choice.nextNodeId || '') + '" data-score="' + (Number(choice.score) || 0) + '" data-feedback="' + esc(choice.feedback || '') + '">' + esc(choice.text) + '</button>'
      ).join('') + '</div><div class="feedback"></div>';
  }

  function renderQuiz(page) {
    const quiz = page.quiz || { questions: [], passingScore: 80 };
    return '<p class="eyebrow">Quiz</p><h1>' + esc(page.title) + '</h1>' +
      quiz.questions.map((question, qi) =>
        '<div class="question" data-points="' + (question.points || 1) + '"><h2>' + esc(question.text) + '</h2>' +
        question.options.map((option) =>
          '<label><input type="radio" name="q' + qi + '" data-correct="' + (option.isCorrect ? '1' : '0') + '" data-feedback="' + esc(option.feedback || '') + '"/> ' + esc(option.text) + '</label>'
        ).join('') + '<div class="feedback"></div></div>'
      ).join('') + '<button class="primary" id="submit-quiz">Submit quiz</button>';
  }

  function renderPager() {
    return '<div class="pager"><button id="prev-page">Previous</button><button id="next-page">Next</button></div>';
  }

  function bindInteractions(page) {
    qs('#prev-page')?.addEventListener('click', () => renderPage(currentPage - 1));
    qs('#next-page')?.addEventListener('click', () => renderPage(currentPage + 1));
    bindKnowledgeChecks();
    if (page.type === 'branching_scenario') bindScenario(page);
    if (page.type === 'quiz') bindQuiz();
  }

  function bindKnowledgeChecks() {
    document.querySelectorAll('.knowledge-check').forEach((check) => {
      check.addEventListener('click', (event) => {
        const target = event.target.closest('.choice');
        if (!target) return;
        possibleScore += 1;
        if (target.dataset.correct === '1') score += 1;
        const feedback = check.querySelector('.feedback');
        if (feedback) feedback.textContent = target.dataset.feedback || (target.dataset.correct === '1' ? 'Correct.' : 'Try again.');
        saveState();
      });
    });
  }

  function bindScenario(page) {
    const scenario = page.scenario || { nodes: [] };
    qs('.scenario')?.addEventListener('click', (event) => {
      const target = event.target.closest('.choice');
      if (!target) return;
      score += Number(target.dataset.score) || 0;
      possibleScore += 1;
      const feedback = qs('.scenario .feedback');
      if (feedback) feedback.textContent = target.dataset.feedback || '';
      const next = scenario.nodes.find((node) => node.id === target.dataset.next);
      if (next) qs('.scenario').innerHTML = renderScenarioNode(next, scenario.nodes);
      saveState();
    });
  }

  function bindQuiz() {
    qs('#submit-quiz')?.addEventListener('click', () => {
      document.querySelectorAll('.question').forEach((question) => {
        const selected = question.querySelector('input:checked');
        possibleScore += Number(question.dataset.points) || 1;
        if (selected?.dataset.correct === '1') score += Number(question.dataset.points) || 1;
        const feedback = question.querySelector('.feedback');
        if (feedback) feedback.textContent = selected?.dataset.feedback || '';
      });
      saveState();
    });
  }

  function updateProgress() {
    const progress = course.pages.length ? Math.round((visited.size / course.pages.length) * 100) : 0;
    qs('#progress-fill').style.width = progress + '%';
    qs('#progress-text').textContent = progress + '%';
  }

  window.addEventListener('beforeunload', () => window.scormRuntime.finish());
  init();
})();`;
  }

  private buildScormWrapper(version: '1.2' | '2004'): string {
    const is2004 = version === '2004';
    return `window.scormRuntime=(function(){
  var api=null, initialized=false, version='${version}';
  function find(win){var attempts=0;while(win&&attempts<500){if(win.API_1484_11)return win.API_1484_11;if(win.API)return win.API;win=win.parent;attempts++;}return null;}
  function ensure(){if(api)return api;api=find(window)||find(window.opener);return api;}
  function call(name,args){var target=ensure();if(!target||typeof target[name]!=='function')return '';return target[name].apply(target,args||[]);}
  return {
    init:function(){if(initialized)return true;initialized=${is2004 ? "call('Initialize',[''])==='true'" : "call('LMSInitialize',[''])==='true'"};return initialized;},
    finish:function(){if(!initialized)return true;${is2004 ? "call('Terminate',['']);" : "call('LMSFinish',['']);"} initialized=false;return true;},
    commit:function(){return ${is2004 ? "call('Commit',[''])" : "call('LMSCommit',[''])"};},
    get:function(key){var map={status:${is2004 ? "'cmi.completion_status'" : "'cmi.core.lesson_status'"},score:${is2004 ? "'cmi.score.raw'" : "'cmi.core.score.raw'"},suspend:'cmi.suspend_data',location:${is2004 ? "'cmi.location'" : "'cmi.core.lesson_location'"}};return ${is2004 ? "call('GetValue',[map[key]||key])" : "call('LMSGetValue',[map[key]||key])"};},
    set:function(key,value){var map={status:${is2004 ? "'cmi.completion_status'" : "'cmi.core.lesson_status'"},score:${is2004 ? "'cmi.score.raw'" : "'cmi.core.score.raw'"},suspend:'cmi.suspend_data',location:${is2004 ? "'cmi.location'" : "'cmi.core.lesson_location'"}};return ${is2004 ? "call('SetValue',[map[key]||key,String(value)])" : "call('LMSSetValue',[map[key]||key,String(value)])"};},
    version:function(){return version;}
  };
})();`;
  }

  private buildStylesheet(): string {
    return `:root{--bg:#10131a;--panel:#171b24;--card:#202633;--line:#313847;--text:#f3f7fb;--muted:#96a0af;--accent:#0f6b4a;--accent2:#83bfa1}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}.runtime-shell{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:100vh}.runtime-nav{background:var(--panel);border-right:1px solid var(--line);padding:18px;display:flex;flex-direction:column;gap:16px}.runtime-brand{font-size:15px;font-weight:800;line-height:1.35}.nav-item{width:100%;display:flex;gap:10px;align-items:center;text-align:left;background:transparent;border:1px solid transparent;color:var(--muted);border-radius:8px;padding:10px;cursor:pointer}.nav-item span{display:grid;place-items:center;width:22px;height:22px;border-radius:999px;background:#273041;color:var(--text);font-size:12px}.nav-item.active{background:rgba(15,107,74,.18);border-color:rgba(131,191,161,.35);color:var(--text)}.progress-wrap{margin-top:auto}.progress-label,#progress-text{font-size:12px;color:var(--muted);margin-bottom:6px}.progress-track{height:7px;background:#2a3140;border-radius:999px;overflow:hidden}#progress-fill{height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--accent2))}.runtime-main{padding:32px;display:flex;justify-content:center}.page-card{width:min(940px,100%);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:28px}.eyebrow{text-transform:uppercase;font-size:11px;letter-spacing:.08em;color:var(--accent2);font-weight:800}h1{margin:4px 0 14px;font-size:30px}.block-heading,h2{font-size:22px}.summary,.text-block p,.dialogue{color:var(--muted);line-height:1.7}.text-block,.question,.callout,.statement,.items-block,.knowledge-check{border-top:1px solid var(--line);padding-top:18px;margin-top:18px}.callout,.statement,.knowledge-check{background:rgba(131,191,161,.08);border:1px solid rgba(131,191,161,.22);border-radius:8px;padding:16px}.statement{font-size:20px;font-weight:800}.items-grid{display:grid;gap:12px;margin-top:14px}.items-grid article{border:1px solid var(--line);background:#161c27;border-radius:8px;padding:14px}.items-grid span{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:999px;background:rgba(131,191,161,.18);color:var(--accent2);font-size:12px;font-weight:800}.items-grid h3{font-size:15px}.items-grid p{color:var(--muted);line-height:1.6}blockquote{border-left:4px solid var(--accent2);padding-left:16px;color:var(--text);font-size:20px}blockquote cite{display:block;color:var(--muted);font-size:13px;margin-top:8px}.attachment{display:inline-flex;border:1px solid var(--line);border-radius:8px;color:var(--text);padding:12px;text-decoration:none}.choices{display:grid;gap:10px;margin-top:20px}.choice,label{display:block;border:1px solid var(--line);background:#161c27;color:var(--text);border-radius:8px;padding:12px;cursor:pointer}.choice:hover,label:hover{border-color:var(--accent2)}.feedback{margin-top:10px;color:var(--accent2)}.primary,.pager button{display:inline-flex;background:var(--accent);border:1px solid var(--accent);color:white;border-radius:999px;padding:9px 16px;font-weight:700;cursor:pointer;text-decoration:none}.pager{display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:18px;margin-top:28px}.pager button:first-child{background:transparent;color:var(--muted);border-color:var(--line)}img,video,iframe{max-width:100%;width:100%;border-radius:8px;border:1px solid var(--line)}audio{width:100%}pre{overflow:auto;border-radius:8px;background:#0b0f16;padding:16px}hr{border:0;border-top:1px solid var(--line);margin:24px 0}@media(max-width:800px){.runtime-shell{grid-template-columns:1fr}.runtime-nav{position:static;border-right:0;border-bottom:1px solid var(--line)}.runtime-main{padding:16px}.page-card{padding:20px}}`;
  }

  private buildCourseFromLegacy(scenario: Scenario): CourseDocument {
    const pages: CoursePage[] = [];

    scenario.modules?.forEach((module) => {
      module.sequences?.forEach((sequence) => {
        const blocks: CourseBlock[] = [];
        if (sequence.texte || sequence.description) {
          blocks.push({
            id: `sequence-${sequence.id}-text`,
            type: 'paragraph',
            category: 'text',
            content: sequence.texte || sequence.description,
          });
        }
        sequence.activites?.forEach((activity) => {
          blocks.push({
            id: `activity-${activity.id}`,
            type: String(activity.type) === 'video' ? 'video' : 'paragraph',
            category: String(activity.type) === 'video' ? 'media' : 'text',
            title: activity.titre,
            content: activity.consigne,
            assetUrl:
              String(activity.type) === 'video' ? activity.consigne : undefined,
          });
        });
        pages.push({
          id: `sequence-${sequence.id}`,
          type: 'lesson',
          title: sequence.titre,
          summary: module.titre,
          blocks,
        });
      });
    });

    return {
      schemaVersion: 1,
      id: `scenario-${scenario.id}`,
      title: scenario.titre,
      description: scenario.description,
      objectives: scenario.objectif ? [scenario.objectif] : [],
      estimatedMinutes: scenario.dureeScenario,
      pages: pages.length
        ? pages
        : [
            {
              id: `lesson-${scenario.id}`,
              type: 'lesson',
              title: 'Introduction',
              blocks: [
                {
                  id: `block-${scenario.id}`,
                  type: 'text',
                  content: scenario.description,
                },
              ],
            },
          ],
      settings: {
        completionMode: 'pages',
        passingScore: 80,
        scormVersion: '1.2',
      },
      metadata: {
        source: 'legacy_tree',
        generatedAt: new Date().toISOString(),
        version: 1,
      },
    };
  }

  private escXml(value: string): string {
    return (value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escHtml(value: string): string {
    return (value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private sortScenarioTree(scenario: Scenario): void {
    scenario.modules?.sort((a, b) => a.ordre - b.ordre || a.id - b.id);
    scenario.modules?.forEach((module) => {
      module.sequences?.sort((a, b) => a.ordre - b.ordre || a.id - b.id);
      module.sequences?.forEach((sequence) => {
        sequence.activites?.sort((a, b) => a.ordre - b.ordre || a.id - b.id);
      });
    });
  }
}
