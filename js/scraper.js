/**
 * Real multi-source job aggregation engine.
 *
 * Works from a static host for every API that sends CORS headers, and uses the
 * bundled local bridge (job_scraper/server.py) to unlock the portals that block
 * browser requests. No sample/fake jobs are produced here: every result comes
 * from a live source or is dropped.
 */
(function (global) {
  'use strict';

  const SOURCE_TIMEOUT = 15000;
  const PROXY_TIMEOUT = 9000;
  const CACHE_TTL = 10 * 60 * 1000;
  const MAX_PER_SOURCE = 40;
  const MAX_TOTAL = 150;
  const FEEDBACK_KEY = 'ai_job_feedback_v1';

  const BOARDS = {
    ashby: ['linear', 'baseten', 'vanta', 'modal', 'replit', 'ramp'],
    greenhouse: ['figma', 'stripe', 'datadog', 'gitlab', 'discord', 'airbnb', 'dropbox'],
    lever: ['spotify', 'outreach'],
    smartrecruiters: ['DeliveryHero', 'Uber']
  };

  /* ------------------------------------------------------------------ */
  /* Text helpers                                                        */
  /* ------------------------------------------------------------------ */

  const ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-',
    mdash: '-', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: '...',
    oslash: 'o', Oslash: 'O', aelig: 'ae', AElig: 'AE', aring: 'a', Aring: 'A',
    auml: 'a', Auml: 'A', ouml: 'o', Ouml: 'O', uuml: 'u', Uuml: 'U',
    eacute: 'e', Eacute: 'E', agrave: 'a', Auml: 'A', szlig: 'ss'
  };

  function decodeEntities(value) {
    return String(value || '')
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
        try { return String.fromCodePoint(parseInt(hex, 16)); } catch (e) { return ''; }
      })
      .replace(/&#(\d+);/g, (_, num) => {
        try { return String.fromCodePoint(parseInt(num, 10)); } catch (e) { return ''; }
      })
      .replace(/&([a-z][a-z0-9]+);/gi, (m, name) => {
        const key = name.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(ENTITIES, key)) return ENTITIES[key];
        return m;
      });
  }

  function stripHtml(value) {
    return decodeEntities(
      String(value || '')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
    )
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanText(value, max) {
    const text = decodeEntities(String(value || ''))
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return max ? text.slice(0, max) : text;
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return String(value).split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }

  function unique(list, max) {
    const seen = Object.create(null);
    const out = [];
    for (const item of list || []) {
      const key = cleanText(item).toLowerCase();
      if (!key || seen[key]) continue;
      seen[key] = 1;
      out.push(cleanText(item));
      if (max && out.length >= max) break;
    }
    return out;
  }

  function absoluteUrl(value, base) {
    if (!value) return '';
    try {
      const url = new URL(decodeEntities(value), base || undefined);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      return url.href;
    } catch (e) {
      return '';
    }
  }

  function isoDate(value) {
    if (!value) return '';
    if (typeof value === 'number') {
      const ms = value > 1e12 ? value : value * 1000;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    const raw = String(value).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
      const [d, m, y] = raw.split('-');
      return `${y}-${m}-${d}`;
    }
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) {
      const [d, m, y] = raw.split('.');
      return `${y}-${m}-${d}`;
    }
    const date = new Date(raw);
    return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  function hash(text) {
    let h = 2166136261;
    const input = String(text || '');
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function tokens(value) {
    const stop = {
      a: 1, an: 1, and: 1, the: 1, of: 1, for: 1, in: 1, at: 1, to: 1, with: 1,
      job: 1, jobs: 1, role: 1, roles: 1, remote: 1
    };
    return unique(
      String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\u00e6\u00f8\u00e5\u00e4\u00f6\u00fc\u00df+#.]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 1 && !stop[t]),
      12
    );
  }

  function inferLanguage(job, source) {
    if (source && source.defaultLanguage) return source.defaultLanguage;
    const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();
    if (/[æøå]/.test(text) || /\b(og|eller|med|hos|stilling|jobbet|ansøg|erfaring)\b/.test(text)) {
      return 'Danish';
    }
    if (/\b(und|oder|mit|bei|bewerbung|erfahrung|stelle)\b/.test(text)) return 'German';
    if (/\b(et|ou|avec|pour|poste|expérience|candidature)\b/.test(text)) return 'French';
    return 'English';
  }

  function inferWorkplace(job) {
    const text = `${job.workplace || ''} ${job.location || ''} ${job.description || ''}`.toLowerCase();
    if (/\bremote\b|work from home|fully remote|distributed/.test(text)) return 'Remote';
    if (/\bhybrid\b/.test(text)) return 'Hybrid';
    return 'On-site';
  }

  function inferSector(job) {
    const text = `${job.title || ''} ${(job.tags || []).join(' ')} ${job.description || ''}`.toLowerCase();
    if (/pharma|biotech|clinical|drug|life science|medtech/.test(text)) return 'Pharma / BioTech';
    if (/green|energy|wind|solar|climate|sustainability/.test(text)) return 'Green Tech & Energy';
    if (/fintech|bank|finance|payment|trading|insurance/.test(text)) return 'FinTech / Enterprise';
    if (/logistics|supply chain|shipping|freight/.test(text)) return 'Logistics & Supply Chain';
    if (/medical device|diagnostic|healthcare/.test(text)) return 'Medical Devices';
    if (/consult|consultancy/.test(text)) return 'IT Consulting';
    return 'Tech & Engineering';
  }

  function inferRoleType(job) {
    const raw = `${job.roleType || ''} ${job.title || ''} ${job.description || ''}`.toLowerCase();
    if (/intern|internship|praktik/.test(raw)) return 'Internship';
    if (/graduate|entry level|junior|nyuddannet/.test(raw)) return 'Graduate';
    if (/part[- ]?time|deltid/.test(raw)) return 'Part-time';
    if (/contract|freelance|consultant|vikariat/.test(raw)) return 'Contract';
    return 'Full-time';
  }

  function salaryText(job) {
    if (job.salary) return cleanText(job.salary, 80);
    const min = Number(job.salaryMin);
    const max = Number(job.salaryMax);
    const currency = job.currency || 'DKK';
    if (min > 0 && max > 0) return `${Math.round(min / 1000)}k-${Math.round(max / 1000)}k ${currency}`;
    if (min > 0) return `${Math.round(min / 1000)}k+ ${currency}`;
    return 'Benchmark available';
  }

  /* ------------------------------------------------------------------ */
  /* JSON / XML helpers                                                  */
  /* ------------------------------------------------------------------ */

  function extractJson(text, marker) {
    const at = String(text || '').indexOf(marker);
    if (at < 0) return null;
    let start = -1;
    let inString = false;
    let escape = false;
    let depth = 0;
    for (let i = at; i < text.length; i++) {
      const c = text[i];
      if (inString) {
        if (escape) escape = false;
        else if (c === '\\') escape = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') inString = true;
      else if (c === '{' || c === '[') {
        if (depth === 0) start = i;
        depth += 1;
      } else if (c === '}' || c === ']') {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          try {
            const raw = text.slice(start, i + 1);
            return JSON.parse(raw, (key, value) => {
              if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
              return value;
            });
          } catch (e) {
            return null;
          }
        }
      }
    }
    return null;
  }

  function parseJson(text) {
    const source = String(text || '').replace(/^\uFEFF/, '').trim();
    try {
      return JSON.parse(source);
    } catch (e) {
      const arrayFirst = source.startsWith('[');
      const first = arrayFirst ? extractJson(source, '[') : extractJson(source, '{');
      if (first) return first;
      const second = arrayFirst ? extractJson(source, '{') : extractJson(source, '[');
      if (second) return second;
      throw new Error('Invalid JSON response');
    }
  }

  function xmlText(node, names) {
    for (const name of names) {
      const el = node.getElementsByTagName(name)[0];
      if (el && el.textContent) return el.textContent;
    }
    return '';
  }

  function parseRss(xml) {
    const text = String(xml || '').trim();
    if (!text) return [];
    if (typeof DOMParser !== 'undefined') {
      try {
        const doc = new DOMParser().parseFromString(text, 'text/xml');
        if (!doc || doc.getElementsByTagName('parsererror').length) return parseRssFallback(text);
        const items = Array.from(doc.getElementsByTagName('item'));
        if (items.length) {
          return items.map((node) => ({
            title: xmlText(node, ['title']),
            link: xmlText(node, ['link']) || xmlText(node, ['guid']),
            description: xmlText(node, ['description', 'content:encoded', 'summary']),
            date: xmlText(node, ['pubDate', 'dc:date', 'updated']),
            author: xmlText(node, ['dc:creator', 'author']),
            company: xmlText(node, ['company', 'dc:creator'])
          }));
        }
        const entries = Array.from(doc.getElementsByTagName('entry'));
        return entries.map((node) => ({
          title: xmlText(node, ['title']),
          link: (node.getElementsByTagName('link')[0] || {}).getAttribute
            ? node.getElementsByTagName('link')[0].getAttribute('href')
            : '',
          description: xmlText(node, ['content', 'summary']),
          date: xmlText(node, ['updated', 'published']),
          author: xmlText(node, ['name']),
          company: ''
        }));
      } catch (e) {
        return parseRssFallback(text);
      }
    }
    return parseRssFallback(text);
  }

  function parseRssFallback(text) {
    const blocks = text.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
    return blocks.map((block) => {
      const pick = (name) => {
        const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
        if (!m) return '';
        return m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '');
      };
      const link = pick('link') || pick('guid');
      return {
        title: pick('title'),
        link,
        description: pick('description') || pick('content:encoded') || pick('summary') || pick('content'),
        date: pick('pubDate') || pick('updated') || pick('published'),
        author: pick('dc:creator') || pick('author'),
        company: ''
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Network / proxy bridge                                              */
  /* ------------------------------------------------------------------ */

  let backendCache;
  let backendInfo = null;

  function timeoutSignal(ms) {
    if (typeof AbortController === 'undefined') return null;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }

  async function detectBackend(force) {
    if (backendCache !== undefined && !force) return backendCache;
    backendCache = null;
    backendInfo = null;
    if (typeof location === 'undefined' || location.protocol === 'file:') {
      backendCache = null;
      return null;
    }
    const bases = ['./', new URL('./', location.href).href];
    for (const base of bases) {
      try {
        const response = await fetch(`${base}api/health`, {
          cache: 'no-store',
          signal: timeoutSignal(3000)
        });
        if (!response.ok) continue;
        const info = await response.json();
        backendCache = base;
        backendInfo = info || {};
        return base;
      } catch (e) {
        /* try next */
      }
    }
    return null;
  }

  function getBackendInfo() {
    return backendInfo;
  }

  async function fetchViaBackend(base, url, options) {
    const response = await fetch(`${base}api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body == null ? null : options.body
      }),
      signal: timeoutSignal(options.timeout || PROXY_TIMEOUT)
    });
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch (e) { /* ignore */ }
      throw new Error(`bridge ${response.status}${detail ? `: ${detail.slice(0, 140)}` : ''}`);
    }
    return response.text();
  }

  const PUBLIC_PROXIES = [
    (url) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://r.jina.ai/${url}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  async function fetchViaPublicProxy(url) {
    let lastError = null;
    for (const build of PUBLIC_PROXIES) {
      try {
        const response = await fetch(build(url), {
          signal: timeoutSignal(PROXY_TIMEOUT),
          headers: { Accept: 'application/json,text/plain,text/html,application/xml,*/*' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (!text || text.length < 2) throw new Error('empty proxy response');
        if (/^\s*(rate limit|too many requests|access denied|just a moment)/i.test(text.slice(0, 80))) {
          throw new Error('proxy blocked');
        }
        return text;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('All public proxies failed');
  }

  async function request(url, options) {
    const opts = options || {};
    if (!opts.proxy) {
      const response = await fetch(url, {
        method: opts.method || 'GET',
        headers: Object.assign({ Accept: 'application/json,text/plain,text/html,application/xml,*/*' }, opts.headers || {}),
        body: opts.body,
        signal: timeoutSignal(opts.timeout || SOURCE_TIMEOUT)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    }

    const backend = await detectBackend();
    if (backend) return fetchViaBackend(backend, url, opts);
    if (opts.bridgeOnly || (opts.method && opts.method !== 'GET')) {
      throw new Error('requires local bridge (run job_scraper/server.py)');
    }
    return fetchViaPublicProxy(url);
  }

  /* ------------------------------------------------------------------ */
  /* Normalization                                                       */
  /* ------------------------------------------------------------------ */

  const SOURCE_INDEX = Object.create(null);

  function makeJob(source, raw) {
    if (!raw) return null;
    const title = cleanText(raw.title, 180);
    const company = cleanText(raw.company, 120) || 'Unknown company';
    if (!title) return null;

    const description = cleanText(raw.description || raw.excerpt || '', 12000);
    const url = absoluteUrl(raw.url, source.baseUrl);
    const location = cleanText(raw.location, 120) || (raw.remote ? 'Remote' : 'Not specified');
    const tags = unique(
      [].concat(raw.tags || [], raw.categories || [], raw.skills || [], raw.jobTypes || [])
        .map((t) => cleanText(t, 40))
        .filter(Boolean),
      10
    );

    const job = {
      id: `${source.id}-${hash(`${url}|${title}|${company}`)}`,
      portal: source.label,
      portalKey: source.portalKey || source.id,
      sourceId: source.id,
      isLive: true,
      title,
      company,
      location,
      sector: raw.sector || source.sector || inferSector({ title, tags, description }),
      roleType: inferRoleType({
        roleType: raw.roleType,
        title,
        description
      }),
      workplace: raw.workplace || inferWorkplace({ workplace: raw.workplace, location, description }),
      deadline: raw.deadline ? isoDate(raw.deadline) : '',
      postedDate: isoDate(raw.posted || raw.date) || '',
      url,
      salaryEstimate: salaryText(raw),
      matchScore: 0,
      tags,
      description: description || `${title} at ${company}. Location: ${location}. Open the original posting for the full description.`,
      language: raw.language || inferLanguage({ title, description }, source)
    };

    if (!job.url) {
      const searchUrl = source.searchUrl
        ? source.searchUrl(title, company)
        : `https://www.google.com/search?q=${encodeURIComponent(`${title} ${company}`)}`;
      job.url = searchUrl;
    }
    return job;
  }

  function matchesQuery(job, query) {
    if (!query) return true;
    const haystack = `${job.title} ${job.company} ${job.description} ${job.tags.join(' ')}`.toLowerCase();
    const queryTokens = tokens(query);
    if (!queryTokens.length) return true;
    return queryTokens.some((token) => haystack.includes(token));
  }

  /* ------------------------------------------------------------------ */
  /* Source adapters                                                     */
  /* ------------------------------------------------------------------ */

  const SOURCES = [
    {
      id: 'remotive',
      label: 'Remotive',
      portalKey: 'remotive',
      region: 'Remote',
      proxy: false,
      async fetch(ctx) {
        const params = new URLSearchParams({ limit: String(MAX_PER_SOURCE) });
        if (ctx.query) params.set('search', ctx.query);
        const data = parseJson(await request(`https://remotive.com/api/remote-jobs?${params}`));
        return (data.jobs || []).slice(0, MAX_PER_SOURCE).map((j) => ({
          title: j.title,
          company: j.company_name,
          url: j.url,
          description: j.description,
          tags: j.tags,
          location: j.candidate_required_location,
          posted: j.publication_date,
          salary: j.salary,
          roleType: j.job_type,
          workplace: 'Remote',
          remote: true
        }));
      }
    },
    {
      id: 'arbeitnow',
      label: 'Arbeitnow',
      portalKey: 'arbeitnow',
      region: 'Europe',
      proxy: false,
      async fetch(ctx) {
        const data = parseJson(await request('https://www.arbeitnow.com/api/job-board-api'));
        return (data.data || []).filter((j) => matchesQuery({
          title: j.title || '', company: j.company_name || '', description: j.description || '', tags: j.tags || []
        }, ctx.query)).slice(0, MAX_PER_SOURCE).map((j) => ({
          title: j.title,
          company: j.company_name,
          url: j.url,
          description: j.description,
          tags: j.tags,
          location: j.location,
          posted: j.created_at,
          roleType: (j.job_types || []).join(', '),
          remote: j.remote,
          workplace: j.remote ? 'Remote' : undefined
        }));
      }
    },
    {
      id: 'jobicy',
      label: 'Jobicy',
      portalKey: 'jobicy',
      region: 'Remote',
      proxy: false,
      async fetch(ctx) {
        const params = new URLSearchParams({ count: String(MAX_PER_SOURCE) });
        if (ctx.query) params.set('tag', ctx.query.split(/\s+/)[0]);
        const data = parseJson(await request(`https://jobicy.com/api/v2/remote-jobs?${params}`));
        return (data.jobs || []).filter((j) => matchesQuery({
          title: j.jobTitle || '', company: j.companyName || '', description: j.jobDescription || '', tags: [j.jobIndustry]
        }, ctx.query)).slice(0, MAX_PER_SOURCE).map((j) => ({
          title: j.jobTitle,
          company: j.companyName,
          url: j.url,
          description: j.jobDescription || j.jobExcerpt,
          tags: [j.jobIndustry, j.jobLevel, j.jobType],
          location: j.jobGeo,
          posted: j.pubDate,
          salaryMin: j.salaryMin,
          salaryMax: j.salaryMax,
          currency: j.salaryCurrency,
          roleType: j.jobType,
          remote: true,
          workplace: 'Remote'
        }));
      }
    },
    {
      id: 'remoteok',
      label: 'Remote OK',
      portalKey: 'remoteok',
      region: 'Remote',
      proxy: false,
      async fetch(ctx) {
        const data = parseJson(await request('https://remoteok.com/api'));
        return (Array.isArray(data) ? data : []).filter((j) => j && j.id && j.position).filter((j) => matchesQuery({
          title: j.position || '', company: j.company || '', description: j.description || '', tags: j.tags || []
        }, ctx.query)).slice(0, MAX_PER_SOURCE).map((j) => ({
          title: j.position,
          company: j.company,
          url: j.apply_url || j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
          description: j.description,
          tags: j.tags,
          location: j.location || 'Remote',
          posted: j.date || j.epoch,
          salaryMin: j.salary_min,
          salaryMax: j.salary_max,
          currency: 'USD',
          remote: true,
          workplace: 'Remote'
        }));
      }
    },
    {
      id: 'hnhiring',
      label: 'HN Who Is Hiring',
      portalKey: 'hnhiring',
      region: 'Global',
      proxy: false,
      async fetch(ctx) {
        const params = new URLSearchParams({
          query: `${ctx.query || 'software'} hiring`,
          tags: 'comment',
          hitsPerPage: '50'
        });
        const data = parseJson(await request(`https://hn.algolia.com/api/v1/search_by_date?${params}`));
        return (data.hits || [])
          .filter((h) => /who is hiring/i.test(h.story_title || ''))
          .map((h) => {
            const text = stripHtml(h.comment_text || '');
            const firstLine = text.split(/\n|\. /).map((s) => s.trim()).filter(Boolean)[0] || '';
            const parts = firstLine.split('|').map((s) => s.trim()).filter(Boolean);
            const rolePattern = /(engineer|developer|designer|scientist|manager|analyst|architect|lead|director|researcher|devops|sre|founder|intern|admin|consultant|specialist|programmer)/i;
            const locationPattern = /^(remote|onsite|on-site|hybrid|in-person|usa?|europe|anywhere)\b|,\s*(usa?|canada|germany|denmark|uk|united kingdom|france|netherlands|sweden|norway|india|australia)\b/i;
            const rolePart = parts.slice(1).find((part) => rolePattern.test(part) && !locationPattern.test(part));
            const firstNonLocation = parts.slice(1).find((part) => !locationPattern.test(part));
            return {
              title: rolePart || firstNonLocation || firstLine.slice(0, 120),
              company: parts[0] || 'HN startup',
              url: `https://news.ycombinator.com/item?id=${h.objectID}`,
              description: text,
              tags: ['HN', 'Hiring'],
              location: parts.find((p) => /remote|onsite|hybrid|,\s*[A-Z]/.test(p)) || 'See posting',
              posted: h.created_at
            };
          })
          .filter((j) => matchesQuery(j, ctx.query))
          .slice(0, MAX_PER_SOURCE);
      }
    },
    {
      id: 'himalayas',
      label: 'Himalayas',
      portalKey: 'himalayas',
      region: 'Remote',
      proxy: true,
      async fetch(ctx) {
        const data = parseJson(await request('https://himalayas.app/jobs/api?limit=100', { proxy: true }));
        return (data.jobs || []).filter((j) => matchesQuery({
          title: j.title || '', company: j.companyName || '', description: j.description || '', tags: j.categories || []
        }, ctx.query)).slice(0, MAX_PER_SOURCE).map((j) => ({
          title: j.title,
          company: j.companyName,
          url: j.applicationLink || j.guid,
          description: j.description || j.excerpt,
          tags: [].concat(j.categories || [], j.parentCategories || []),
          location: (j.locationRestrictions || []).join(', ') || 'Remote',
          posted: j.pubDate,
          remote: true,
          workplace: 'Remote'
        }));
      }
    },
    {
      id: 'freehire',
      label: 'FreeHire (50 ATS)',
      portalKey: 'freehire',
      region: 'Global',
      proxy: true,
      async fetch(ctx) {
        const params = new URLSearchParams({
          limit: String(MAX_PER_SOURCE),
          offset: '0',
          description_format: 'text',
          posted_within_days: '60'
        });
        if (ctx.query) params.set('q', ctx.query);
        const data = parseJson(await request(`https://freehire.me/api/v1/agent/jobs/search?${params}`, { proxy: true }));
        const jobs = data.data || data.jobs || data.results || [];
        return jobs.slice(0, MAX_PER_SOURCE).map((j) => ({
          title: j.title,
          company: j.company,
          url: j.url,
          description: j.description,
          tags: [].concat(j.skills || [], j.collections || [], j.perks || []),
          location: j.location,
          posted: j.posted_at || j.created_at,
          roleType: j.engagement,
          workplace: j.work_mode
        }));
      }
    },
    {
      id: 'jobindex',
      label: 'Jobindex.dk',
      portalKey: 'jobindex',
      region: 'Denmark',
      defaultLanguage: 'Danish',
      baseUrl: 'https://www.jobindex.dk',
      proxy: true,
      searchUrl: (title) => `https://www.jobindex.dk/jobsoegning?q=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const params = new URLSearchParams({ q: ctx.query || '', jobage: '30', sort: 'score' });
        const html = await request(`https://www.jobindex.dk/jobsoegning?${params}`, { proxy: true });
        return parseJobindex(html, this);
      }
    },
    {
      id: 'itjobbank',
      label: 'IT-Jobbank',
      portalKey: 'itjobbank',
      region: 'Denmark',
      defaultLanguage: 'Danish',
      baseUrl: 'https://www.it-jobbank.dk',
      proxy: true,
      searchUrl: (title) => `https://www.it-jobbank.dk/jobsoegning?q=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const params = new URLSearchParams({ q: ctx.query || '', jobage: '30', sort: 'score' });
        const html = await request(`https://www.it-jobbank.dk/jobsoegning?${params}`, { proxy: true });
        return parseJobindex(html, this);
      }
    },
    {
      id: 'jobnet',
      label: 'Jobnet (STAR)',
      portalKey: 'jobnet',
      region: 'Denmark',
      defaultLanguage: 'Danish',
      baseUrl: 'https://jobnet.dk',
      proxy: true,
      bridgeOnly: true,
      searchUrl: (title) => `https://jobnet.dk/find-job?searchString=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const params = new URLSearchParams({
          resultsPerPage: String(MAX_PER_SOURCE),
          pageNumber: '1',
          orderType: 'PublicationDate',
          searchString: ctx.query || ''
        });
        const data = parseJson(await request(`https://jobnet.dk/bff/FindJob/Search?${params}`, {
          proxy: true,
          bridgeOnly: true,
          headers: { 'x-csrf': '1', 'User-Agent': 'Mozilla/5.0 (compatible; job-searsh/1.0)' }
        }));
        return (data.jobAds || []).slice(0, MAX_PER_SOURCE).map((j) => ({
          title: j.title,
          company: j.hiringOrgName,
          url: j.jobAdUrl || `https://jobnet.dk/find-job/${j.jobAdId}`,
          description: j.description,
          tags: [j.occupation, j.jobAnnouncementTypeName],
          location: [j.postalDistrictName, j.municipality].filter(Boolean).join(', ') || j.country,
          posted: j.publicationDate,
          deadline: j.applicationDeadline,
          roleType: j.workHourPartTime ? 'Part-time' : 'Full-time'
        }));
      }
    },
    {
      id: 'jobbank',
      label: 'Akademikernes Jobbank',
      portalKey: 'jobbank',
      region: 'Denmark',
      defaultLanguage: 'Danish',
      proxy: true,
      searchUrl: (title) => `https://jobbank.dk/job?q=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const params = new URLSearchParams({ q: ctx.query || '', per_page: String(MAX_PER_SOURCE) });
        const xml = await request(`https://jobbank.dk/job/rss?${params}`, { proxy: true });
        return parseRss(xml).slice(0, MAX_PER_SOURCE).map((item) => {
          const desc = stripHtml(item.description);
          const companyMatch = desc.match(/\bhos\s+([^,]+)/i);
          return {
            title: item.title.replace(/\s*\|\s*.*$/, ''),
            company: companyMatch ? companyMatch[1] : 'See posting',
            url: item.link,
            description: desc,
            tags: ['Jobbank'],
            location: 'Denmark',
            posted: item.date
          };
        });
      }
    },
    {
      id: 'jobdanmark',
      label: 'Jobdanmark',
      portalKey: 'jobdanmark',
      region: 'Denmark',
      defaultLanguage: 'Danish',
      baseUrl: 'https://jobdanmark.dk',
      proxy: true,
      bridgeOnly: true,
      searchUrl: (title) => `https://jobdanmark.dk/jobsoegning?q=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const body = {
          jobTypes: [],
          filters: ctx.query
            ? [{ type: 'freetext', value: ctx.query, displayText: ctx.query }]
            : [],
          locationMode: 'Text',
          distance: 50
        };
        const data = parseJson(await request('https://jobdanmark.dk/api/jobsearch/search/1', {
          proxy: true,
          bridgeOnly: true,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }));
        return (data.items || []).slice(0, MAX_PER_SOURCE).map((j) => ({
          title: j.title,
          company: j.companyName,
          url: j.url,
          description: `${j.title} hos ${j.companyName}${j.companyAddress ? `, ${j.companyAddress}` : ''}.`,
          tags: j.jobTypes,
          location: j.companyAddress,
          posted: j.publishedDate,
          deadline: j.applicationDeadline,
          roleType: (j.jobTypes || [])[0]
        }));
      }
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      portalKey: 'linkedin',
      region: 'Global',
      baseUrl: 'https://www.linkedin.com',
      proxy: true,
      searchUrl: (title) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const params = new URLSearchParams({
          keywords: ctx.query || '',
          location: ctx.location || 'Denmark',
          start: '0'
        });
        const html = await request(`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`, {
          proxy: true,
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });
        return parseLinkedIn(html, this).slice(0, MAX_PER_SOURCE);
      }
    },
    {
      id: 'ashby',
      label: 'Ashby ATS',
      portalKey: 'ashby',
      region: 'Global',
      proxy: false,
      searchUrl: (title) => `https://jobs.ashbyhq.com/?q=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const results = await Promise.allSettled(BOARDS.ashby.map(async (board) => {
          const data = parseJson(await request(`https://api.ashbyhq.com/posting-api/job-board/${board}`));
          return (data.jobs || []).map((j) => ({
            title: j.title,
            company: board,
            url: j.jobUrl || j.applyUrl,
            description: j.descriptionPlain || j.descriptionHtml || j.description,
            tags: [].concat(j.department || [], j.team || [], j.employmentType || []),
            location: j.location,
            posted: j.publishedAt,
            workplace: j.isRemote ? 'Remote' : undefined,
            remote: j.isRemote,
            sector: j.department
          }));
        }));
        return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
          .filter((j) => matchesQuery(j, ctx.query)).slice(0, MAX_PER_SOURCE);
      }
    },
    {
      id: 'greenhouse',
      label: 'Greenhouse ATS',
      portalKey: 'greenhouse',
      region: 'Global',
      proxy: false,
      searchUrl: (title) => `https://boards.greenhouse.io/?q=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const results = await Promise.allSettled(BOARDS.greenhouse.map(async (board) => {
          const data = parseJson(await request(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=false`));
          return (data.jobs || []).map((j) => ({
            title: j.title,
            company: board,
            url: j.absolute_url,
            description: `${j.title} at ${board}. ${(j.metadata || []).map((m) => `${m.name}: ${m.value}`).join(' ')}`,
            tags: (j.metadata || []).map((m) => m.value).filter(Boolean),
            location: j.location && j.location.name,
            posted: j.updated_at,
            workplace: /remote/i.test((j.location && j.location.name) || '') ? 'Remote' : undefined
          }));
        }));
        return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
          .filter((j) => matchesQuery(j, ctx.query)).slice(0, MAX_PER_SOURCE);
      }
    },
    {
      id: 'lever',
      label: 'Lever ATS',
      portalKey: 'lever',
      region: 'Global',
      proxy: false,
      searchUrl: (title) => `https://jobs.lever.co/?q=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const results = await Promise.allSettled(BOARDS.lever.map(async (board) => {
          const data = parseJson(await request(`https://api.lever.co/v0/postings/${board}?mode=json`));
          return (Array.isArray(data) ? data : []).map((j) => ({
            title: j.text,
            company: board,
            url: j.hostedUrl || j.applyUrl,
            description: j.descriptionPlain || j.description,
            tags: [].concat(j.categories && j.categories.team || [], j.categories && j.categories.commitment || []),
            location: j.categories && j.categories.location,
            posted: j.createdAt,
            workplace: /remote/i.test((j.categories && j.categories.location) || '') ? 'Remote' : undefined
          }));
        }));
        return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
          .filter((j) => matchesQuery(j, ctx.query)).slice(0, MAX_PER_SOURCE);
      }
    },
    {
      id: 'smartrecruiters',
      label: 'SmartRecruiters',
      portalKey: 'smartrecruiters',
      region: 'Global',
      proxy: false,
      searchUrl: (title) => `https://careers.smartrecruiters.com/?q=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const results = await Promise.allSettled(BOARDS.smartrecruiters.map(async (board) => {
          const data = parseJson(await request(`https://api.smartrecruiters.com/v1/companies/${board}/postings?limit=40`));
          return (data.content || []).map((j) => ({
            title: j.name,
            company: (j.company && j.company.name) || board,
            url: `https://jobs.smartrecruiters.com/${board}/${j.id}`,
            description: `${j.name}. ${(j.function && j.function.label) || ''} ${(j.typeOfEmployment && j.typeOfEmployment.label) || ''}`.trim(),
            tags: [j.function && j.function.label, j.typeOfEmployment && j.typeOfEmployment.label, j.experienceLevel && j.experienceLevel.label],
            location: (j.location && (j.location.fullLocation || j.location.city)) || '',
            posted: j.releasedDate,
            roleType: j.typeOfEmployment && j.typeOfEmployment.label,
            workplace: j.location && j.location.remote ? 'Remote' : undefined
          }));
        }));
        return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
          .filter((j) => matchesQuery(j, ctx.query)).slice(0, MAX_PER_SOURCE);
      }
    },
    {
      id: 'weworkremotely',
      label: 'We Work Remotely',
      portalKey: 'weworkremotely',
      region: 'Remote',
      proxy: false,
      searchUrl: (title) => `https://weworkremotely.com/remote-jobs/search?term=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const xml = await request('https://weworkremotely.com/categories/remote-programming-jobs.rss');
        return parseRss(xml).slice(0, MAX_PER_SOURCE).map((item) => {
          const text = stripHtml(item.description);
          const company = (item.title.match(/^([^:]+):/) || [])[1] || 'See posting';
          return {
            title: item.title.replace(/^[^:]+:\s*/, ''),
            company,
            url: item.link,
            description: text,
            tags: ['Remote', 'Programming'],
            location: 'Remote',
            posted: item.date,
            remote: true,
            workplace: 'Remote'
          };
        }).filter((j) => matchesQuery(j, ctx.query));
      }
    },
    {
      id: 'nodesk',
      label: 'NoDesk',
      portalKey: 'nodesk',
      region: 'Remote',
      proxy: true,
      searchUrl: (title) => `https://nodesk.co/remote-jobs/?search=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const xml = await request('https://nodesk.co/remote-jobs/index.xml', { proxy: true });
        return parseRss(xml).slice(0, MAX_PER_SOURCE).map((item) => ({
          title: item.title,
          company: (item.title.match(/at\s+(.+)$/i) || [])[1] || 'See posting',
          url: item.link,
          description: stripHtml(item.description),
          tags: ['Remote'],
          location: 'Remote',
          posted: item.date,
          remote: true,
          workplace: 'Remote'
        })).filter((j) => matchesQuery(j, ctx.query));
      }
    },
    {
      id: 'jobspresso',
      label: 'Jobspresso',
      portalKey: 'jobspresso',
      region: 'Remote',
      proxy: true,
      searchUrl: (title) => `https://jobspresso.co/?s=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const xml = await request('https://jobspresso.co/?feed=job_feed', { proxy: true });
        return parseRss(xml).slice(0, MAX_PER_SOURCE).map((item) => ({
          title: item.title,
          company: (item.title.match(/at\s+(.+)$/i) || [])[1] || 'See posting',
          url: item.link,
          description: stripHtml(item.description),
          tags: ['Remote'],
          location: 'Remote',
          posted: item.date,
          remote: true,
          workplace: 'Remote'
        })).filter((j) => matchesQuery(j, ctx.query));
      }
    },
    {
      id: 'larajobs',
      label: 'LaraJobs',
      portalKey: 'larajobs',
      region: 'Global',
      proxy: true,
      searchUrl: (title) => `https://larajobs.com/?q=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const xml = await request('https://larajobs.com/feed', { proxy: true });
        return parseRss(xml).slice(0, MAX_PER_SOURCE).map((item) => ({
          title: item.title,
          company: (item.title.match(/at\s+(.+)$/i) || [])[1] || 'See posting',
          url: item.link,
          description: stripHtml(item.description),
          tags: ['Laravel', 'PHP'],
          location: 'Remote',
          posted: item.date,
          remote: true,
          workplace: 'Remote'
        })).filter((j) => matchesQuery(j, ctx.query));
      }
    },
    {
      id: 'vuejobs',
      label: 'VueJobs',
      portalKey: 'vuejobs',
      region: 'Remote',
      proxy: true,
      searchUrl: (title) => `https://vuejobs.com/?q=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const xml = await request('https://vuejobs.com/feed', { proxy: true });
        return parseRss(xml).slice(0, MAX_PER_SOURCE).map((item) => ({
          title: item.title,
          company: (item.title.match(/at\s+(.+)$/i) || [])[1] || 'See posting',
          url: item.link,
          description: stripHtml(item.description),
          tags: ['Vue', 'JavaScript'],
          location: 'Remote',
          posted: item.date,
          remote: true,
          workplace: 'Remote'
        })).filter((j) => matchesQuery(j, ctx.query));
      }
    },
    {
      id: 'landingjobs',
      label: 'Landing.jobs',
      portalKey: 'landingjobs',
      region: 'Europe',
      proxy: false,
      searchUrl: (title) => `https://landing.jobs/jobs?query=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const data = parseJson(await request('https://landing.jobs/api/v1/jobs'));
        return (Array.isArray(data) ? data : []).filter((j) => matchesQuery({
          title: j.title || '', company: '', description: j.role_description || '', tags: j.tags || []
        }, ctx.query)).slice(0, MAX_PER_SOURCE).map((j) => ({
          title: j.title,
          company: (j.company && (j.company.name || j.company)) || 'See posting',
          url: absoluteUrl(j.url, 'https://landing.jobs'),
          description: [j.role_description, j.main_requirements, j.nice_to_have].filter(Boolean).join(' '),
          tags: j.tags,
          location: (j.locations || []).map((l) => l.name || l.city || l).join(', ') || (j.remote ? 'Remote' : 'Europe'),
          posted: j.published_at || j.created_at,
          salaryMin: j.gross_salary_low,
          salaryMax: j.gross_salary_high,
          currency: j.currency_code,
          roleType: j.type,
          remote: j.remote,
          workplace: j.remote ? 'Remote' : undefined
        }));
      }
    },
    {
      id: 'teamtailor',
      label: 'Teamtailor',
      portalKey: 'teamtailor',
      region: 'Global',
      proxy: true,
      searchUrl: (title) => `https://career.teamtailor.com/jobs?q=${encodeURIComponent(title)}`,
      async fetch(ctx) {
        const xml = await request('https://career.teamtailor.com/jobs.rss', { proxy: true });
        return parseRss(xml).slice(0, MAX_PER_SOURCE).map((item) => ({
          title: item.title,
          company: item.company || 'See posting',
          url: item.link,
          description: stripHtml(item.description),
          tags: ['Teamtailor'],
          location: 'See posting',
          posted: item.date
        })).filter((j) => matchesQuery(j, ctx.query));
      }
    }
  ];

  SOURCES.forEach((source) => {
    SOURCE_INDEX[source.id] = source;
  });

  /* ------------------------------------------------------------------ */
  /* Portal HTML parsers                                                 */
  /* ------------------------------------------------------------------ */

  function parseJobindex(html, source) {
    const data = extractJson(html, '"searchResponse":');
    if (!data || !Array.isArray(data.results)) return [];
    return data.results.map((result) => {
      const url = result.share_url
        || (result.tid ? `https://www.jobindex.dk/vis-job/${result.tid}` : '')
        || result.url;
      return {
        title: result.headline,
        company: result.companytext || (result.company && result.company.name),
        url,
        description: stripHtml(result.html || '').slice(0, 12000),
        tags: [result.source, result.employment_type].filter(Boolean),
        location: result.area || (result.addresses && result.addresses[0] && result.addresses[0].city) || 'Denmark',
        posted: result.firstdate,
        deadline: result.lastdate,
        remote: result.home_workplace,
        workplace: result.home_workplace ? 'Remote' : undefined,
        sector: result.company && result.company.industry
      };
    }).filter((j) => j.title && j.url);
  }

  function parseLinkedIn(html, source) {
    const text = String(html || '');
    const chunks = text.split(/data-entity-urn="urn:li:jobPosting:/).slice(1);
    return chunks.map((chunk) => {
      const idMatch = chunk.match(/^(\d+)/);
      if (!idMatch) return null;
      const id = idMatch[1];
      const linkMatch = chunk.match(/class="base-card__full-link[^"]*"[^>]*href="([^"]+)"/i);
      let title = '';
      const h3 = chunk.match(/class="base-search-card__title"[^>]*>([\s\S]*?)<\/h3>/i);
      if (h3) title = stripHtml(h3[1]);
      if (!title) {
        const sr = chunk.match(/class="sr-only"[^>]*>([\s\S]*?)<\/span>/i);
        if (sr) title = stripHtml(sr[1]);
      }
      if (!title) return null;
      let company = '';
      const sub = chunk.match(/class="base-search-card__subtitle"[^>]*>([\s\S]*?)<\/h4>/i);
      if (sub) company = stripHtml(sub[1]);
      const loc = chunk.match(/class="job-search-card__location"[^>]*>([\s\S]*?)<\/span>/i);
      const location = loc ? stripHtml(loc[1]) : '';
      const dt = chunk.match(/class="job-search-card__listdate[^"]*"[^>]*datetime="([^"]+)"/i);
      const url = linkMatch ? decodeEntities(linkMatch[1]).split('?')[0] : `https://www.linkedin.com/jobs/view/${id}`;
      return {
        title,
        company,
        url,
        description: `${title} at ${company || 'LinkedIn employer'}${location ? `, ${location}` : ''}. Open the LinkedIn posting for the full description.`,
        tags: ['LinkedIn'],
        location: location || 'See posting',
        posted: dt ? dt[1] : '',
        sector: 'Tech & Engineering'
      };
    }).filter(Boolean);
  }

  /* ------------------------------------------------------------------ */
  /* Scoring & adaptive learning                                         */
  /* ------------------------------------------------------------------ */

  let feedbackCache = null;

  function loadFeedback() {
    if (feedbackCache) return feedbackCache;
    try {
      const parsed = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '{}');
      feedbackCache = {
        positive: parsed.positive || {},
        negative: parsed.negative || {},
        dismissed: parsed.dismissed || {},
        queries: parsed.queries || []
      };
    } catch (e) {
      feedbackCache = { positive: {}, negative: {}, dismissed: {}, queries: [] };
    }
    return feedbackCache;
  }

  function saveFeedback(state) {
    feedbackCache = state;
    try {
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage full is non-fatal */
    }
  }

  const Feedback = {
    record(job, kind) {
      if (!job) return;
      const state = loadFeedback();
      const terms = unique(
        tokens(`${job.title || ''} ${(job.tags || []).join(' ')} ${job.sector || ''}`),
        10
      );
      const sign = kind === 'dismiss' ? -1 : 1;
      const bucket = sign > 0 ? state.positive : state.negative;
      terms.forEach((term) => {
        bucket[term] = (bucket[term] || 0) + sign;
      });
      if (kind === 'dismiss') state.dismissed[job.id] = 1;
      if (kind === 'save' || kind === 'evaluate' || kind === 'apply') {
        const latest = cleanText(`${job.title} ${job.company}`);
        state.queries = unique([latest].concat(state.queries || []), 8);
      }
      saveFeedback(state);
    },
    recordQuery(query) {
      const state = loadFeedback();
      state.queries = unique([cleanText(query)].concat(state.queries || []), 8);
      saveFeedback(state);
    },
    isDismissed(job) {
      return !!loadFeedback().dismissed[job.id];
    },
    weights() {
      const state = loadFeedback();
      const out = Object.create(null);
      Object.keys(state.positive).forEach((k) => {
        out[k] = (out[k] || 0) + state.positive[k];
      });
      Object.keys(state.negative).forEach((k) => {
        out[k] = (out[k] || 0) + Math.min(state.negative[k], 0);
      });
      return out;
    },
    learnedQueries(candidate, limit) {
      const state = loadFeedback();
      const fromJobs = (state.queries || []).slice(0, 3);
      const skills = (candidate && (candidate.primarySkills || []).slice(0, 2)) || [];
      return unique(fromJobs.concat(skills), limit || 4);
    }
  };

  function scoreJob(job, candidate, query, location) {
    const text = `${job.title} ${job.description} ${(job.tags || []).join(' ')}`.toLowerCase();
    const skills = [].concat(
      (candidate && candidate.primarySkills) || [],
      (candidate && candidate.secondarySkills) || []
    );
    let hits = 0;
    let relevant = 0;
    skills.forEach((skill) => {
      const words = tokens(skill);
      if (!words.length) return;
      if (words.some((word) => text.includes(word))) {
        hits += 1;
        if (tokens(job.title).some((word) => words.includes(word))) relevant += 1;
      }
    });
    const skillsScore = Math.min(hits / Math.max(5, skills.length * 0.45), 1) * 42;
    const titleScore = Math.min(relevant, 3) * 4;
    const queryTokens = tokens(query);
    const queryHits = queryTokens.filter((token) => text.includes(token)).length;
    const queryScore = queryTokens.length ? Math.min(queryHits / queryTokens.length, 1) * 8 : 0;

    let learned = 0;
    const weights = Feedback.weights();
    Object.keys(weights).forEach((term) => {
      if (weights[term] > 0 && text.includes(term)) learned += Math.min(weights[term], 1.5);
      if (weights[term] < 0 && text.includes(term)) learned -= Math.min(Math.abs(weights[term]), 1);
    });

    let locationScore = 0;
    if (location) {
      const loc = location.toLowerCase().split(',')[0].trim();
      if (loc && job.location && job.location.toLowerCase().includes(loc)) locationScore = 8;
      else if (job.workplace === 'Remote') locationScore = 4;
    }

    const recency = job.postedDate
      ? Math.max(0, 5 - Math.floor((Date.now() - new Date(job.postedDate).getTime()) / 86400000 / 14))
      : 0;

    const score = 44 + skillsScore + titleScore + queryScore + Math.max(-5, Math.min(8, learned)) + locationScore + recency;
    return Math.max(35, Math.min(99, Math.round(score)));
  }

  /* ------------------------------------------------------------------ */
  /* Aggregation                                                         */
  /* ------------------------------------------------------------------ */

  const cache = new Map();

  function cacheKey(sourceId, query, location) {
    return `${sourceId}|${String(query || '').toLowerCase()}|${String(location || '').toLowerCase()}`;
  }

  function dedupe(jobs) {
    const byUrl = new Map();
    const byTitle = new Map();
    const out = [];
    for (const job of jobs) {
      if (!job || !job.title) continue;
      const urlKey = job.url
        .replace(/^https?:\/\/(www\.)?/i, '')
        .replace(/[?#].*$/, '')
        .replace(/\/+$/, '')
        .toLowerCase();
      const titleKey = `${job.title.toLowerCase().replace(/\W+/g, ' ').trim()}|${job.company.toLowerCase().replace(/\W+/g, ' ').trim()}`;
      const existing = byUrl.get(urlKey) || byTitle.get(titleKey);
      if (existing) {
        if (!existing.description || existing.description.length < (job.description || '').length) {
          existing.description = job.description || existing.description;
        }
        existing.tags = unique([].concat(existing.tags || [], job.tags || []), 10);
        if (!existing.postedDate && job.postedDate) existing.postedDate = job.postedDate;
        continue;
      }
      byUrl.set(urlKey, job);
      byTitle.set(titleKey, job);
      out.push(job);
    }
    return out;
  }

  async function runSource(source, ctx) {
    const key = cacheKey(source.id, ctx.query, ctx.location);
    const cached = cache.get(key);
    if (!ctx.force && cached && Date.now() - cached.at < CACHE_TTL) {
      return { jobs: cached.jobs, cached: true };
    }

    const raw = await source.fetch(ctx);
    const jobs = [];
    for (const item of raw || []) {
      const job = makeJob(source, item);
      if (job && !Feedback.isDismissed(job)) jobs.push(job);
      if (jobs.length >= MAX_PER_SOURCE) break;
    }
    cache.set(key, { at: Date.now(), jobs });
    return { jobs, cached: false };
  }

  function defaultQuery(candidate) {
    if (!candidate) return 'AI Engineer';
    const title = cleanText(candidate.title || '');
    const short = title.split(/\s*[|&]\s*/)[0].trim();
    if (short) return short;
    const skill = (candidate.primarySkills || [])[0];
    return skill || 'AI Engineer';
  }

  function defaultLocation(candidate) {
    if (!candidate) return 'Copenhagen, Denmark';
    return cleanText((candidate.location || 'Copenhagen, Denmark').split('/')[0].replace(/\(.*?\)/g, ''));
  }

  async function search(options) {
    const opts = options || {};
    const candidate = opts.candidate || null;
    const query = cleanText(opts.query || defaultQuery(candidate));
    const location = cleanText(opts.location || defaultLocation(candidate));
    const ids = Array.isArray(opts.sources) && opts.sources.length
      ? opts.sources
      : (opts.enabledSources || null);

    await detectBackend();
    Feedback.recordQuery(query);

    const active = SOURCES.filter((source) => {
      if (ids && ids.indexOf(source.id) === -1) return false;
      return true;
    });

    const statuses = {};
    const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;

    const tasks = active.map(async (source) => {
      const started = Date.now();
      statuses[source.id] = {
        id: source.id,
        label: source.label,
        status: 'running',
        count: 0,
        error: '',
        ms: 0
      };
      if (onProgress) onProgress(statuses[source.id]);
      try {
        const result = await runSource(source, {
          query,
          location,
          force: !!opts.force
        });
        statuses[source.id] = {
          id: source.id,
          label: source.label,
          status: 'ok',
          count: result.jobs.length,
          error: '',
          cached: result.cached,
          ms: Date.now() - started
        };
        if (onProgress) onProgress(statuses[source.id]);
        return result.jobs;
      } catch (error) {
        statuses[source.id] = {
          id: source.id,
          label: source.label,
          status: 'error',
          count: 0,
          error: cleanText(error && error.message ? error.message : 'request failed', 160),
          ms: Date.now() - started
        };
        if (onProgress) onProgress(statuses[source.id]);
        return [];
      }
    });

    const settled = await Promise.allSettled(tasks);
    const all = settled.flatMap((item) => (item.status === 'fulfilled' ? item.value : []));
    const deduped = dedupe(all);
    const scored = deduped.map((job) => Object.assign(job, {
      matchScore: scoreJob(job, candidate, query, location)
    }));
    scored.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return String(b.postedDate).localeCompare(String(a.postedDate));
    });

    const okCount = Object.keys(statuses).filter((id) => statuses[id].status === 'ok').length;
    return {
      jobs: scored.slice(0, opts.limit || MAX_TOTAL),
      sources: statuses,
      query,
      location,
      backend: !!backendCache,
      backendInfo,
      okSources: okCount,
      totalSources: active.length,
      fetchedAt: new Date().toISOString()
    };
  }

  async function health() {
    const backend = await detectBackend(true);
    return {
      backend: !!backend,
      backendInfo,
      sources: SOURCES.map((s) => ({
        id: s.id,
        label: s.label,
        region: s.region,
        proxy: !!s.proxy,
        bridgeOnly: !!s.bridgeOnly
      }))
    };
  }

  global.ScraperEngine = {
    SOURCES,
    BOARDS,
    Feedback,
    search,
    health,
    detectBackend,
    getBackendInfo,
    defaultQuery,
    defaultLocation,
    scoreJob,
    makeJob,
    stripHtml,
    cleanText,
    isoDate,
    parseRss
  };
})(window);
