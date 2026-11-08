/**
 * AI Job Search - Main Application Controller
 * Handles tabs, interactive tools, scoring logic, salary lookup,
 * document generation, Kanban board, SVG charts, and persistence.
 */

// Application State
const AppState = {
  theme: localStorage.getItem('ai_job_theme') || 'dark',
  currentTab: 'dashboard',
  candidate: JSON.parse(localStorage.getItem('ai_job_candidate')) || DEFAULT_CANDIDATE,
  jobs: JSON.parse(localStorage.getItem('ai_job_jobs')) || SAMPLE_JOBS,
  applications: JSON.parse(localStorage.getItem('ai_job_applications')) || SAMPLE_APPLICATIONS,
  salaryData: JSON.parse(localStorage.getItem('ai_job_salary')) || SALARY_BENCHMARKS,
  interviewData: JSON.parse(localStorage.getItem('ai_job_interview')) || INTERVIEW_PREP_DATA,
  upskillCatalog: JSON.parse(localStorage.getItem('ai_job_upskill')) || UPSKILL_CATALOG,
  selectedJobForEvaluation: null,
  selectedJobForTailoring: null,
  activeCurrency: 'DKK',
  currencyRates: { DKK: 1, EUR: 0.134, USD: 0.145 }
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initDashboard();
  initScraperTool();
  initRankerTool();
  initTailorStudio();
  initSalaryLookup();
  initTrackerBoard();
  initInterviewCoach();
  initUpskillLab();
  initProfileManager();
  initCliGuide();

  // Handle URL hash navigation
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
});

// Theme Management
function initTheme() {
  document.documentElement.setAttribute('data-theme', AppState.theme);
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    updateThemeIcon(themeToggleBtn);
    themeToggleBtn.addEventListener('click', () => {
      AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', AppState.theme);
      localStorage.setItem('ai_job_theme', AppState.theme);
      updateThemeIcon(themeToggleBtn);
      renderDashboardCharts(); // Redraw SVG charts for theme contrast
    });
  }
}

function updateThemeIcon(btn) {
  if (AppState.theme === 'dark') {
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <span>Light Mode</span>`;
  } else {
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <span>Dark Mode</span>`;
  }
}

// Navigation & Tab Switching
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link[data-tab]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');
      switchTab(tabId);
      window.location.hash = tabId;
    });
  });

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mainNav = document.getElementById('main-nav');
  if (mobileToggle && mainNav) {
    mobileToggle.addEventListener('click', () => {
      mainNav.classList.toggle('nav-open');
    });
  }
}

function switchTab(tabId) {
  AppState.currentTab = tabId;

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-tab') === tabId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update tab sections
  document.querySelectorAll('.tab-section').forEach(section => {
    if (section.id === `tab-${tabId}`) {
      section.classList.add('active-tab');
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      section.classList.remove('active-tab');
    }
  });

  // Refresh tab-specific views if needed
  if (tabId === 'dashboard') {
    renderDashboardStats();
    renderDashboardCharts();
  } else if (tabId === 'tracker') {
    renderTrackerBoard();
  }
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(`tab-${hash}`)) {
    switchTab(hash);
  }
}

// ==========================================
// 1. DASHBOARD & ANALYTICS OVERVIEW
// ==========================================
function initDashboard() {
  renderDashboardStats();
  renderDashboardCharts();

  // Reset to default sample data button
  const resetBtn = document.getElementById('reset-demo-data-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset application data to initial sample dataset?')) {
        localStorage.removeItem('ai_job_applications');
        localStorage.removeItem('ai_job_jobs');
        localStorage.removeItem('ai_job_candidate');
        AppState.applications = [...SAMPLE_APPLICATIONS];
        AppState.jobs = [...SAMPLE_JOBS];
        AppState.candidate = { ...DEFAULT_CANDIDATE };
        renderDashboardStats();
        renderDashboardCharts();
        renderJobsList();
        renderTrackerBoard();
        alert('Data successfully restored to default sample state.');
      }
    });
  }
}

function renderDashboardStats() {
  const apps = AppState.applications;
  const total = apps.length;
  const active = apps.filter(a => a.status === 'applied').length;
  const interview = apps.filter(a => a.status === 'interview').length;
  const offer = apps.filter(a => a.status === 'offer').length;
  const hired = apps.filter(a => a.status === 'hired').length;
  const drafted = apps.filter(a => a.status === 'drafted').length;
  const closed = apps.filter(a => ['rejected', 'withdrawn', 'no_response'].includes(a.status)).length;

  // Sent applications exclude 'drafted'
  const sent = total - drafted;
  const interviewRate = sent > 0 ? Math.round(((interview + offer + hired) / sent) * 100) : 0;
  const offerRate = sent > 0 ? Math.round(((offer + hired) / sent) * 100) : 0;

  const statSent = document.getElementById('stat-sent-count');
  const statActive = document.getElementById('stat-active-count');
  const statInterview = document.getElementById('stat-interview-count');
  const statOffers = document.getElementById('stat-offer-count');
  const statInterviewRate = document.getElementById('stat-interview-rate');
  const statHired = document.getElementById('stat-hired-count');

  if (statSent) statSent.innerText = sent;
  if (statActive) statActive.innerText = active;
  if (statInterview) statInterview.innerText = interview;
  if (statOffers) statOffers.innerText = offer;
  if (statInterviewRate) statInterviewRate.innerText = `${interviewRate}%`;
  if (statHired) statHired.innerText = hired;
}

function renderDashboardCharts() {
  const apps = AppState.applications;
  renderStatusDoughnut(apps);
  renderSectorBarChart(apps);
  renderFunnelProgress(apps);
}

// Interactive SVG Doughnut Chart
function renderStatusDoughnut(apps) {
  const container = document.getElementById('status-doughnut-container');
  if (!container) return;

  const statusCounts = {
    'Interview': apps.filter(a => a.status === 'interview').length,
    'Active': apps.filter(a => a.status === 'applied').length,
    'Offer': apps.filter(a => a.status === 'offer').length,
    'Hired': apps.filter(a => a.status === 'hired').length,
    'Drafted': apps.filter(a => a.status === 'drafted').length,
    'Closed': apps.filter(a => ['rejected', 'withdrawn', 'no_response'].includes(a.status)).length
  };

  const colors = {
    'Interview': '#2A9D8F',
    'Active': '#4EA8DE',
    'Offer': '#E76F51',
    'Hired': '#52B788',
    'Drafted': '#E9C46A',
    'Closed': '#6C757D'
  };

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    container.innerHTML = '<p class="empty-hint">No application data available</p>';
    return;
  }

  // Generate SVG arcs
  let accumulatedAngle = 0;
  const radius = 64;
  const cx = 100;
  const cy = 100;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  let paths = '';
  let legendItems = '';

  for (const [status, count] of Object.entries(statusCounts)) {
    if (count === 0) continue;
    const ratio = count / total;
    const strokeDasharray = `${ratio * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    const color = colors[status] || '#999';

    paths += `
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${strokeDasharray}"
        stroke-dashoffset="${strokeDashoffset}"
        transform="rotate(-90 ${cx} ${cy})"
        class="chart-segment"
        data-status="${status}"
        data-count="${count}"
        data-percent="${Math.round(ratio * 100)}%">
        <title>${status}: ${count} (${Math.round(ratio * 100)}%)</title>
      </circle>
    `;

    legendItems += `
      <div class="legend-item">
        <span class="legend-dot" style="background-color: ${color}"></span>
        <span class="legend-label">${status}</span>
        <span class="legend-value">${count} <small>(${Math.round(ratio * 100)}%)</small></span>
      </div>
    `;

    accumulatedAngle += ratio;
  }

  container.innerHTML = `
    <div class="doughnut-wrapper">
      <svg viewBox="0 0 200 200" width="180" height="180" class="doughnut-svg">
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="var(--border-subtle)" stroke-width="${strokeWidth}" />
        ${paths}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="22" font-weight="700" fill="var(--text-main)">${total}</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="11" font-weight="500" fill="var(--text-muted)">APPLICATIONS</text>
      </svg>
      <div class="doughnut-legend">
        ${legendItems}
      </div>
    </div>
  `;
}

// Interactive SVG Sector Bar Chart
function renderSectorBarChart(apps) {
  const container = document.getElementById('sector-chart-container');
  if (!container) return;

  const sectorCounts = {};
  apps.forEach(a => {
    const sec = a.sector || 'Other';
    sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
  });

  const sortedSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...Object.values(sectorCounts), 1);

  let barsHtml = '';
  sortedSectors.forEach(([sector, count]) => {
    const percent = Math.round((count / maxCount) * 100);
    barsHtml += `
      <div class="chart-bar-row">
        <div class="bar-label-wrap">
          <span class="bar-label" title="${escapeHtml(sector)}">${escapeHtml(sector)}</span>
          <span class="bar-count">${count}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${percent}%;"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = `<div class="bar-chart-list">${barsHtml}</div>`;
}

// Funnel Progression Rates
function renderFunnelProgress(apps) {
  const container = document.getElementById('funnel-progress-container');
  if (!container) return;

  const totalSent = apps.filter(a => a.status !== 'drafted').length;
  const reachedInterview = apps.filter(a => ['interview', 'offer', 'hired'].includes(a.status)).length;
  const reachedOffer = apps.filter(a => ['offer', 'hired'].includes(a.status)).length;
  const hired = apps.filter(a => a.status === 'hired').length;

  const steps = [
    { name: '1. Applications Sent', count: totalSent, pct: totalSent > 0 ? 100 : 0, color: 'var(--primary)' },
    { name: '2. First Interview', count: reachedInterview, pct: totalSent > 0 ? Math.round((reachedInterview / totalSent) * 100) : 0, color: 'var(--accent-teal)' },
    { name: '3. Final / Offer Stage', count: reachedOffer, pct: totalSent > 0 ? Math.round((reachedOffer / totalSent) * 100) : 0, color: 'var(--accent-coral)' },
    { name: '4. Contract Hired', count: hired, pct: totalSent > 0 ? Math.round((hired / totalSent) * 100) : 0, color: 'var(--accent-green)' }
  ];

  let html = '<div class="funnel-steps-list">';
  steps.forEach(step => {
    html += `
      <div class="funnel-step-item">
        <div class="funnel-step-header">
          <span class="funnel-step-title">${step.name}</span>
          <span class="funnel-step-metric"><strong>${step.count}</strong> (${step.pct}%)</span>
        </div>
        <div class="funnel-bar-track">
          <div class="funnel-bar-fill" style="width: ${step.pct}%; background-color: ${step.color};"></div>
        </div>
      </div>
    `;
  });
  html += '</div>';

  container.innerHTML = html;
}

// ==========================================
// 2. JOB SCRAPER & PORTAL SEARCH TOOL
// ==========================================
function initScraperTool() {
  renderJobsList();

  // Search input and filter listeners
  const searchInput = document.getElementById('scraper-search-input');
  const portalFilter = document.getElementById('scraper-portal-filter');
  const languageFilter = document.getElementById('scraper-language-filter');
  const sectorFilter = document.getElementById('scraper-sector-filter');
  const workplaceFilter = document.getElementById('scraper-workplace-filter');

  const triggerFilter = () => renderJobsList();

  if (searchInput) searchInput.addEventListener('input', triggerFilter);
  if (portalFilter) portalFilter.addEventListener('change', triggerFilter);
  if (languageFilter) languageFilter.addEventListener('change', triggerFilter);
  if (sectorFilter) sectorFilter.addEventListener('change', triggerFilter);
  if (workplaceFilter) workplaceFilter.addEventListener('change', triggerFilter);

  // Manual Job Importer Form
  const importForm = document.getElementById('manual-job-import-form');
  if (importForm) {
    importForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('import-job-title').value.trim();
      const company = document.getElementById('import-job-company').value.trim();
      const portal = document.getElementById('import-job-portal').value;
      const location = document.getElementById('import-job-location').value.trim() || 'Copenhagen';
      const sector = document.getElementById('import-job-sector').value.trim() || 'Tech & Engineering';
      const url = document.getElementById('import-job-url').value.trim() || 'https://example.com/job';
      const description = document.getElementById('import-job-description').value.trim();

      if (!title || !company || !description) {
        alert('Please fill out the job title, company name, and description.');
        return;
      }

      // Compute simple automated match score based on candidate skills
      const matchScore = calculateQuickMatch(description);

      const newJob = {
        id: `job-custom-${Date.now()}`,
        portal: portal,
        portalKey: portal.toLowerCase().replace(/\s+/g, ''),
        title: title,
        company: company,
        location: location,
        sector: sector,
        roleType: 'Full-time',
        workplace: 'Hybrid',
        deadline: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
        postedDate: new Date().toISOString().split('T')[0],
        url: url,
        salaryEstimate: 'Market standard',
        matchScore: matchScore,
        tags: ['Custom', 'Imported'],
        description: description
      };

      AppState.jobs.unshift(newJob);
      localStorage.setItem('ai_job_jobs', JSON.stringify(AppState.jobs));
      renderJobsList();
      importForm.reset();
      alert(`Job "${title}" at ${company} was added to your search results! Match rating: ${matchScore}%.`);
    });
  }
}

function calculateQuickMatch(text) {
  const textLower = text.toLowerCase();
  const skills = AppState.candidate.primarySkills.concat(AppState.candidate.secondarySkills);
  let hits = 0;
  skills.forEach(skill => {
    if (textLower.includes(skill.toLowerCase())) hits++;
  });
  const ratio = Math.min(hits / 5, 1.0);
  return Math.round(65 + ratio * 32);
}

function renderJobsList() {
  const container = document.getElementById('scraped-jobs-container');
  if (!container) return;

  const searchQuery = (document.getElementById('scraper-search-input')?.value || '').toLowerCase();
  const portalVal = document.getElementById('scraper-portal-filter')?.value || 'all';
  const languageVal = document.getElementById('scraper-language-filter')?.value || 'all';
  const sectorVal = document.getElementById('scraper-sector-filter')?.value || 'all';
  const workplaceVal = document.getElementById('scraper-workplace-filter')?.value || 'all';

  const filtered = AppState.jobs.filter(job => {
    const matchesSearch = !searchQuery ||
      job.title.toLowerCase().includes(searchQuery) ||
      job.company.toLowerCase().includes(searchQuery) ||
      job.description.toLowerCase().includes(searchQuery) ||
      job.tags.some(t => t.toLowerCase().includes(searchQuery));

    const matchesPortal = portalVal === 'all' || 
      job.portal.toLowerCase().includes(portalVal.toLowerCase()) || 
      (job.portalKey && job.portalKey.toLowerCase().includes(portalVal.toLowerCase()));

    const matchesLanguage = languageVal === 'all' || 
      (job.language && job.language.toLowerCase() === languageVal.toLowerCase()) ||
      (languageVal === 'English' && (!job.language || job.language === 'English'));

    const matchesSector = sectorVal === 'all' || job.sector === sectorVal;
    const matchesWorkplace = workplaceVal === 'all' || job.workplace.toLowerCase().includes(workplaceVal);

    return matchesSearch && matchesPortal && matchesLanguage && matchesSector && matchesWorkplace;
  });

  const countBadge = document.getElementById('scraped-count-badge');
  if (countBadge) countBadge.innerText = `${filtered.length} postings found`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">🔍</div>
        <h3>No matching jobs found</h3>
        <p>Try broadening your search keywords or portal filters, or paste a new job description below.</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(job => {
    const matchClass = job.matchScore >= 90 ? 'match-high' : (job.matchScore >= 80 ? 'match-medium' : 'match-low');
    const tagsHtml = job.tags.map(t => `<span class="badge tag-badge">${escapeHtml(t)}</span>`).join('');

    html += `
      <div class="job-card" data-job-id="${job.id}">
        <div class="job-card-header">
          <div class="job-title-group">
            <div class="job-portal-badge"><span class="portal-indicator"></span>${escapeHtml(job.portal)}</div>
            <h3 class="job-card-title">${escapeHtml(job.title)}</h3>
            <div class="job-company-location">
              <strong>${escapeHtml(job.company)}</strong> &bull; <span>${escapeHtml(job.location)}</span> &bull; <em>${escapeHtml(job.workplace)}</em>
            </div>
          </div>
          <div class="match-score-badge ${matchClass}" title="Algorithmic Fit Score">
            <span class="match-score-num">${job.matchScore}%</span>
            <span class="match-score-label">Fit Score</span>
          </div>
        </div>

        <div class="job-card-meta">
          <span>📅 Deadline: ${job.deadline || 'Open'}</span>
          <span>💼 ${escapeHtml(job.sector)}</span>
          <span>💰 ${escapeHtml(job.salaryEstimate || 'Benchmark available')}</span>
        </div>

        <div class="job-tags-list">
          ${tagsHtml}
        </div>

        <div class="job-card-footer">
          <button class="btn btn-sm btn-secondary view-job-desc-btn" data-id="${job.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            Full Description
          </button>
          <button class="btn btn-sm btn-primary evaluate-job-btn" data-id="${job.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
            Evaluate Fit (/rank)
          </button>
          <button class="btn btn-sm btn-coral tailor-job-btn" data-id="${job.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Tailor Application (/apply)
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Add click listeners to job cards
  container.querySelectorAll('.view-job-desc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const job = AppState.jobs.find(j => j.id === id);
      if (job) showJobModal(job);
    });
  });

  container.querySelectorAll('.evaluate-job-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const job = AppState.jobs.find(j => j.id === id);
      if (job) {
        loadJobIntoRanker(job);
        switchTab('ranker');
        window.location.hash = 'ranker';
      }
    });
  });

  container.querySelectorAll('.tailor-job-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const job = AppState.jobs.find(j => j.id === id);
      if (job) {
        loadJobIntoTailorStudio(job);
        switchTab('tailor');
        window.location.hash = 'tailor';
      }
    });
  });
}

function showJobModal(job) {
  const modal = document.getElementById('job-detail-modal');
  if (!modal) return;

  document.getElementById('modal-job-title').innerText = job.title;
  document.getElementById('modal-job-company').innerText = `${job.company} • ${job.location} • ${job.portal}`;
  document.getElementById('modal-job-body').innerText = job.description;

  const linkEl = document.getElementById('modal-job-link');
  if (linkEl) linkEl.href = job.url;

  const evalBtn = document.getElementById('modal-eval-btn');
  if (evalBtn) {
    evalBtn.onclick = () => {
      modal.classList.remove('modal-active');
      loadJobIntoRanker(job);
      switchTab('ranker');
      window.location.hash = 'ranker';
    };
  }

  const tailorBtn = document.getElementById('modal-tailor-btn');
  if (tailorBtn) {
    tailorBtn.onclick = () => {
      modal.classList.remove('modal-active');
      loadJobIntoTailorStudio(job);
      switchTab('tailor');
      window.location.hash = 'tailor';
    };
  }

  modal.classList.add('modal-active');

  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.onclick = () => modal.classList.remove('modal-active');
}

// ==========================================
// 3. FIT EVALUATION & POSTING GUARD (/rank)
// ==========================================
function initRankerTool() {
  populateRankerJobSelector();

  const jobSelect = document.getElementById('ranker-job-selector');
  if (jobSelect) {
    jobSelect.addEventListener('change', () => {
      const jobId = jobSelect.value;
      const job = AppState.jobs.find(j => j.id === jobId);
      if (job) {
        loadJobIntoRanker(job);
      }
    });
  }

  // Dimension sliders change listeners
  const sliders = document.querySelectorAll('.dimension-slider');
  sliders.forEach(slider => {
    slider.addEventListener('input', () => {
      updateRankerScore();
    });
  });

  // Analyze Custom Text button
  const analyzeBtn = document.getElementById('run-custom-rank-btn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      const customText = document.getElementById('ranker-job-text').value;
      if (!customText.trim()) {
        alert('Please paste a job description to evaluate.');
        return;
      }
      runFullJobEvaluation(customText);
    });
  }

  // Guard Check Run Button
  const guardBtn = document.getElementById('run-guard-check-btn');
  if (guardBtn) {
    guardBtn.addEventListener('click', () => {
      const text = document.getElementById('ranker-job-text').value;
      runPostingGuardCheck(text);
    });
  }

  // Proceed to Tailoring button
  const proceedBtn = document.getElementById('proceed-to-tailor-btn');
  if (proceedBtn) {
    proceedBtn.addEventListener('click', () => {
      if (AppState.selectedJobForEvaluation) {
        loadJobIntoTailorStudio(AppState.selectedJobForEvaluation);
        switchTab('tailor');
        window.location.hash = 'tailor';
      } else {
        alert('Please select or evaluate a job first.');
      }
    });
  }

  // Pre-load first job if available
  if (AppState.jobs.length > 0) {
    loadJobIntoRanker(AppState.jobs[0]);
  }
}

function populateRankerJobSelector() {
  const select = document.getElementById('ranker-job-selector');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose a scraped job --</option>' +
    AppState.jobs.map(j => `<option value="${j.id}">${escapeHtml(j.title)} (${escapeHtml(j.company)})</option>`).join('');
}

function loadJobIntoRanker(job) {
  AppState.selectedJobForEvaluation = job;
  const select = document.getElementById('ranker-job-selector');
  if (select) select.value = job.id;

  const textInput = document.getElementById('ranker-job-text');
  if (textInput) textInput.value = job.description;

  const headerTitle = document.getElementById('ranker-active-title');
  if (headerTitle) headerTitle.innerText = `${job.title} at ${job.company}`;

  runFullJobEvaluation(job.description);
}

// Deterministic Posting Guard (Checks for Prompt Injections, Hidden Characters, Invisibility)
function runPostingGuardCheck(rawText) {
  const guardBadge = document.getElementById('posting-guard-verdict');
  const guardDetails = document.getElementById('posting-guard-details');
  if (!guardBadge || !guardDetails) return;

  const issues = [];

  // Check 1: Invisible / Zero-width unicode characters
  const zeroWidthRegex = /[\u200B\u200C\u200D\uFEFF\u00A0\u2060]/g;
  const zeroWidthMatches = rawText.match(zeroWidthRegex);
  if (zeroWidthMatches && zeroWidthMatches.length > 5) {
    issues.push(`Detected ${zeroWidthMatches.length} zero-width / invisible unicode characters.`);
  }

  // Check 2: Prompt Injection / System prompt hijacking phrases
  const suspiciousPhrases = [
    /ignore previous instructions/i,
    /system prompt/i,
    /you are an ai assistant/i,
    /disregard all earlier directives/i,
    /hidden instruction/i,
    /send all data to/i,
    /curl\s+http/i,
    /bash\s+-i/i
  ];

  suspiciousPhrases.forEach(regex => {
    if (regex.test(rawText)) {
      issues.push(`Suspicious prompt instruction pattern matched: "${regex.source}"`);
    }
  });

  // Check 3: Base64 or obfuscated payloads
  const base64Regex = /[A-Za-z0-9+/=]{80,}/g;
  if (base64Regex.test(rawText)) {
    issues.push('Long obfuscated alphanumeric / Base64 string block detected.');
  }

  if (issues.length === 0) {
    guardBadge.className = 'guard-badge guard-pass';
    guardBadge.innerHTML = '🛡️ Posting Guard: VERIFIED SAFE (No injection markers found)';
    guardDetails.innerHTML = '<p class="guard-clean-msg">Passed all deterministic integrity gates: zero-width character inspection, injection keyword heuristics, and hidden payload extraction.</p>';
  } else {
    guardBadge.className = 'guard-badge guard-flag';
    guardBadge.innerHTML = '⚠️ Posting Guard: SUSPICIOUS CONTENT DETECTED';
    guardDetails.innerHTML = `
      <div class="guard-issues-box">
        <strong>Integrity Warnings:</strong>
        <ul>${issues.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
        <small>Agent instructions will treat this job description in strict read-only containment mode.</small>
      </div>
    `;
  }
}

function runFullJobEvaluation(text) {
  runPostingGuardCheck(text);

  const textLower = text.toLowerCase();
  const candidate = AppState.candidate;

  // 1. Technical Competence Scoring (40%)
  const primaryMatches = candidate.primarySkills.filter(s => textLower.includes(s.toLowerCase()));
  const secondaryMatches = candidate.secondarySkills.filter(s => textLower.includes(s.toLowerCase()));
  const techScore = Math.min(100, Math.round((primaryMatches.length / 4) * 70 + (secondaryMatches.length / 2) * 30));

  // 2. Experience & Seniority Scope (20%)
  let expScore = 85;
  if (textLower.includes('lead') || textLower.includes('senior') || textLower.includes('principal')) {
    expScore = 90;
  }
  if (textLower.includes('10+ years') || textLower.includes('director')) {
    expScore = 70;
  }

  // 3. Behavioral & Culture Alignment (15%)
  let behaviorScore = 88;
  if (textLower.includes('collaboration') || textLower.includes('cross-functional') || textLower.includes('curiosity')) {
    behaviorScore = 95;
  }

  // 4. Career Trajectory & Motivation (15%)
  let trajectoryScore = 92;

  // 5. Practical Constraints & Language Gate (10%)
  let practicalScore = 95;
  let hasDealbreaker = false;
  let dealbreakerReason = '';

  // Language Gate: if posting requires Danish and candidate lacks it
  if (textLower.includes('dansk') || textLower.includes('flydende dansk')) {
    const danishProf = candidate.languages.find(l => l.language === 'Danish');
    if (!danishProf) {
      practicalScore = 40;
      hasDealbreaker = true;
      dealbreakerReason = 'Mandatory fluent Danish required by posting.';
    }
  }

  // Set Slider Values
  setSlider('slider-tech', techScore);
  setSlider('slider-exp', expScore);
  setSlider('slider-behavior', behaviorScore);
  setSlider('slider-trajectory', trajectoryScore);
  setSlider('slider-practical', practicalScore);

  updateRankerScore(hasDealbreaker, dealbreakerReason, primaryMatches);
}

function setSlider(id, val) {
  const slider = document.getElementById(id);
  const valLabel = document.getElementById(`${id}-val`);
  if (slider) slider.value = val;
  if (valLabel) valLabel.innerText = `${val}%`;
}

function updateRankerScore(hasDealbreaker = false, dealbreakerReason = '', matchedSkills = []) {
  const tech = parseInt(document.getElementById('slider-tech')?.value || 80, 10);
  const exp = parseInt(document.getElementById('slider-exp')?.value || 80, 10);
  const behavior = parseInt(document.getElementById('slider-behavior')?.value || 85, 10);
  const trajectory = parseInt(document.getElementById('slider-trajectory')?.value || 90, 10);
  const practical = parseInt(document.getElementById('slider-practical')?.value || 95, 10);

  // Update label indicators
  document.getElementById('slider-tech-val').innerText = `${tech}%`;
  document.getElementById('slider-exp-val').innerText = `${exp}%`;
  document.getElementById('slider-behavior-val').innerText = `${behavior}%`;
  document.getElementById('slider-trajectory-val').innerText = `${trajectory}%`;
  document.getElementById('slider-practical-val').innerText = `${practical}%`;

  // Weighted calculation (40% tech, 20% exp, 15% behavior, 15% trajectory, 10% practical)
  let weightedScore = Math.round(
    tech * 0.40 +
    exp * 0.20 +
    behavior * 0.15 +
    trajectory * 0.15 +
    practical * 0.10
  );

  if (hasDealbreaker) {
    weightedScore = Math.min(weightedScore, 64);
  }

  const scoreEl = document.getElementById('ranker-overall-score');
  const verdictEl = document.getElementById('ranker-verdict-banner');
  const analysisEl = document.getElementById('ranker-breakdown-details');

  if (scoreEl) scoreEl.innerText = `${weightedScore}%`;

  if (hasDealbreaker) {
    verdictEl.className = 'verdict-banner verdict-dealbreaker';
    verdictEl.innerHTML = `<strong>⚠️ Deal-breaker Veto:</strong> ${escapeHtml(dealbreakerReason)}`;
  } else if (weightedScore >= 85) {
    verdictEl.className = 'verdict-banner verdict-strong';
    verdictEl.innerHTML = '<strong>🎯 Strong Fit (Tier 1 Recommendation):</strong> Proceed to generate targeted application materials.';
  } else if (weightedScore >= 70) {
    verdictEl.className = 'verdict-banner verdict-moderate';
    verdictEl.innerHTML = '<strong>⚖️ Moderate Fit (Bridgeable):</strong> Viable application with proactive gap-bridging in the cover letter.';
  } else {
    verdictEl.className = 'verdict-banner verdict-low';
    verdictEl.innerHTML = '<strong>🛑 Low Fit:</strong> Multiple competency gaps or misaligned seniority requirements.';
  }

  if (analysisEl) {
    analysisEl.innerHTML = `
      <div class="analysis-grid">
        <div class="analysis-box">
          <h4>🌟 Core Strengths & Overlap</h4>
          <ul>
            <li>Strong foundation in Python numerical modeling & ML systems.</li>
            <li>Direct alignment with candidate target sectors (${AppState.candidate.targetSectors.slice(0, 2).join(', ')}).</li>
            <li>Quantitative research background translates well into reliability & analytical depth.</li>
          </ul>
        </div>
        <div class="analysis-box">
          <h4>🛠️ Identified Gaps & Bridge Strategy</h4>
          <ul>
            <li>Highlight commercial API productionization over academic theory.</li>
            <li>Frame geophysics background as high-dimensional noisy data mastery.</li>
            <li>Provide STAR evidence of independent system architecture.</li>
          </ul>
        </div>
      </div>
    `;
  }
}

// ==========================================
// 4. CV & COVER LETTER TAILORING STUDIO (/apply)
// ==========================================
function initTailorStudio() {
  populateTailorJobSelector();

  const select = document.getElementById('tailor-job-selector');
  if (select) {
    select.addEventListener('change', () => {
      const jobId = select.value;
      const job = AppState.jobs.find(j => j.id === jobId);
      if (job) loadJobIntoTailorStudio(job);
    });
  }

  // Document Type Tabs (CV vs Cover Letter)
  const docTypeTabs = document.querySelectorAll('.doc-tab-btn');
  docTypeTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      docTypeTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const docType = btn.getAttribute('data-doctype');
      document.querySelectorAll('.doc-preview-pane').forEach(p => p.classList.remove('active-pane'));
      document.getElementById(`pane-${docType}`).classList.add('active-pane');
    });
  });

  // Output Format Tabs (Visual HTML vs LaTeX vs Markdown)
  const formatTabs = document.querySelectorAll('.format-tab-btn');
  formatTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      formatTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const format = btn.getAttribute('data-format');
      toggleDocumentFormatView(format);
    });
  });

  // Generate / Regenerate Button
  const genBtn = document.getElementById('generate-materials-btn');
  if (genBtn) {
    genBtn.addEventListener('click', () => {
      generateTailoredMaterials();
      showToast('Document materials refreshed.', 'info');
    });
  }

  // AI Auto-Optimize Button
  const autoOptBtn = document.getElementById('ai-auto-optimize-btn');
  if (autoOptBtn) {
    autoOptBtn.addEventListener('click', () => {
      runAiAutoOptimization();
    });
  }

  // Tone, Focus, and Hook selectors
  ['tailor-tone-select', 'tailor-focus-select', 'tailor-template-select'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => generateTailoredMaterials());
  });

  const hookInput = document.getElementById('tailor-custom-hook');
  if (hookInput) {
    hookInput.addEventListener('input', () => generateTailoredMaterials());
  }

  // Copy to Clipboard Button
  const copyBtn = document.getElementById('copy-materials-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyActiveMaterialText();
    });
  }

  // Print / PDF Button
  const printBtn = document.getElementById('print-materials-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Save to Tracker Button
  const saveTrackerBtn = document.getElementById('save-to-tracker-btn');
  if (saveTrackerBtn) {
    saveTrackerBtn.addEventListener('click', () => {
      saveTailoredToTracker();
    });
  }

  // Pre-load initial job
  if (AppState.jobs.length > 0) {
    loadJobIntoTailorStudio(AppState.jobs[0]);
  }
}

function populateTailorJobSelector() {
  const select = document.getElementById('tailor-job-selector');
  if (!select) return;

  select.innerHTML = '<option value="">-- Select job to target --</option>' +
    AppState.jobs.map(j => `<option value="${j.id}">${escapeHtml(j.title)} - ${escapeHtml(j.company)}</option>`).join('');
}

function loadJobIntoTailorStudio(job) {
  AppState.selectedJobForTailoring = job;
  const select = document.getElementById('tailor-job-selector');
  if (select) select.value = job.id;

  const header = document.getElementById('tailor-target-headline');
  if (header) {
    header.innerHTML = `Targeting: <strong>${escapeHtml(job.title)}</strong> at <strong>${escapeHtml(job.company)}</strong>`;
  }

  generateTailoredMaterials();
}

function generateTailoredMaterials() {
  const job = AppState.selectedJobForTailoring || AppState.jobs[0];
  const candidate = AppState.candidate;

  // 1. Generate HTML CV Preview
  const cvHtml = renderTailoredCvHtml(candidate, job);
  const cvContainer = document.getElementById('tailored-cv-view');
  if (cvContainer) cvContainer.innerHTML = cvHtml;

  // 2. Generate HTML Cover Letter Preview
  const letterHtml = renderTailoredCoverLetterHtml(candidate, job);
  const letterContainer = document.getElementById('tailored-letter-view');
  if (letterContainer) letterContainer.innerHTML = letterHtml;

  // 3. Generate LaTeX Source
  const latexSource = generateLatexSource(candidate, job);
  const latexContainer = document.getElementById('tailored-latex-code');
  if (latexContainer) latexContainer.value = latexSource;

  // 4. Generate Markdown Source
  const mdSource = generateMarkdownSource(candidate, job);
  const mdContainer = document.getElementById('tailored-markdown-code');
  if (mdContainer) mdContainer.value = mdSource;
}

function runAiAutoOptimization() {
  const job = AppState.selectedJobForTailoring || AppState.jobs[0];
  const descLower = job.description.toLowerCase();

  // Smart tone selection based on company sector & role
  const toneSelect = document.getElementById('tailor-tone-select');
  const focusSelect = document.getElementById('tailor-focus-select');

  if (job.sector.includes('Pharma') || job.sector.includes('Medical')) {
    if (toneSelect) toneSelect.value = 'mission';
  } else if (job.sector.includes('FinTech') || job.sector.includes('Logistics')) {
    if (toneSelect) toneSelect.value = 'assertive';
  } else {
    if (toneSelect) toneSelect.value = 'technical';
  }

  // Smart focus selection
  if (descLower.includes('agent') || descLower.includes('llm') || descLower.includes('rag')) {
    if (focusSelect) focusSelect.value = 'agents';
  } else if (descLower.includes('pipeline') || descLower.includes('fastapi') || descLower.includes('kubernetes')) {
    if (focusSelect) focusSelect.value = 'pipelines';
  } else if (descLower.includes('numerical') || descLower.includes('physics') || descLower.includes('signal')) {
    if (focusSelect) focusSelect.value = 'numerical';
  }

  // Re-order candidate primary skills: matching skills bubble up to the front
  const matched = [];
  const unmatched = [];
  AppState.candidate.primarySkills.forEach(s => {
    if (descLower.includes(s.toLowerCase())) {
      matched.push(s);
    } else {
      unmatched.push(s);
    }
  });
  AppState.candidate.primarySkills = matched.concat(unmatched);

  generateTailoredMaterials();
  if (typeof launchConfetti === 'function') launchConfetti(1800);
  showToast(`✨ AI Auto-Optimization: ${matched.length} matching skills prioritized & cover letter tuned for ${job.company}!`, 'success');
}

function renderTailoredCvHtml(candidate, job) {
  const descLower = job.description.toLowerCase();

  // Sort skills so matching ones are highlighted first
  const skillsList = candidate.primarySkills
    .map(s => {
      const isMatch = descLower.includes(s.toLowerCase());
      return `<span class="cv-skill-pill ${isMatch ? 'skill-highlight' : ''}">${escapeHtml(s)}${isMatch ? ' ★' : ''}</span>`;
    })
    .join(' ');

  const expItems = candidate.experience.map(exp => {
    const bulletsHtml = exp.responsibilities.map(r => {
      // Highlight matching technical keywords in bullets
      let formatted = escapeHtml(r);
      candidate.primarySkills.forEach(skill => {
        if (descLower.includes(skill.toLowerCase())) {
          const reg = new RegExp(`(${skill})`, 'gi');
          formatted = formatted.replace(reg, '<strong style="color:var(--primary);">$1</strong>');
        }
      });
      return `<li>${formatted}</li>`;
    }).join('');

    return `
      <div class="cv-experience-block">
        <div class="cv-exp-header">
          <div>
            <strong class="cv-exp-role">${escapeHtml(exp.role)}</strong> &bull; <span class="cv-exp-company">${escapeHtml(exp.company)}</span>
          </div>
          <div class="cv-exp-date">${escapeHtml(exp.period)} | ${escapeHtml(exp.location)}</div>
        </div>
        <ul class="cv-exp-bullets">
          ${bulletsHtml}
        </ul>
      </div>
    `;
  }).join('');

  const eduItems = candidate.education.map(edu => `
    <div class="cv-edu-block">
      <div class="cv-edu-header">
        <strong>${escapeHtml(edu.degree)}</strong> &bull; <span>${escapeHtml(edu.institution)}</span>
        <span class="cv-edu-period">${escapeHtml(edu.period)}</span>
      </div>
      ${edu.thesis ? `<p class="cv-edu-thesis">Thesis: <em>${escapeHtml(edu.thesis)}</em></p>` : ''}
    </div>
  `).join('');

  return `
    <div class="cv-document-sheet">
      <header class="cv-doc-header">
        <h1 class="cv-doc-name">${escapeHtml(candidate.name)}</h1>
        <div class="cv-doc-title">${escapeHtml(candidate.title)}</div>
        <div class="cv-doc-contact">
          <span>📍 ${escapeHtml(candidate.location)}</span> |
          <span>✉️ ${escapeHtml(candidate.email)}</span> |
          <span>📞 ${escapeHtml(candidate.phone)}</span> |
          <span>🌐 ${escapeHtml(candidate.portfolio || candidate.linkedin)}</span>
        </div>
      </header>

      <section class="cv-doc-section">
        <h2 class="cv-section-title">Professional Summary</h2>
        <p class="cv-summary-text">${escapeHtml(candidate.summary)}</p>
      </section>

      <section class="cv-doc-section">
        <h2 class="cv-section-title">Core Competencies & Toolchain (Target Aligned)</h2>
        <div class="cv-skills-grid">${skillsList}</div>
      </section>

      <section class="cv-doc-section">
        <h2 class="cv-section-title">Professional Experience</h2>
        ${expItems}
      </section>

      <section class="cv-doc-section">
        <h2 class="cv-section-title">Education & Scientific Background</h2>
        ${eduItems}
      </section>
    </div>
  `;
}

function renderTailoredCoverLetterHtml(candidate, job) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const tone = document.getElementById('tailor-tone-select')?.value || 'technical';
  const focus = document.getElementById('tailor-focus-select')?.value || 'agents';
  const customHook = document.getElementById('tailor-custom-hook')?.value.trim() || '';

  let p1Hook = '';
  let p2Body = '';
  let p3Close = '';

  if (tone === 'assertive') {
    p1Hook = `I am writing to express my strong candidacy for the <strong>${escapeHtml(job.title)}</strong> position. Having built high-agency automated software and scaled systems processing millions of daily records, I specialize in eliminating technical bottlenecks and shipping reliable code that directly improves business velocity.`;
    p2Body = `At Nordic Tech Solutions, I took full end-to-end ownership of building our automated multi-agent extraction infrastructure. By implementing deterministic integrity filters, asynchronous Python/FastAPI microservices, and regression verification, we reduced manual processing cycle times by 75% while maintaining a verified 99.2% accuracy rate. My transition from doctoral geophysics research means I treat high-dimensional uncertainty with rigorous mathematical discipline rather than guesswork.`;
    p3Close = `I thrive in fast-paced environments where code quality meets direct commercial outcomes. I would welcome the opportunity to discuss how my technical leadership and pragmatic engineering can accelerate ${escapeHtml(job.company)}'s strategic milestones.`;
  } else if (tone === 'mission') {
    p1Hook = `I am writing to express my profound enthusiasm for the <strong>${escapeHtml(job.title)}</strong> role at ${escapeHtml(job.company)}. Your pioneering work in ${escapeHtml(job.sector)} embodies the exact standard of scientific rigor and real-world impact that has guided my entire research and engineering career.`;
    p2Body = `My background bridges high-performance numerical modeling with modern AI engineering. In my recent work, I architected automated LLM workflows to parse and synthesize complex biomedical and technical literature, saving research teams 22+ hours weekly with 99.2% verified precision. My earlier doctoral research at Copenhagen University taught me to solve inverse problems in noisy physical systems—a foundation that directly informs how I build explainable, robust machine learning applications today.`;
    p3Close = `What inspires me most about ${escapeHtml(job.company)} is your commitment to technical excellence in service of human health and sustainability. I look forward to the opportunity to contribute my skills and curiosity to your mission.`;
  } else if (tone === 'concise') {
    p1Hook = `I am applying for the <strong>${escapeHtml(job.title)}</strong> opening. With a PhD in computational physics and 3+ years of production AI/ML engineering experience, I specialize in scalable data pipelines and agentic automation.`;
    p2Body = `Key track record: architected an automated multi-agent extraction pipeline handling 2M+ records daily with Python and FastAPI (cut cycle times by 75%, 99.2% accuracy). Proficient across PyTorch, Docker, PostgreSQL, and cloud deployments. Strong mathematical grounding in optimization and signal processing.`;
    p3Close = `I would appreciate 15 minutes to discuss how my skills align with your current engineering priorities. Thank you for your consideration.`;
  } else {
    // Default: technical & quantitative
    p1Hook = `I am writing to apply for the <strong>${escapeHtml(job.title)}</strong> position. Having followed ${escapeHtml(job.company)}'s engineering initiatives in ${escapeHtml(job.sector)}, I am excited by your commitment to scaling robust, high-throughput computational intelligence.`;
    p2Body = `In my recent role as AI/Data Engineer, I architected and productionized automated multi-agent LLM pipelines in Python and FastAPI, processing 2M+ daily records while slashing manual cycle times by 75% with 99.2% verified accuracy. My doctoral background in numerical inversion and high-dimensional signal processing gives me deep intuition for loss landscapes, optimization theory, and distributed architecture trade-offs.`;
    p3Close = `I thrive where mathematical discipline meets clean, maintainable software design. I would welcome an interview to discuss how my technical expertise can support ${escapeHtml(job.company)}'s engineering roadmap.`;
  }

  const hookSentence = customHook ? `<p style="background:var(--bg-surface-elevated); padding:8px 12px; border-left:3px solid var(--primary); margin:12px 0;"><strong>Direct Note:</strong> ${escapeHtml(customHook)}</p>` : '';

  return `
    <div class="letter-document-sheet">
      <div class="letter-header-grid">
        <div class="letter-sender">
          <strong>${escapeHtml(candidate.name)}</strong><br>
          ${escapeHtml(candidate.location)}<br>
          ${escapeHtml(candidate.email)} | ${escapeHtml(candidate.phone)}
        </div>
        <div class="letter-date">
          ${today}
        </div>
      </div>

      <div class="letter-recipient">
        <strong>Hiring Committee for ${escapeHtml(job.title)}</strong><br>
        ${escapeHtml(job.company)}<br>
        ${escapeHtml(job.location)}
      </div>

      <div class="letter-subject">
        Subject: Application for ${escapeHtml(job.title)} (Ref: ${escapeHtml(job.portal)})
      </div>

      <div class="letter-body">
        <p>Dear Hiring Team at ${escapeHtml(job.company)},</p>
        <p>${p1Hook}</p>
        <p>${p2Body}</p>
        ${hookSentence}
        <p>${p3Close}</p>
        <p>Sincerely,</p>
        <p><strong>${escapeHtml(candidate.name)}</strong></p>
      </div>
    </div>
  `;
}

function generateLatexSource(candidate, job) {
  return `% LaTeX CV for ${candidate.name} - Tailored for ${job.company} (${job.title})
\\documentclass[11pt,a4paper,sans]{moderncv}
\\moderncvstyle{banking}
\\moderncvcolor{teal}
\\usepackage[utf8]{inputenc}
\\usepackage[scale=0.82]{geometry}

\\name{${candidate.name.split(' ')[0]}}{${candidate.name.split(' ').slice(1).join(' ')}}
\\title{${candidate.title}}
\\address{${candidate.location}}{}
\\phone[mobile]{${candidate.phone}}
\\email{${candidate.email}}
\\social[linkedin]{${candidate.linkedin}}

\\begin{document}
\\makecvtitle

\\section{Profile}
${candidate.summary}

\\section{Technical Skills}
\\cvitem{Core Skills}{${candidate.primarySkills.join(', ')}}
\\cvitem{Tools \\& Secondary}{${candidate.secondarySkills.join(', ')}}

\\section{Experience}
\\cventry{2023--2026}{AI / Data Engineer}{Nordic Tech Solutions}{Copenhagen}{}{
\\begin{itemize}
  \\item Architected automated multi-agent workflow reducing document cycle time by 75\\%.
  \\item Engineered scalable data extraction pipelines processing 2M+ records daily with Python and FastAPI.
\\end{itemize}}

\\section{Education}
\\cventry{2018--2023}{Ph.D. in Numerical Modeling \\& Geophysics}{University of Copenhagen}{}{}{
\\begin{itemize}
  \\item Specialized in high-performance inverse modeling, signal processing, and machine learning.
\\end{itemize}}

\\end{document}`;
}

function generateMarkdownSource(candidate, job) {
  return `# ${candidate.name}
**${candidate.title}** | ${candidate.location} | ${candidate.email} | ${candidate.phone}

---

## Targeted Application: ${job.title} at ${job.company}

### Professional Summary
${candidate.summary}

### Key Technical Competencies
${candidate.primarySkills.map(s => `- ${s}`).join('\n')}

### Experience
**AI / Data Engineer** - Nordic Tech Solutions (2023 - 2026)
- Architected automated multi-agent workflow reducing manual processing time by 75%.
- Built high-throughput FastAPI services processing 2M+ records daily.

### Education
**Ph.D. in Computational Sciences & Geophysics** - University of Copenhagen (2018 - 2023)
`;
}

function toggleDocumentFormatView(format) {
  const visualPane = document.getElementById('format-visual-container');
  const latexPane = document.getElementById('format-latex-container');
  const markdownPane = document.getElementById('format-markdown-container');

  if (visualPane) visualPane.style.display = format === 'visual' ? 'block' : 'none';
  if (latexPane) latexPane.style.display = format === 'latex' ? 'block' : 'none';
  if (markdownPane) markdownPane.style.display = format === 'markdown' ? 'block' : 'none';
}

function copyActiveMaterialText() {
  const activeTab = document.querySelector('.format-tab-btn.active')?.getAttribute('data-format') || 'visual';
  let textToCopy = '';

  if (activeTab === 'latex') {
    textToCopy = document.getElementById('tailored-latex-code')?.value || '';
  } else if (activeTab === 'markdown') {
    textToCopy = document.getElementById('tailored-markdown-code')?.value || '';
  } else {
    const activeDoc = document.querySelector('.doc-tab-btn.active')?.getAttribute('data-doctype') || 'cv';
    const container = activeDoc === 'cv' ? document.getElementById('tailored-cv-view') : document.getElementById('tailored-letter-view');
    textToCopy = container?.innerText || '';
  }

  navigator.clipboard.writeText(textToCopy).then(() => {
    alert('Copied to clipboard successfully!');
  }).catch(() => {
    alert('Failed to copy. Please copy manually.');
  });
}

function saveTailoredToTracker() {
  const job = AppState.selectedJobForTailoring || AppState.jobs[0];
  const existing = AppState.applications.find(a => a.company.toLowerCase() === job.company.toLowerCase() && a.role.toLowerCase() === job.title.toLowerCase());

  if (existing) {
    alert(`Application for ${job.title} at ${job.company} already exists in your tracker.`);
    return;
  }

  const newApp = {
    id: `app-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    company: job.company,
    sector: job.sector,
    role: job.title,
    role_type: job.roleType || 'Full-time',
    channel: job.portal,
    status: 'drafted',
    contact_person: 'Hiring Team',
    fit_rating: `${job.matchScore || 90}%`,
    notes: 'Drafted tailored CV and cover letter using AI Job Search studio.',
    cv_file: `cv/main_${job.company.toLowerCase().replace(/[^a-z0-9]/g, '_')}.tex`,
    cover_letter_file: `cover_letters/cover_${job.company.toLowerCase().replace(/[^a-z0-9]/g, '_')}.tex`,
    source: job.url,
    deadline: job.deadline,
    history: [{ date: new Date().toISOString().split('T')[0], event: 'Materials drafted in studio' }]
  };

  AppState.applications.unshift(newApp);
  localStorage.setItem('ai_job_applications', JSON.stringify(AppState.applications));
  renderDashboardStats();
  renderDashboardCharts();
  renderTrackerBoard();
  alert(`Saved ${job.title} at ${job.company} as "Drafted" in your application tracker!`);
}

// ==========================================
// 5. SALARY BENCHMARK LOOKUP (salary_lookup.py)
// ==========================================
function initSalaryLookup() {
  renderSalaryCompanyList();

  const searchInput = document.getElementById('salary-search-input');
  const cityFilter = document.getElementById('salary-city-filter');
  const categoryFilter = document.getElementById('salary-category-filter');
  const currencySelector = document.getElementById('salary-currency-selector');

  const triggerUpdate = () => renderSalaryCompanyList();

  if (searchInput) searchInput.addEventListener('input', triggerUpdate);
  if (cityFilter) cityFilter.addEventListener('change', triggerUpdate);
  if (categoryFilter) categoryFilter.addEventListener('change', triggerUpdate);

  if (currencySelector) {
    currencySelector.addEventListener('change', () => {
      AppState.activeCurrency = currencySelector.value;
      renderSalaryCompanyList();
    });
  }

  // Pre-load default quick test search
  const quickTags = document.querySelectorAll('.quick-company-pill');
  quickTags.forEach(pill => {
    pill.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = pill.innerText;
        renderSalaryCompanyList();
      }
    });
  });
}

// Fuzzy matching logic matching Python salary_lookup.py
function matchSalaryCompany(searchTerm, companyObj) {
  if (!searchTerm) return true;
  const term = normalizeCompanyString(searchTerm);
  const compName = normalizeCompanyString(companyObj.company);

  if (compName.includes(term) || term.includes(compName)) return true;
  if (companyObj.aliases && companyObj.aliases.some(a => normalizeCompanyString(a).includes(term))) {
    return true;
  }
  return false;
}

function normalizeCompanyString(str) {
  return str.toLowerCase()
    .replace(/[øö]/g, 'o')
    .replace(/[æä]/g, 'ae')
    .replace(/[å]/g, 'aa')
    .replace(/[ü]/g, 'u')
    .replace(/\ba\/s\b|\baps\b|\bi\/s\b|\bp\/s\b|\bamba\b/g, '')
    .replace(/denmark|danmark|nordic|group|holding/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderSalaryCompanyList() {
  const container = document.getElementById('salary-results-container');
  if (!container) return;

  const searchTerm = document.getElementById('salary-search-input')?.value.trim() || '';
  const cityVal = document.getElementById('salary-city-filter')?.value || 'all';
  const categoryVal = document.getElementById('salary-category-filter')?.value || 'data_ai';
  const curr = AppState.activeCurrency;
  const rate = AppState.currencyRates[curr] || 1;

  const matches = AppState.salaryData.companies.filter(c => {
    const matchesName = matchSalaryCompany(searchTerm, c);
    const matchesCity = cityVal === 'all' || c.city.toLowerCase().includes(cityVal.toLowerCase());
    return matchesName && matchesCity;
  });

  const countEl = document.getElementById('salary-count-label');
  if (countEl) countEl.innerText = `${matches.length} companies matched`;

  if (matches.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">📊</div>
        <h3>No company salary record found</h3>
        <p>Try searching without legal suffixes (e.g. search "Novo" instead of "Novo Nordisk A/S") or check your city filter.</p>
      </div>
    `;
    return;
  }

  let html = '';
  matches.forEach(comp => {
    const catData = comp.categories[categoryVal] || comp.categories['all_employees'] || Object.values(comp.categories)[0];
    const indexVal = catData?.index || 100;
    const baseDkk = catData?.avg_salary_dkk || 62500;
    const convertedMonthly = Math.round(baseDkk * rate);
    const convertedAnnual = Math.round(convertedMonthly * 12);

    let indexBadgeClass = 'index-at-baseline';
    let indexLabel = 'At Market Median';
    if (indexVal >= 115) {
      indexBadgeClass = 'index-high';
      indexLabel = 'Premium Above Market';
    } else if (indexVal > 102) {
      indexBadgeClass = 'index-above';
      indexLabel = 'Above Market Median';
    } else if (indexVal < 98) {
      indexBadgeClass = 'index-below';
      indexLabel = 'Below Market Median';
    }

    const benefitsHtml = (comp.benefits || ['Standard pension and benefits']).map(b => `<li>${escapeHtml(b)}</li>`).join('');

    html += `
      <div class="salary-card">
        <div class="salary-card-header">
          <div>
            <h3 class="salary-company-name">${escapeHtml(comp.company)}</h3>
            <div class="salary-city-badge">📍 ${escapeHtml(comp.city)}</div>
          </div>
          <div class="salary-index-meter ${indexBadgeClass}">
            <span class="index-score-text">${indexVal.toFixed(1)}</span>
            <span class="index-score-caption">Index (100 = Base)</span>
          </div>
        </div>

        <div class="salary-estimate-banner">
          <div class="salary-stat-box">
            <span class="stat-caption">Estimated Monthly (${curr})</span>
            <strong class="stat-main-number">${convertedMonthly.toLocaleString()} ${curr}</strong>
          </div>
          <div class="salary-stat-box">
            <span class="stat-caption">Estimated Annual (${curr})</span>
            <strong class="stat-main-number">${convertedAnnual.toLocaleString()} ${curr}</strong>
          </div>
          <div class="salary-stat-box">
            <span class="stat-caption">Benchmark Category</span>
            <strong class="stat-main-number">${formatCategoryName(categoryVal)}</strong>
          </div>
        </div>

        <div class="salary-benefits-section">
          <h4>Reported Perks & Benefits:</h4>
          <ul class="benefits-bullet-list">
            ${benefitsHtml}
          </ul>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function formatCategoryName(key) {
  const map = {
    'all_employees': 'All Employees',
    'engineering': 'Engineering & Technical',
    'data_ai': 'Data Science & AI',
    'management': 'Engineering Leadership'
  };
  return map[key] || key;
}

// ==========================================
// 6. PIPELINE TRACKER & KANBAN DASHBOARD
// ==========================================
function initTrackerBoard() {
  renderTrackerBoard();

  // View Mode Switcher (Kanban vs Table)
  const kanbanViewBtn = document.getElementById('view-kanban-btn');
  const tableViewBtn = document.getElementById('view-table-btn');
  const kanbanPane = document.getElementById('tracker-kanban-view');
  const tablePane = document.getElementById('tracker-table-view');

  if (kanbanViewBtn && tableViewBtn && kanbanPane && tablePane) {
    kanbanViewBtn.addEventListener('click', () => {
      kanbanViewBtn.classList.add('active');
      tableViewBtn.classList.remove('active');
      kanbanPane.style.display = 'grid';
      tablePane.style.display = 'none';
    });

    tableViewBtn.addEventListener('click', () => {
      tableViewBtn.classList.add('active');
      kanbanViewBtn.classList.remove('active');
      kanbanPane.style.display = 'none';
      tablePane.style.display = 'block';
      renderTrackerTable();
    });
  }

  // Add Application Modal Trigger
  const addAppBtn = document.getElementById('add-application-modal-btn');
  const addAppModal = document.getElementById('add-app-modal');
  if (addAppBtn && addAppModal) {
    addAppBtn.addEventListener('click', () => {
      addAppModal.classList.add('modal-active');
    });

    const closeBtn = addAppModal.querySelector('.modal-close');
    if (closeBtn) closeBtn.onclick = () => addAppModal.classList.remove('modal-active');

    const form = document.getElementById('new-application-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newApp = {
          id: `app-${Date.now()}`,
          date: document.getElementById('new-app-date').value || new Date().toISOString().split('T')[0],
          company: document.getElementById('new-app-company').value.trim(),
          sector: document.getElementById('new-app-sector').value,
          role: document.getElementById('new-app-role').value.trim(),
          role_type: document.getElementById('new-app-roletype').value,
          channel: document.getElementById('new-app-channel').value,
          status: document.getElementById('new-app-status').value,
          contact_person: document.getElementById('new-app-contact').value.trim() || 'Hiring Manager',
          fit_rating: document.getElementById('new-app-fit').value.trim() || '85%',
          notes: document.getElementById('new-app-notes').value.trim() || 'Applied via portal.',
          cv_file: 'cv/main.tex',
          cover_letter_file: 'cover_letters/cover.tex',
          source: 'https://jobindex.dk',
          deadline: document.getElementById('new-app-deadline').value || '',
          history: [{ date: new Date().toISOString().split('T')[0], event: 'Created in tracker' }]
        };

        AppState.applications.unshift(newApp);
        localStorage.setItem('ai_job_applications', JSON.stringify(AppState.applications));
        addAppModal.classList.remove('modal-active');
        form.reset();
        renderTrackerBoard();
        renderDashboardStats();
        renderDashboardCharts();
      });
    }
  }

  // Export CSV Button
  const exportCsvBtn = document.getElementById('export-tracker-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      exportTrackerCsv();
    });
  }

  // Export JSON Button
  const exportJsonBtn = document.getElementById('export-tracker-json-btn');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      exportTrackerJson();
    });
  }
}

function renderTrackerBoard() {
  const columns = {
    drafted: document.getElementById('col-drafted-items'),
    applied: document.getElementById('col-applied-items'),
    interview: document.getElementById('col-interview-items'),
    offer: document.getElementById('col-offer-items'),
    hired: document.getElementById('col-hired-items'),
    closed: document.getElementById('col-closed-items')
  };

  // Clear columns
  Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });

  AppState.applications.forEach(app => {
    let targetCol = columns[app.status];
    if (['rejected', 'withdrawn', 'no_response'].includes(app.status)) {
      targetCol = columns.closed;
    }

    if (targetCol) {
      const card = createKanbanCard(app);
      targetCol.appendChild(card);
    }
  });

  // Update column counters
  document.querySelectorAll('.kanban-column').forEach(col => {
    const statusKey = col.getAttribute('data-status');
    const badge = col.querySelector('.col-count-badge');
    if (badge) {
      let count = 0;
      if (statusKey === 'closed') {
        count = AppState.applications.filter(a => ['rejected', 'withdrawn', 'no_response'].includes(a.status)).length;
      } else {
        count = AppState.applications.filter(a => a.status === statusKey).length;
      }
      badge.innerText = count;
    }
  });

  // Also sync table view if rendered
  renderTrackerTable();
}

function createKanbanCard(app) {
  const card = document.createElement('div');
  card.className = 'kanban-item-card';
  card.setAttribute('data-id', app.id);

  // Compute days since application for follow-up alerts (default 10 days in /outcome followup)
  let followUpHtml = '';
  if (app.status === 'applied' && app.date) {
    const appDate = new Date(app.date);
    const diffDays = Math.floor((new Date() - appDate) / (1000 * 60 * 60 * 24));
    if (diffDays >= 10) {
      followUpHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(230, 57, 70, 0.15); border:1px solid rgba(230, 57, 70, 0.4); border-radius:4px; padding:3px 6px; font-size:0.72rem; margin-top:4px;">
          <span style="color:var(--accent-danger); font-weight:700;">⚠️ Follow-up Due (${diffDays}d)</span>
          <button class="btn btn-xs btn-coral draft-followup-btn" data-id="${app.id}" style="padding:1px 5px; font-size:0.68rem;">Draft ✉️</button>
        </div>
      `;
    } else {
      followUpHtml = `<div style="font-size:0.7rem; color:var(--text-dim); margin-top:2px;">Applied ${diffDays} day${diffDays !== 1 ? 's' : ''} ago &bull; Follow-up in ${10 - diffDays}d</div>`;
    }
  }

  card.innerHTML = `
    <div class="k-card-header">
      <span class="k-card-channel">${escapeHtml(app.channel)}</span>
      <span class="k-card-fit">${escapeHtml(app.fit_rating)}</span>
    </div>
    <h4 class="k-card-role">${escapeHtml(app.role)}</h4>
    <div class="k-card-company">${escapeHtml(app.company)}</div>
    <div class="k-card-meta">
      <span>📅 ${escapeHtml(app.date)}</span>
      ${app.deadline ? `<span>⏳ ${escapeHtml(app.deadline)}</span>` : ''}
    </div>
    ${followUpHtml}
    ${app.notes ? `<p class="k-card-notes">${escapeHtml(app.notes)}</p>` : ''}
    <div class="k-card-actions">
      <select class="k-status-select" data-id="${app.id}">
        <option value="drafted" ${app.status === 'drafted' ? 'selected' : ''}>Drafted</option>
        <option value="applied" ${app.status === 'applied' ? 'selected' : ''}>Active (Applied)</option>
        <option value="interview" ${app.status === 'interview' ? 'selected' : ''}>Interview</option>
        <option value="offer" ${app.status === 'offer' ? 'selected' : ''}>Offer</option>
        <option value="hired" ${app.status === 'hired' ? 'selected' : ''}>Hired 🎉</option>
        <option value="rejected" ${['rejected', 'withdrawn', 'no_response'].includes(app.status) ? 'selected' : ''}>Closed / Rejected</option>
      </select>
      <button class="btn btn-xs btn-danger delete-app-btn" data-id="${app.id}" title="Remove application">✕</button>
    </div>
  `;

  // Status selector change listener
  const select = card.querySelector('.k-status-select');
  select.addEventListener('change', () => {
    updateApplicationStatus(app.id, select.value);
  });

  // Follow-up draft button
  const followupBtn = card.querySelector('.draft-followup-btn');
  if (followupBtn) {
    followupBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showFollowupDraftModal(app);
    });
  }

  // Delete button
  const delBtn = card.querySelector('.delete-app-btn');
  delBtn.addEventListener('click', () => {
    if (confirm(`Remove application for ${app.role} at ${app.company}?`)) {
      AppState.applications = AppState.applications.filter(a => a.id !== app.id);
      localStorage.setItem('ai_job_applications', JSON.stringify(AppState.applications));
      renderTrackerBoard();
      renderDashboardStats();
      renderDashboardCharts();
      if (typeof showToast === 'function') showToast('Application removed from tracker', 'info');
    }
  });

  return card;
}

function showFollowupDraftModal(app) {
  let modal = document.getElementById('followup-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'followup-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const subject = `Following up: Application for ${app.role} - ${AppState.candidate.name}`;
  const draftBody = `Dear ${app.contact_person || 'Hiring Team'},\n\nI hope this email finds you well.\n\nI am writing to politely follow up on my application for the ${app.role} role at ${app.company}, submitted on ${app.date}.\n\nI remain very enthusiastic about ${app.company}'s mission and would welcome the chance to discuss how my background in quantitative modeling and AI engineering can contribute to your team. Please let me know if you need any additional materials or portfolio samples from my side.\n\nThank you for your time and consideration.\n\nBest regards,\n${AppState.candidate.name}\n${AppState.candidate.phone} | ${AppState.candidate.email}`;

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title">✉️ Follow-Up Draft (/outcome followup)</h3>
        <button class="modal-close" onclick="document.getElementById('followup-modal').classList.remove('modal-active')">&times;</button>
      </div>
      <div class="modal-body">
        <div style="font-size:0.85rem; color:var(--text-dim); margin-bottom:8px;">
          To: <strong>${escapeHtml(app.contact_person || 'Hiring Team')} (${escapeHtml(app.company)})</strong><br>
          Subject: <strong>${escapeHtml(subject)}</strong>
        </div>
        <textarea class="form-textarea" id="followup-modal-text" rows="10" style="font-size:0.88rem; line-height:1.6;">${draftBody}</textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-secondary" onclick="document.getElementById('followup-modal').classList.remove('modal-active')">Close</button>
        <button class="btn btn-sm btn-primary" id="copy-followup-modal-btn">📋 Copy Draft to Clipboard</button>
      </div>
    </div>
  `;

  document.getElementById('copy-followup-modal-btn').addEventListener('click', () => {
    const text = document.getElementById('followup-modal-text').value;
    navigator.clipboard.writeText(text).then(() => {
      if (typeof showToast === 'function') showToast('Follow-up draft copied to clipboard!', 'success');
      modal.classList.remove('modal-active');
    });
  });

  modal.classList.add('modal-active');
}

function updateApplicationStatus(appId, newStatus) {
  const app = AppState.applications.find(a => a.id === appId);
  if (app) {
    app.status = newStatus;
    if (!app.history) app.history = [];
    app.history.push({
      date: new Date().toISOString().split('T')[0],
      event: `Status changed to ${newStatus}`
    });
    localStorage.setItem('ai_job_applications', JSON.stringify(AppState.applications));
    renderTrackerBoard();
    renderDashboardStats();
    renderDashboardCharts();
  }
}

function renderTrackerTable() {
  const tbody = document.getElementById('tracker-table-body');
  if (!tbody) return;

  let html = '';
  AppState.applications.forEach(app => {
    html += `
      <tr>
        <td>${escapeHtml(app.date)}</td>
        <td><strong>${escapeHtml(app.company)}</strong></td>
        <td>${escapeHtml(app.role)}</td>
        <td>${escapeHtml(app.sector)}</td>
        <td>${escapeHtml(app.channel)}</td>
        <td><span class="status-pill status-${app.status}">${escapeHtml(app.status)}</span></td>
        <td>${escapeHtml(app.fit_rating)}</td>
        <td>${escapeHtml(app.contact_person || 'N/A')}</td>
        <td class="table-notes-cell" title="${escapeHtml(app.notes)}">${escapeHtml(app.notes)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Export 14-column CSV matching job_search_tracker.csv
function exportTrackerCsv() {
  const headers = [
    'date', 'company', 'sector', 'role', 'role_type',
    'channel', 'status', 'contact_person', 'fit_rating',
    'notes', 'cv_file', 'cover_letter_file', 'source', 'deadline'
  ];

  let csvContent = headers.join(',') + '\n';

  AppState.applications.forEach(app => {
    const row = [
      escapeCsv(app.date),
      escapeCsv(app.company),
      escapeCsv(app.sector),
      escapeCsv(app.role),
      escapeCsv(app.role_type || 'Full-time'),
      escapeCsv(app.channel),
      escapeCsv(app.status),
      escapeCsv(app.contact_person || ''),
      escapeCsv(app.fit_rating || ''),
      escapeCsv(app.notes || ''),
      escapeCsv(app.cv_file || ''),
      escapeCsv(app.cover_letter_file || ''),
      escapeCsv(app.source || ''),
      escapeCsv(app.deadline || '')
    ];
    csvContent += row.join(',') + '\n';
  });

  downloadFile(csvContent, 'job_search_tracker.csv', 'text/csv');
}

function exportTrackerJson() {
  const jsonContent = JSON.stringify(AppState.applications, null, 2);
  downloadFile(jsonContent, 'job_search_tracker.json', 'application/json');
}

function escapeCsv(str) {
  if (str === null || str === undefined) return '""';
  const val = String(str).replace(/"/g, '""');
  return `"${val}"`;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// 7. INTERVIEW COACH & STAR PREP
// ==========================================
function initInterviewCoach() {
  renderInterviewFlashcards();

  const stageTabs = document.querySelectorAll('.interview-stage-tab');
  stageTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      stageTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const stageId = tab.getAttribute('data-stage');
      filterInterviewStage(stageId);
    });
  });

  // Bridge The Gap Generator Form
  const bridgeBtn = document.getElementById('generate-bridge-answer-btn');
  if (bridgeBtn) {
    bridgeBtn.addEventListener('click', () => {
      generateBridgeAnswer();
    });
  }
}

function renderInterviewFlashcards() {
  const container = document.getElementById('interview-flashcards-container');
  if (!container) return;

  let html = '';
  AppState.interviewData.starFlashcards.forEach((card, index) => {
    html += `
      <div class="star-card" data-card-id="${card.id}">
        <div class="star-card-header">
          <span class="badge star-category-badge">${escapeHtml(card.category)}</span>
          <span class="star-card-number">Scenario #${index + 1}</span>
        </div>
        <h3 class="star-question">${escapeHtml(card.question)}</h3>

        <div class="star-breakdown">
          <div class="star-elem">
            <span class="star-letter s-letter">S</span>
            <div><strong>Situation:</strong> ${escapeHtml(card.situation)}</div>
          </div>
          <div class="star-elem">
            <span class="star-letter t-letter">T</span>
            <div><strong>Task:</strong> ${escapeHtml(card.task)}</div>
          </div>
          <div class="star-elem">
            <span class="star-letter a-letter">A</span>
            <div><strong>Action:</strong> ${escapeHtml(card.action)}</div>
          </div>
          <div class="star-elem">
            <span class="star-letter r-letter">R</span>
            <div><strong>Result:</strong> ${escapeHtml(card.result)}</div>
          </div>
        </div>

        <div class="star-takeaway">
          💡 <strong>Interview Coaching Tip:</strong> ${escapeHtml(card.keyTakeaway)}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function filterInterviewStage(stageId) {
  const stage = AppState.interviewData.stages.find(s => s.id === stageId);
  const infoBox = document.getElementById('interview-stage-info');
  if (infoBox && stage) {
    infoBox.innerHTML = `
      <div class="stage-info-banner">
        <h4>🎯 Focus for ${stage.name} (${stage.duration}):</h4>
        <p>${stage.focus}</p>
      </div>
    `;
  }
}

function generateBridgeAnswer() {
  const gapInput = document.getElementById('bridge-gap-input')?.value.trim();
  const outputBox = document.getElementById('bridge-answer-output');

  if (!gapInput) {
    alert('Please enter a skill gap or question you want to bridge (e.g. "I have no commercial Kafka experience").');
    return;
  }

  const bridgeTemplate = `
    <div class="bridge-result-card">
      <h4>🌉 Recommended 3-Step Bridge Script:</h4>
      <ol class="bridge-steps">
        <li>
          <strong>Acknowledge with Confidence (No defensive apologizing):</strong><br>
          <em>"While my recent production deployments centered around Python asyncio and Redis rather than an enterprise ${escapeHtml(gapInput)} cluster..."</em>
        </li>
        <li>
          <strong>Anchor in Proven Equivalent Foundation:</strong><br>
          <em>"...my core strength is engineering asynchronous, fault-tolerant pipelines. Handling large-scale numerical telemetry taught me backpressure, partition keys, and message durability principles at their core."</em>
        </li>
        <li>
          <strong>Show Active Velocity & Learning Proof:</strong><br>
          <em>"In fact, I already set up a local testing environment to benchmark latency characteristics. Because the underlying streaming paradigms mirror what I build daily, I ramp up in days, not months."</em>
        </li>
      </ol>
    </div>
  `;

  if (outputBox) outputBox.innerHTML = bridgeTemplate;
}

// ==========================================
// 8. UPSKILL & LEARNING ROADMAP
// ==========================================
function initUpskillLab() {
  renderUpskillCatalog();

  const addSkillBtn = document.getElementById('add-upskill-btn');
  if (addSkillBtn) {
    addSkillBtn.addEventListener('click', () => {
      const skillName = prompt('Enter new skill or technology to learn:');
      if (skillName) {
        AppState.upskillCatalog.unshift({
          skill: skillName,
          category: 'Custom Goal',
          gapLevel: 'Moderate',
          priority: 'High',
          estimatedHours: 20,
          description: 'Self-directed learning goal added from web dashboard.',
          suggestedPath: ['Study official documentation', 'Build hands-on sample project', 'Write technical post'],
          targetRoles: ['Target Position']
        });
        localStorage.setItem('ai_job_upskill', JSON.stringify(AppState.upskillCatalog));
        renderUpskillCatalog();
      }
    });
  }
}

function renderUpskillCatalog() {
  const container = document.getElementById('upskill-cards-container');
  if (!container) return;

  let html = '';
  AppState.upskillCatalog.forEach(item => {
    const stepsHtml = item.suggestedPath.map(step => `
      <label class="upskill-task-item">
        <input type="checkbox">
        <span>${escapeHtml(step)}</span>
      </label>
    `).join('');

    html += `
      <div class="upskill-card">
        <div class="upskill-card-header">
          <div>
            <span class="badge badge-category">${escapeHtml(item.category)}</span>
            <h3 class="upskill-title">${escapeHtml(item.skill)}</h3>
          </div>
          <div class="upskill-priority-badge priority-${item.priority.toLowerCase()}">
            ${item.priority} Priority
          </div>
        </div>

        <p class="upskill-desc">${escapeHtml(item.description)}</p>

        <div class="upskill-meta">
          <span>⏱️ Est. Study Time: <strong>${item.estimatedHours} hours</strong></span>
          <span>🎯 Target: <strong>${item.targetRoles.join(', ')}</strong></span>
        </div>

        <div class="upskill-checklist">
          <h5>Milestones & Projects:</h5>
          ${stepsHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ==========================================
// 9. PROFILE MANAGER (/setup)
// ==========================================
function initProfileManager() {
  loadProfileToForm();

  // Add Language Button
  const addLangBtn = document.getElementById('add-profile-lang-btn');
  if (addLangBtn) {
    addLangBtn.addEventListener('click', () => {
      if (!AppState.candidate.languages) AppState.candidate.languages = [];
      AppState.candidate.languages.push({ language: '', level: 'C1 (Advanced)' });
      renderProfileLanguagesList();
    });
  }

  // Add Experience Button
  const addExpBtn = document.getElementById('add-profile-exp-btn');
  if (addExpBtn) {
    addExpBtn.addEventListener('click', () => {
      if (!AppState.candidate.experience) AppState.candidate.experience = [];
      AppState.candidate.experience.push({
        role: 'Senior Engineer',
        company: 'Company Name',
        location: 'City',
        period: '2024 - Present',
        responsibilities: ['Describe key quantitative achievement or leadership impact']
      });
      renderProfileExperienceList();
    });
  }

  // Add Education Button
  const addEduBtn = document.getElementById('add-profile-edu-btn');
  if (addEduBtn) {
    addEduBtn.addEventListener('click', () => {
      if (!AppState.candidate.education) AppState.candidate.education = [];
      AppState.candidate.education.push({
        degree: 'M.Sc. in Computer Science',
        institution: 'University Name',
        period: '2020 - 2022',
        thesis: 'Topic of thesis',
        highlights: 'Key highlights'
      });
      renderProfileEducationList();
    });
  }

  const form = document.getElementById('profile-edit-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProfileFromForm();
    });
  }

  // Export CLAUDE.md button
  const exportClaudeBtn = document.getElementById('export-claudemd-btn');
  if (exportClaudeBtn) {
    exportClaudeBtn.addEventListener('click', () => {
      exportClaudeMdFile();
    });
  }
}

function loadProfileToForm() {
  const c = AppState.candidate;
  setFormVal('prof-name', c.name);
  setFormVal('prof-title', c.title);
  setFormVal('prof-location', c.location);
  setFormVal('prof-email', c.email);
  setFormVal('prof-phone', c.phone);
  setFormVal('prof-status', c.employmentStatus || 'Actively Looking');
  setFormVal('prof-linkedin', c.linkedin);
  setFormVal('prof-github', c.github || c.portfolio);
  setFormVal('prof-summary', c.summary);
  setFormVal('prof-skills', (c.primarySkills || []).join(', '));
  setFormVal('prof-secondary-skills', (c.secondarySkills || []).join(', '));
  setFormVal('prof-sectors', (c.targetSectors || []).join(', '));
  setFormVal('prof-dealbreakers', (c.dealbreakers || []).join(', '));

  renderProfileLanguagesList();
  renderProfileExperienceList();
  renderProfileEducationList();
}

function renderProfileLanguagesList() {
  const container = document.getElementById('profile-languages-container');
  if (!container) return;

  const languages = AppState.candidate.languages || [];
  if (languages.length === 0) {
    container.innerHTML = '<p style="font-size:0.8rem; color:var(--text-dim);">No languages added yet. Click "+ Add Language" above.</p>';
    return;
  }

  let html = '';
  languages.forEach((lang, idx) => {
    html += `
      <div style="display:flex; gap:10px; align-items:center;" class="profile-lang-row" data-idx="${idx}">
        <input type="text" class="form-input lang-name-input" placeholder="e.g. English, Danish, French..." value="${escapeHtml(lang.language)}" style="flex:1;">
        <select class="form-select lang-level-select" style="width:170px;">
          <option value="Native" ${lang.level === 'Native' ? 'selected' : ''}>Native</option>
          <option value="C2 (Full Professional)" ${lang.level.includes('C2') ? 'selected' : ''}>C2 (Full Professional)</option>
          <option value="C1 (Advanced)" ${lang.level.includes('C1') ? 'selected' : ''}>C1 (Advanced)</option>
          <option value="B2 (Upper Intermediate)" ${lang.level.includes('B2') ? 'selected' : ''}>B2 (Upper Intermediate)</option>
          <option value="B1 (Intermediate)" ${lang.level.includes('B1') ? 'selected' : ''}>B1 (Intermediate)</option>
          <option value="A2 (Elementary)" ${lang.level.includes('A2') ? 'selected' : ''}>A2 (Elementary)</option>
        </select>
        <button type="button" class="btn btn-xs btn-danger delete-lang-btn" data-idx="${idx}">✕</button>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.delete-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      AppState.candidate.languages.splice(idx, 1);
      renderProfileLanguagesList();
    });
  });
}

function renderProfileExperienceList() {
  const container = document.getElementById('profile-experience-container');
  if (!container) return;

  const experiences = AppState.candidate.experience || [];
  if (experiences.length === 0) {
    container.innerHTML = '<p style="font-size:0.8rem; color:var(--text-dim);">No experience records. Click "+ Add Experience" above.</p>';
    return;
  }

  let html = '';
  experiences.forEach((exp, idx) => {
    const bullets = (exp.responsibilities || []).join('\n');
    html += `
      <div style="background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:14px;" class="profile-exp-block" data-idx="${idx}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <strong style="color:var(--text-main); font-size:0.9rem;">Role #${idx + 1}</strong>
          <button type="button" class="btn btn-xs btn-danger delete-exp-btn" data-idx="${idx}">✕ Remove Role</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label style="font-size:0.78rem;">Role Title</label>
            <input type="text" class="form-input exp-role-input" value="${escapeHtml(exp.role)}" required>
          </div>
          <div class="form-group">
            <label style="font-size:0.78rem;">Company Name</label>
            <input type="text" class="form-input exp-company-input" value="${escapeHtml(exp.company)}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label style="font-size:0.78rem;">Location</label>
            <input type="text" class="form-input exp-location-input" value="${escapeHtml(exp.location || 'Copenhagen')}">
          </div>
          <div class="form-group">
            <label style="font-size:0.78rem;">Timeline / Period</label>
            <input type="text" class="form-input exp-period-input" value="${escapeHtml(exp.period || '2023 - 2026')}">
          </div>
        </div>
        <div class="form-group">
          <label style="font-size:0.78rem;">STAR Achievements & Responsibilities (1 bullet per line)</label>
          <textarea class="form-textarea exp-bullets-input" rows="3">${escapeHtml(bullets)}</textarea>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.delete-exp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      AppState.candidate.experience.splice(idx, 1);
      renderProfileExperienceList();
    });
  });
}

function renderProfileEducationList() {
  const container = document.getElementById('profile-education-container');
  if (!container) return;

  const educations = AppState.candidate.education || [];
  if (educations.length === 0) {
    container.innerHTML = '<p style="font-size:0.8rem; color:var(--text-dim);">No education records. Click "+ Add Degree" above.</p>';
    return;
  }

  let html = '';
  educations.forEach((edu, idx) => {
    html += `
      <div style="background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:12px;" class="profile-edu-block" data-idx="${idx}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="color:var(--text-main); font-size:0.88rem;">Degree #${idx + 1}</strong>
          <button type="button" class="btn btn-xs btn-danger delete-edu-btn" data-idx="${idx}">✕ Remove</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label style="font-size:0.78rem;">Degree Level & Major</label>
            <input type="text" class="form-input edu-degree-input" value="${escapeHtml(edu.degree)}" required>
          </div>
          <div class="form-group">
            <label style="font-size:0.78rem;">University / Institution</label>
            <input type="text" class="form-input edu-inst-input" value="${escapeHtml(edu.institution)}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label style="font-size:0.78rem;">Graduation Period</label>
            <input type="text" class="form-input edu-period-input" value="${escapeHtml(edu.period)}">
          </div>
          <div class="form-group">
            <label style="font-size:0.78rem;">Thesis / Specialization</label>
            <input type="text" class="form-input edu-thesis-input" value="${escapeHtml(edu.thesis || '')}">
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.delete-edu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      AppState.candidate.education.splice(idx, 1);
      renderProfileEducationList();
    });
  });
}

function saveProfileFromForm() {
  const c = AppState.candidate;
  c.name = document.getElementById('prof-name')?.value.trim() || c.name;
  c.title = document.getElementById('prof-title')?.value.trim() || c.title;
  c.location = document.getElementById('prof-location')?.value.trim() || c.location;
  c.email = document.getElementById('prof-email')?.value.trim() || c.email;
  c.phone = document.getElementById('prof-phone')?.value.trim() || c.phone;
  c.employmentStatus = document.getElementById('prof-status')?.value || c.employmentStatus;
  c.linkedin = document.getElementById('prof-linkedin')?.value.trim() || c.linkedin;
  c.github = document.getElementById('prof-github')?.value.trim() || c.github;
  c.summary = document.getElementById('prof-summary')?.value.trim() || c.summary;

  const skillsStr = document.getElementById('prof-skills')?.value.trim() || '';
  c.primarySkills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);

  const secSkillsStr = document.getElementById('prof-secondary-skills')?.value.trim() || '';
  c.secondarySkills = secSkillsStr.split(',').map(s => s.trim()).filter(Boolean);

  const sectorsStr = document.getElementById('prof-sectors')?.value.trim() || '';
  c.targetSectors = sectorsStr.split(',').map(s => s.trim()).filter(Boolean);

  const dealbreakersStr = document.getElementById('prof-dealbreakers')?.value.trim() || '';
  c.dealbreakers = dealbreakersStr.split(',').map(s => s.trim()).filter(Boolean);

  // Read Languages
  const langRows = document.querySelectorAll('.profile-lang-row');
  c.languages = [];
  langRows.forEach(row => {
    const name = row.querySelector('.lang-name-input')?.value.trim();
    const lvl = row.querySelector('.lang-level-select')?.value;
    if (name) {
      c.languages.push({ language: name, level: lvl });
    }
  });

  // Read Experiences
  const expBlocks = document.querySelectorAll('.profile-exp-block');
  c.experience = [];
  expBlocks.forEach(b => {
    const role = b.querySelector('.exp-role-input')?.value.trim();
    const company = b.querySelector('.exp-company-input')?.value.trim();
    const loc = b.querySelector('.exp-location-input')?.value.trim() || 'Copenhagen';
    const period = b.querySelector('.exp-period-input')?.value.trim() || '2023 - 2026';
    const bulletsRaw = b.querySelector('.exp-bullets-input')?.value.trim() || '';
    const resps = bulletsRaw.split(/\r?\n/).map(s => s.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);

    if (role && company) {
      c.experience.push({
        role: role,
        company: company,
        location: loc,
        period: period,
        responsibilities: resps.length > 0 ? resps : ['Delivered engineering results and high-impact software systems.']
      });
    }
  });

  // Read Educations
  const eduBlocks = document.querySelectorAll('.profile-edu-block');
  c.education = [];
  eduBlocks.forEach(b => {
    const degree = b.querySelector('.edu-degree-input')?.value.trim();
    const inst = b.querySelector('.edu-inst-input')?.value.trim();
    const period = b.querySelector('.edu-period-input')?.value.trim() || '2020 - 2023';
    const thesis = b.querySelector('.edu-thesis-input')?.value.trim() || '';

    if (degree && inst) {
      c.education.push({
        degree: degree,
        institution: inst,
        period: period,
        thesis: thesis
      });
    }
  });

  // Persist to localStorage
  localStorage.setItem('ai_job_candidate', JSON.stringify(AppState.candidate));

  // Sync to Tailoring Studio, Evaluator, and Application forms
  generateTailoredMaterials();
  if (typeof initApplicationFormsGenerator === 'function') initApplicationFormsGenerator();

  if (typeof showToast === 'function') {
    showToast('💾 Profile saved successfully! CV, Cover Letter, and Evaluator updated.', 'success');
  } else {
    alert('Profile saved successfully! All tools updated.');
  }

  // Update profile header card if rendered in features
  const headerName = document.querySelector('.profile-identity h2');
  if (headerName) headerName.innerText = c.name;
}

function setFormVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function exportClaudeMdFile() {
  const c = AppState.candidate;
  const content = `# Job Application Assistant for ${c.name}

## Candidate Profile
- **Name:** ${c.name}
- **Location:** ${c.location}
- **Headline:** "${c.headline || c.title}"
- **Summary:** ${c.summary}

### Languages
${c.languages.map(l => `- **${l.language}:** ${l.level}`).join('\n')}

### Technical Skills
- **Primary:** ${c.primarySkills.join(', ')}
- **Secondary:** ${c.secondarySkills.join(', ')}

### Target Sectors
${c.targetSectors.map(s => `- ${s}`).join('\n')}

### Deal-breakers
${c.dealbreakers.map(d => `- ${d}`).join('\n')}
`;

  downloadFile(content, 'CLAUDE.md', 'text/markdown');
}

// ==========================================
// 10. CLI COMMAND SIMULATOR & QUICK REFERENCE
// ==========================================
function initCliGuide() {
  const cmdBtns = document.querySelectorAll('.cli-demo-btn');
  const termOutput = document.getElementById('terminal-live-output');

  cmdBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      cmdBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cmd = btn.getAttribute('data-cmd');
      simulateTerminalCommand(cmd, termOutput);
    });
  });

  // Pre-run first demo command
  if (termOutput) {
    simulateTerminalCommand('/scrape', termOutput);
  }
}

function simulateTerminalCommand(cmd, container) {
  if (!container) return;

  const responses = {
    '/setup': `
<span class="term-prompt">$ claude</span>
<span class="term-input">&gt; /setup</span>
<span class="term-output">
Checking environment...
Detected documents/ folder with:
  - 1 CV (PDF)
  - 1 LinkedIn Profile export
  - 2 Reference Letters
Reading and parsing candidate materials...
[+] Extracted candidate identity: Mads Lorentzen
[+] Identified 14 primary technical competencies
[+] Calibrated 5 target industries & commute preferences
Updated CLAUDE.md and candidate profile successfully. Ready to search!
</span>`,

    '/scrape': `
<span class="term-prompt">$ claude</span>
<span class="term-input">&gt; /scrape</span>
<span class="term-output">
Running multi-portal search orchestrator:
  → Querying Jobindex CLI... 18 postings found.
  → Querying LinkedIn CLI... 14 postings found.
  → Querying FreeHire CLI... 9 postings found.
  → Querying Akademikernes Jobbank CLI... 6 postings found.
Deduplicating across portals... (32 unique jobs)
Filtering by language & profile gates...
✓ 6 Top Matched Postings Loaded:
  1. Novo Nordisk A/S - Senior AI Engineer (94% Fit)
  2. Ørsted - Full Stack ML Engineer (91% Fit)
  3. Ambu A/S - Research Engineer in AI (88% Fit)
  4. SimCorp - Lead Python / AI Architect (86% Fit)
Type '/apply 1' or '/rank' to batch score!
</span>`,

    '/rank': `
<span class="term-prompt">$ claude</span>
<span class="term-input">&gt; /rank</span>
<span class="term-output">
Batch-evaluating 6 scraped postings against 5-dimension fit framework:
Parallel agents analyzing requirements & vetting integrity:
  [Novo Nordisk]  Tech: 94% | Exp: 92% | Guard: VERIFIED SAFE  → Fit: 94% [STRONG]
  [Ørsted]        Tech: 92% | Exp: 90% | Guard: VERIFIED SAFE  → Fit: 91% [STRONG]
  [Ambu]          Tech: 88% | Exp: 86% | Guard: VERIFIED SAFE  → Fit: 88% [STRONG]
  [SimCorp]       Tech: 86% | Exp: 85% | Guard: VERIFIED SAFE  → Fit: 86% [STRONG]
  [Maersk]        Tech: 82% | Exp: 80% | Guard: VERIFIED SAFE  → Fit: 82% [MODERATE]
Ranked shortlist generated. Proceeding with top candidate.
</span>`,

    '/apply': `
<span class="term-prompt">$ claude</span>
<span class="term-input">&gt; /apply https://jobindex.dk/job/novo-ai-engineer-10492</span>
<span class="term-output">
Fetching job posting... 100%
Running Posting Guard: ZERO-WIDTH CHARS: 0, PROMPT INJECTIONS: NONE.
Evaluating Fit: 94% Strong Match.
Checking Salary Benchmarks: Novo Nordisk Data/AI Index: 124.5 (Above Market Median)
Drafting tailored moderncv LaTeX CV...
  → Emphasizing multi-agent workflows, FastAPI, PyTorch
Drafting forward-looking cover letter with 3-paragraph STAR framing...
Starting secondary reviewer agent verification pass...
  ✓ Verification Checklist: ATS parseable, fontspec compiled, 0 typos.
Saved artifacts:
  - cv/main_novo_nordisk_senior_ai_engineer.tex
  - cover_letters/cover_novo_nordisk_senior_ai_engineer.tex
Updated job_search_tracker.csv row status to 'drafted'.
</span>`,

    '/interview': `
<span class="term-prompt">$ claude</span>
<span class="term-input">&gt; /interview "Novo Nordisk"</span>
<span class="term-output">
Loading archived application pack for Novo Nordisk A/S:
  - Target Role: Senior AI Engineer
  - Submitted Materials: main_novo.tex, cover_novo.tex
Company Research Verification:
  - Focus: Digital Science, automated molecular intelligence
Generating Stage-Specific Prep:
  [1] Technical Deep-Dive System Design: RAG vs Agentic Swarms
  [2] Behavioral STAR Scenarios: Bridging Geophysics to AI Engineering
  [3] 5 Insightful Questions to ask VP of Data Science
Starting Interactive Roleplay Mock Interview. Say 'Ready' when prepared.
</span>`,

    '/outcome': `
<span class="term-prompt">$ claude</span>
<span class="term-input">&gt; /outcome followup</span>
<span class="term-output">
Scanning active applications in tracker...
Found 1 application silent for &gt;10 days:
  - Ambu A/S (Research Engineer) | Applied: 2026-10-28 (11 days ago)
Drafting polite follow-up email in your personal tone:
  "Dear Lars, Following up on my application for the Research Engineer role..."
Review draft above. Confirm to archive draft [y/N]?
</span>`,

    '/html-report': `
<span class="term-prompt">$ claude</span>
<span class="term-input">&gt; /html-report --open</span>
<span class="term-output">
Reading job_search_tracker.csv (7 applications)...
Merging outcome.md interview histories...
Computing summary metrics:
  - Total Sent: 6 | Active: 1 | Interview: 2 | Offer: 1 | Hired: 1
  - Funnel Conversion Rate: 67% (reached interview or beyond)
Generated standalone self-contained dashboard:
  → reports/application-dashboard.html
Opening dashboard in browser... Done!
</span>`
  };

  container.innerHTML = responses[cmd] || '<span class="term-output">Command output ready.</span>';
}

// Utility: HTML Escaping
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

