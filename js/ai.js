/* LocalAI - free, on-device AI bridge.
 * Providers, in order: local bridge (/api/ai), Ollama, OpenAI-compatible (LM Studio, llama.cpp, ...).
 * No cloud keys, no paid APIs. Everything falls back to the deterministic templates in app.js.
 */
(function (global) {
  'use strict';

  const SETTINGS_KEY = 'ai_job_ai_settings_v1';
  const CACHE_KEY = 'ai_job_ai_models_v1';
  const STATUS_TTL = 30000;

  const DEFAULTS = {
    mode: 'auto',
    ollamaUrl: 'http://127.0.0.1:11434',
    openaiUrl: 'http://127.0.0.1:1234/v1',
    model: '',
    temperature: 0.4
  };

  let statusCache = null;
  let statusAt = 0;
  let statusPromise = null;

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(next) {
    const merged = { ...loadSettings(), ...next };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    } catch (e) { /* storage may be full or blocked */ }
    statusCache = null;
    statusAt = 0;
    return merged;
  }

  function trimUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error((label || 'Request') + ' timed out')), ms);
      promise.then(
        (value) => { clearTimeout(timer); resolve(value); },
        (error) => { clearTimeout(timer); reject(error); }
      );
    });
  }

  async function readJson(response) {
    const text = await response.text();
    const clean = String(text || '').replace(/^\uFEFF/, '').trim();
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ': ' + clean.slice(0, 180));
    }
    try {
      return JSON.parse(clean);
    } catch (e) {
      throw new Error('Invalid JSON from AI endpoint');
    }
  }

  function normalizeModels(list) {
    return (Array.isArray(list) ? list : [])
      .map((entry) => {
        if (typeof entry === 'string') return { id: entry, name: entry };
        const id = entry.id || entry.name || entry.model || entry.slug;
        if (!id) return null;
        return { id: id, name: entry.name || entry.id || id };
      })
      .filter(Boolean);
  }

  async function probeOllama(settings) {
    const base = trimUrl(settings.ollamaUrl || DEFAULTS.ollamaUrl);
    try {
      const response = await withTimeout(fetch(base + '/api/tags', { method: 'GET' }), 3500, 'Ollama');
      const data = await readJson(response);
      const models = normalizeModels(data.models || []);
      return { provider: 'ollama', url: base, available: true, models: models };
    } catch (e) {
      return { provider: 'ollama', url: base, available: false, models: [], error: e.message };
    }
  }

  async function probeOpenAI(settings) {
    const base = trimUrl(settings.openaiUrl || DEFAULTS.openaiUrl);
    try {
      const response = await withTimeout(fetch(base + '/models', { method: 'GET' }), 3500, 'OpenAI-compatible');
      const data = await readJson(response);
      const models = normalizeModels(data.data || data.models || []);
      return { provider: 'openai', url: base, available: true, models: models };
    } catch (e) {
      return { provider: 'openai', url: base, available: false, models: [], error: e.message };
    }
  }

  async function probeBridge(settings) {
    try {
      const response = await withTimeout(fetch('./api/ai/status', { method: 'GET', cache: 'no-store' }), 2500, 'Local bridge');
      const data = await readJson(response);
      if (!data || data.ok === false) return null;
      const providers = data.providers || {};
      return {
        provider: 'bridge',
        url: './api/ai',
        available: Boolean(data.available),
        models: normalizeModels(data.models || (data.preferred && data.preferred.model ? [data.preferred.model] : [])),
        bridgeProviders: providers,
        preferred: data.preferred || null,
        error: data.error || null
      };
    } catch (e) {
      return null;
    }
  }

  function pickProvider(settings, bridge, ollama, openai) {
    const mode = settings.mode || 'auto';
    const bridgeUsable = bridge && bridge.available;
    if (mode === 'bridge') return bridgeUsable ? bridge : null;
    if (mode === 'ollama') return ollama && ollama.available ? ollama : null;
    if (mode === 'openai') return openai && openai.available ? openai : null;
    if (bridgeUsable) return bridge;
    if (ollama && ollama.available) return ollama;
    if (openai && openai.available) return openai;
    return null;
  }

  async function probe(force) {
    const fresh = statusCache && (Date.now() - statusAt) < STATUS_TTL && !force;
    if (fresh) return statusCache;
    if (statusPromise && !force) return statusPromise;

    const settings = loadSettings();
    statusPromise = (async () => {
      if (settings.mode === 'disabled') {
        return { available: false, provider: null, model: '', models: [], settings: settings, error: 'Disabled in settings' };
      }

      const tasks = [];
      tasks.push(probeBridge(settings));
      if (settings.mode === 'auto' || settings.mode === 'ollama') tasks.push(probeOllama(settings));
      else tasks.push(Promise.resolve(null));
      if (settings.mode === 'auto' || settings.mode === 'openai') tasks.push(probeOpenAI(settings));
      else tasks.push(Promise.resolve(null));

      const [bridge, ollama, openai] = await Promise.all(tasks);
      const chosen = pickProvider(settings, bridge, ollama, openai);
      const models = chosen ? chosen.models.slice() : [];
      let model = settings.model || '';

      if (chosen && chosen.preferred && chosen.preferred.model) {
        model = chosen.preferred.model;
      }
      if (!model && models.length) model = models[0].id;

      const result = {
        available: Boolean(chosen),
        provider: chosen ? chosen.provider : null,
        providerUrl: chosen ? chosen.url : '',
        model: model,
        models: models,
        ollama: ollama,
        openai: openai,
        bridge: bridge,
        settings: settings,
        error: chosen ? null : (ollama && ollama.error) || (openai && openai.error) || 'No local AI runtime detected'
      };

      statusCache = result;
      statusAt = Date.now();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: statusAt, provider: result.provider, model: result.model })); } catch (e) { /* ignore */ }
      return result;
    })();

    try {
      return await statusPromise;
    } finally {
      statusPromise = null;
    }
  }

  async function callBridge(payload) {
    const response = await withTimeout(fetch('./api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }), 180000, 'Local AI bridge');
    const data = await readJson(response);
    if (!data || data.ok === false || !data.text) {
      throw new Error((data && data.error) || 'Local AI bridge returned no text');
    }
    return { text: data.text, provider: 'bridge', model: data.model || payload.model || '' };
  }

  async function callOllama(status, payload) {
    const base = trimUrl(status.providerUrl || loadSettings().ollamaUrl);
    const body = {
      model: payload.model || status.model,
      prompt: payload.prompt,
      stream: false,
      options: { temperature: payload.temperature }
    };
    if (payload.system) body.system = payload.system;
    const response = await withTimeout(fetch(base + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }), 180000, 'Ollama');
    const data = await readJson(response);
    const text = data.response || data.message && data.message.content || '';
    if (!text) throw new Error('Ollama returned an empty response');
    return { text: text, provider: 'ollama', model: body.model };
  }

  async function callOpenAI(status, payload) {
    const base = trimUrl(status.providerUrl || loadSettings().openaiUrl);
    const messages = [];
    if (payload.system) messages.push({ role: 'system', content: payload.system });
    messages.push({ role: 'user', content: payload.prompt });
    const body = {
      model: payload.model || status.model,
      messages: messages,
      temperature: payload.temperature,
      max_tokens: payload.maxTokens || 1200,
      stream: false
    };
    const response = await withTimeout(fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }), 180000, 'OpenAI-compatible runtime');
    const data = await readJson(response);
    const text = data.choices && data.choices[0] && (data.choices[0].message ? data.choices[0].message.content : data.choices[0].text) || '';
    if (!text) throw new Error('OpenAI-compatible runtime returned an empty response');
    return { text: text, provider: 'openai', model: body.model };
  }

  async function generate(prompt, options) {
    const opts = options || {};
    const status = await probe(opts.forceProbe);
    if (!status.available) {
      throw new Error('No local AI is running. Start Ollama (ollama serve) or LM Studio, or run the local bridge with python job_scraper/server.py.');
    }
    const settings = loadSettings();
    const payload = {
      prompt: prompt,
      system: opts.system || '',
      model: opts.model || status.model,
      temperature: typeof opts.temperature === 'number' ? opts.temperature : settings.temperature,
      maxTokens: opts.maxTokens || 1200
    };

    try {
      if (status.provider === 'bridge') return await callBridge(payload);
      if (status.provider === 'ollama') return await callOllama(status, payload);
      if (status.provider === 'openai') return await callOpenAI(status, payload);
    } catch (error) {
      const fallback = await probe(true);
      if (fallback.available && fallback.provider !== status.provider) {
        const retry = { ...payload, model: fallback.model };
        if (fallback.provider === 'bridge') return callBridge(retry);
        if (fallback.provider === 'ollama') return callOllama(fallback, retry);
        if (fallback.provider === 'openai') return callOpenAI(fallback, retry);
      }
      throw error;
    }

    throw new Error('Unsupported local AI provider');
  }

  function candidateBrief(candidate) {
    const c = candidate || {};
    const skills = [].concat(c.primarySkills || [], c.secondarySkills || []).filter(Boolean);
    const experience = Array.isArray(c.experience) ? c.experience.slice(0, 6) : [];
    const education = Array.isArray(c.education) ? c.education.slice(0, 4) : [];
    const lines = [
      'Name: ' + (c.name || 'Candidate'),
      'Headline: ' + (c.title || c.headline || ''),
      'Location: ' + (c.location || ''),
      'Years of experience: ' + (c.yearsExperience || c.years || 'unknown'),
      'Summary: ' + (c.summary || c.bio || ''),
      'Skills: ' + skills.join(', '),
      'Languages: ' + [].concat(c.languages || []).map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        return [item.language || item.name, item.level].filter(Boolean).join(' - ');
      }).filter(Boolean).join(', ')
    ];
    if (experience.length) {
      lines.push('Experience:');
      experience.forEach((role) => {
        const bullets = [].concat(role.responsibilities || role.description || []).filter(Boolean);
        const head = [role.title || role.role, role.company, role.period || role.dates, role.location].filter(Boolean).join(' | ');
        lines.push('- ' + head);
        bullets.forEach((bullet) => lines.push('  * ' + bullet));
      });
    }
    if (education.length) {
      lines.push('Education:');
      education.forEach((entry) => {
        lines.push('- ' + [entry.degree, entry.field, entry.school || entry.institution, entry.period || entry.dates].filter(Boolean).join(' | '));
        if (entry.thesis) lines.push('  Thesis: ' + entry.thesis);
        if (entry.highlights) lines.push('  Highlights: ' + entry.highlights);
      });
    }
    return lines.join('\n').slice(0, 6000);
  }

  function jobBrief(job) {
    const j = job || {};
    const tags = [].concat(j.tags || []).filter(Boolean);
    return [
      'Title: ' + (j.title || ''),
      'Company: ' + (j.company || ''),
      'Location: ' + (j.location || '') + (j.workplace ? ' (' + j.workplace + ')' : ''),
      'Source: ' + (j.portal || ''),
      'Sector: ' + (j.sector || ''),
      'Salary: ' + (j.salaryEstimate || j.salary || ''),
      'Tags: ' + tags.join(', '),
      'Description:',
      String(j.description || '').replace(/\s+/g, ' ').trim().slice(0, 7000)
    ].join('\n');
  }

  const SYSTEM = 'You are a precise, honest job-application assistant. Use only facts supplied in the prompt. Never invent employers, degrees, dates, metrics, or skills. If information is missing, say what is missing instead of guessing. Write in clear English.';

  async function evaluateJob(job, candidate) {
    const prompt = [
      'Evaluate this candidate against this job posting.',
      '',
      'CANDIDATE',
      candidateBrief(candidate),
      '',
      'JOB',
      jobBrief(job),
      '',
      'Return plain text with exactly these sections:',
      '1. Verdict: one sentence plus a fit score from 0-100.',
      '2. Strong matches: 3-6 bullets, each quoting evidence from the posting.',
      '3. Gaps and risks: 3-6 bullets, honest and specific.',
      '4. Application angle: 2-4 sentences on what to emphasise and what not to claim.'
    ].join('\n');
    return generate(prompt, { system: SYSTEM, maxTokens: 900 });
  }

  async function coverLetter(job, candidate) {
    const prompt = [
      'Write a tailored cover letter for this candidate and job.',
      '',
      'CANDIDATE',
      candidateBrief(candidate),
      '',
      'JOB',
      jobBrief(job),
      '',
      'Rules: 250-320 words. Plain text only, no markdown, no placeholders like [Company]. Address the specific role and company. Use only facts from the candidate section. Mention 2-3 concrete overlaps with the posting. End with a short closing line. Do not invent achievements.'
    ].join('\n');
    return generate(prompt, { system: SYSTEM, maxTokens: 800 });
  }

  async function interviewAnswer(question, job, candidate) {
    const prompt = [
      'Prepare an interview answer using the STAR method (Situation, Task, Action, Result).',
      '',
      'QUESTION: ' + (question || ''),
      '',
      'CANDIDATE',
      candidateBrief(candidate),
      '',
      'JOB CONTEXT',
      jobBrief(job),
      '',
      'Rules: 180-260 words. Use one real example from the candidate experience, or explicitly say "I would draw on..." and describe a plausible but clearly generic example without inventing a named employer. Mark any detail the candidate must fill in as FILL IN. Plain text.'
    ].join('\n');
    return generate(prompt, { system: SYSTEM, maxTokens: 700 });
  }

  async function learningPlan(gaps, candidate) {
    const list = [].concat(gaps || []).filter(Boolean);
    const prompt = [
      'Build a prioritised 4-week learning plan for this candidate.',
      '',
      'CANDIDATE',
      candidateBrief(candidate),
      '',
      'SKILL GAPS',
      list.map((gap) => '- ' + (typeof gap === 'string' ? gap : gap.skill || gap.name || '')).join('\n'),
      '',
      'Rules: plain text. For each of the top 4 gaps give: why it matters, one free resource (name + real URL only if certain), a 3-step exercise, and an estimated hours budget. No paid courses. No invented URLs.'
    ].join('\n');
    return generate(prompt, { system: SYSTEM, maxTokens: 900 });
  }

  async function searchQueries(candidate) {
    const prompt = [
      'Suggest 5 short job-search queries for this candidate.',
      '',
      candidateBrief(candidate),
      '',
      'Return one query per line, no numbering, no quotes. Each query must be 1-4 words suitable for a job board API. Focus on role titles and core technologies.'
    ].join('\n');
    const result = await generate(prompt, { system: SYSTEM, maxTokens: 200 });
    return String(result.text || '')
      .split(/\r?\n/)
      .map((line) => line.replace(/^[\s\-*\d.]+/, '').replace(/["']/g, '').trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  async function rewriteBullet(bullet, candidate) {
    const prompt = [
      'Rewrite this CV bullet so it is specific, honest, and results-oriented.',
      '',
      'BULLET: ' + (bullet || ''),
      '',
      'CANDIDATE CONTEXT',
      candidateBrief(candidate),
      '',
      'Rules: one bullet only, max 28 words, start with a strong verb. Do not invent numbers. If a number is missing, write [add metric]. Plain text.'
    ].join('\n');
    return generate(prompt, { system: SYSTEM, maxTokens: 160 });
  }

  async function summarizeJobs(jobs, candidate) {
    const list = (Array.isArray(jobs) ? jobs : []).slice(0, 12).map((job, index) => {
      return [
        (index + 1) + '. ' + (job.title || '') + ' at ' + (job.company || ''),
        'Location: ' + (job.location || '') + ' | Source: ' + (job.portal || '') + ' | Fit: ' + (job.matchScore || '?') + '%',
        String(job.description || '').replace(/\s+/g, ' ').slice(0, 500)
      ].join('\n');
    }).join('\n\n');
    const prompt = [
      'Compare these job postings for the candidate and recommend the best 3.',
      '',
      'CANDIDATE',
      candidateBrief(candidate),
      '',
      'JOBS',
      list,
      '',
      'Rules: plain text. For each recommended job: title, company, why it fits (2 sentences), main risk (1 sentence). Then one line on which to apply to first and why. Do not invent details.'
    ].join('\n');
    return generate(prompt, { system: SYSTEM, maxTokens: 900 });
  }

  function statusLabel(status) {
    if (!status || !status.available) return 'AI offline - using built-in templates';
    const names = { bridge: 'Local bridge', ollama: 'Ollama', openai: 'OpenAI-compatible' };
    return (names[status.provider] || status.provider) + ' - ' + (status.model || 'no model');
  }

  async function mountPanel(container) {
    const host = typeof container === 'string' ? document.getElementById(container) : container;
    if (!host) return null;

    host.innerHTML = [
      '<div class="local-ai-panel">',
      '  <div class="local-ai-head">',
      '    <div class="local-ai-status"><span class="local-ai-dot" id="local-ai-dot"></span><span id="local-ai-status-text">Checking local AI...</span></div>',
      '    <div class="local-ai-actions">',
      '      <button type="button" class="btn btn-sm btn-secondary" id="local-ai-refresh">Refresh</button>',
      '      <button type="button" class="btn btn-sm btn-secondary" id="local-ai-configure">Settings</button>',
      '    </div>',
      '  </div>',
      '  <div class="local-ai-settings" id="local-ai-settings" hidden>',
      '    <label>Runtime <select class="form-select" id="local-ai-mode">',
      '      <option value="auto">Auto-detect</option>',
      '      <option value="bridge">Local bridge (server.py)</option>',
      '      <option value="ollama">Ollama</option>',
      '      <option value="openai">OpenAI-compatible (LM Studio)</option>',
      '      <option value="disabled">Disabled</option>',
      '    </select></label>',
      '    <label>Ollama URL <input type="url" class="form-input" id="local-ai-ollama" placeholder="http://127.0.0.1:11434"></label>',
      '    <label>OpenAI-compatible URL <input type="url" class="form-input" id="local-ai-openai" placeholder="http://127.0.0.1:1234/v1"></label>',
      '    <label>Model <select class="form-select" id="local-ai-model"><option value="">Auto</option></select></label>',
      '    <button type="button" class="btn btn-sm btn-primary" id="local-ai-save">Save</button>',
      '  </div>',
      '  <p class="local-ai-hint" id="local-ai-hint">Free and local. Start Ollama or LM Studio, or run <code>python job_scraper/server.py</code> for the built-in bridge.</p>',
      '</div>'
    ].join('\n');

    const dot = host.querySelector('#local-ai-dot');
    const text = host.querySelector('#local-ai-status-text');
    const modelSelect = host.querySelector('#local-ai-model');
    const settingsBox = host.querySelector('#local-ai-settings');
    const modeSelect = host.querySelector('#local-ai-mode');
    const ollamaInput = host.querySelector('#local-ai-ollama');
    const openaiInput = host.querySelector('#local-ai-openai');
    const hint = host.querySelector('#local-ai-hint');

    const settings = loadSettings();
    modeSelect.value = settings.mode;
    ollamaInput.value = settings.ollamaUrl;
    openaiInput.value = settings.openaiUrl;

    function paint(status) {
      const available = status && status.available;
      dot.className = 'local-ai-dot ' + (available ? 'online' : 'offline');
      text.textContent = statusLabel(status);
      text.title = status && status.error ? status.error : '';
      const models = (status && status.models) || [];
      const current = (status && status.model) || loadSettings().model || '';
      modelSelect.innerHTML = '<option value="">Auto</option>' + models.map((model) => {
        return '<option value="' + escapeHtml(model.id) + '">' + escapeHtml(model.name) + '</option>';
      }).join('');
      modelSelect.value = current;
      if (modelSelect.value !== current) modelSelect.value = '';
      if (!available && status) {
        hint.textContent = status.error || 'No local runtime found. The app will use its built-in templates.';
      } else {
        hint.innerHTML = 'Free and local. AI output is generated on this machine and never sent to a cloud API.';
      }
    }

    async function refresh(force) {
      text.textContent = 'Checking local AI...';
      dot.className = 'local-ai-dot pending';
      try {
        const status = await probe(Boolean(force));
        paint(status);
        return status;
      } catch (e) {
        paint({ available: false, error: e.message, models: [] });
        return null;
      }
    }

    host.querySelector('#local-ai-refresh').addEventListener('click', () => refresh(true));
    host.querySelector('#local-ai-configure').addEventListener('click', () => {
      settingsBox.hidden = !settingsBox.hidden;
    });
    host.querySelector('#local-ai-save').addEventListener('click', async () => {
      saveSettings({
        mode: modeSelect.value,
        ollamaUrl: trimUrl(ollamaInput.value) || DEFAULTS.ollamaUrl,
        openaiUrl: trimUrl(openaiInput.value) || DEFAULTS.openaiUrl,
        model: modelSelect.value || ''
      });
      settingsBox.hidden = true;
      await refresh(true);
      if (typeof global.showToast === 'function') {
        global.showToast('Local AI settings saved.', 'success');
      }
    });

    await refresh(false);
    return { refresh: refresh, paint: paint };
  }

  const LocalAI = {
    DEFAULTS: DEFAULTS,
    getSettings: loadSettings,
    saveSettings: saveSettings,
    probe: probe,
    generate: generate,
    statusLabel: statusLabel,
    mountPanel: mountPanel,
    evaluateJob: evaluateJob,
    coverLetter: coverLetter,
    interviewAnswer: interviewAnswer,
    learningPlan: learningPlan,
    searchQueries: searchQueries,
    rewriteBullet: rewriteBullet,
    summarizeJobs: summarizeJobs,
    candidateBrief: candidateBrief,
    jobBrief: jobBrief
  };

  global.LocalAI = LocalAI;
})(typeof window !== 'undefined' ? window : this);
