/**
 * AI Job Search - Default Seed Data
 * Provides default data for all interactive tools: Scraper, Evaluator,
 * Tailoring Studio, Salary Lookup, Pipeline Tracker, Interview Coach, and Upskill Lab.
 */

const DEFAULT_CANDIDATE = {
  name: "Mads Lorentzen",
  title: "AI Engineer & Data Scientist",
  location: "Copenhagen, Denmark (Hybrid / Remote preferred)",
  email: "mads.lorentzen@example.com",
  phone: "+45 20 12 34 56",
  linkedin: "linkedin.com/in/mads-lorentzen",
  github: "github.com/mads-lorentzen",
  portfolio: "madslorentzen.dev",
  headline: "Geophysicist turned AI Engineer | Python, LLM Systems, Scalable Pipelines & Machine Learning",
  summary: "Quantitative researcher with a PhD background in geophysics transitioned into AI engineering. Experienced in building robust data pipelines, training ML models, deploying LLM agents, and translating complex mathematical concepts into production-grade software.",
  employmentStatus: "Actively Looking",
  languages: [
    { language: "Danish", level: "Native" },
    { language: "English", level: "C2 (Full Professional)" },
    { language: "German", level: "B1 (Conversational)" }
  ],
  education: [
    {
      degree: "M.Sc. / Ph.D. in Geophysics & Numerical Modeling",
      institution: "University of Copenhagen / DTU",
      period: "2018 - 2023",
      thesis: "High-Performance Numerical Inversion and Machine Learning in Seismic Signal Processing",
      highlights: "Published 3 peer-reviewed articles; developed C++ and Python simulation kernels."
    },
    {
      degree: "B.Sc. in Physics & Geosciences",
      institution: "Aarhus University",
      period: "2015 - 2018",
      highlights: "Focus on classical mechanics, computational physics, and statistics."
    }
  ],
  experience: [
    {
      role: "AI / Data Engineer",
      company: "Nordic Tech Solutions",
      location: "Copenhagen",
      period: "2023 - 2026",
      responsibilities: [
        "Architected an automated multi-agent workflow reducing manual document processing time by 75%.",
        "Engineered scalable data extraction and embedding pipelines processing 2M+ records daily with Python & FastAPI.",
        "Implemented rigorous evaluation frameworks ensuring 99.2% accuracy in automated classification tasks."
      ]
    },
    {
      role: "Computational Researcher & Data Scientist",
      company: "GeoAnalytics Lab",
      location: "Lyngby",
      period: "2020 - 2023",
      responsibilities: [
        "Developed custom optimization algorithms for 3D subsurface imaging using PyTorch, NumPy, and MPI.",
        "Collaborated with cross-functional international teams to present findings at major European conferences."
      ]
    }
  ],
  primarySkills: ["Python", "PyTorch", "LLMs / Agentic Systems", "FastAPI", "SQL / PostgreSQL", "Docker", "Git", "Data Pipelines"],
  secondarySkills: ["TypeScript / JavaScript", "Rust basics", "AWS / GCP Cloud", "Tailwind CSS", "Linux CLI", "LaTeX", "CI/CD Actions"],
  domainExpertise: ["Applied Machine Learning", "Retrieval-Augmented Generation (RAG)", "Scientific Computing", "Algorithmic Inversion", "Data Engineering"],
  targetSectors: ["AI & Machine Learning", "Green Tech & Energy", "Software & SaaS", "BioTech / HealthTech", "FinTech"],
  dealbreakers: ["Relocation outside Greater Copenhagen", "100% on-site requirement with long commute", "No engineering autonomy"]
};

const SAMPLE_JOBS = [
  {
    id: "job-001",
    portal: "Jobindex",
    portalKey: "jobindex",
    title: "Senior AI Engineer (LLM & Agents)",
    company: "Novo Nordisk A/S",
    location: "Bagsværd, Copenhagen",
    sector: "Pharma / BioTech",
    roleType: "Full-time",
    workplace: "Hybrid",
    deadline: "2026-11-28",
    postedDate: "2026-11-04",
    url: "https://jobindex.dk/job/novo-ai-engineer-10492",
    salaryEstimate: "72,000 - 85,000 DKK/mo",
    matchScore: 94,
    tags: ["Python", "LLMs", "RAG", "PyTorch", "Docker"],
    description: `About the Role:
At Novo Nordisk Digital Science, we are looking for a Senior AI Engineer to spearhead our agentic automation and molecular data extraction initiatives. You will work closely with bio-informaticians and research scientists to design and deploy state-of-the-art LLM workflows.

Key Responsibilities:
- Design, evaluate, and productionize multi-agent systems and RAG architectures for biomedical literature search.
- Develop low-latency microservices with Python, FastAPI, and containerized Docker deployments.
- Build automated testing and safety guardrails for agentic tool use.
- Mentor junior engineers and collaborate with internal stakeholders across Scandinavia.

Requirements:
- Master's or PhD degree in Computer Science, Physics, Engineering, or a related quantitative field.
- 3+ years of hands-on experience developing production Python machine learning applications.
- Proven experience with LLMs, prompt engineering, vector databases, and evaluation frameworks.
- Strong knowledge of software engineering principles: CI/CD, unit testing, git, and clean code.
- Fluent in English. Danish is an advantage but not required.`
  },
  {
    id: "job-002",
    portal: "LinkedIn",
    portalKey: "linkedin",
    title: "Full Stack Machine Learning Engineer",
    company: "Ørsted",
    location: "Gentofte, Denmark",
    sector: "Green Tech & Energy",
    roleType: "Full-time",
    workplace: "Hybrid (2 days remote)",
    deadline: "2026-12-05",
    postedDate: "2026-11-06",
    url: "https://linkedin.com/jobs/view/orsted-ml-engineer-883",
    salaryEstimate: "68,000 - 78,000 DKK/mo",
    matchScore: 91,
    tags: ["Python", "Cloud (Azure)", "Time-series", "FastAPI", "DevOps"],
    description: `Shape the future of green energy with Ørsted. We are seeking a passionate ML Engineer to join our Offshore Wind Yield Analytics team.

What you will do:
- Develop predictive models for offshore wind energy production using weather data and real-time turbine sensor streams.
- Build and maintain data pipelines using Python, SQL, Azure Data Factory, and Databricks.
- Deploy predictive APIs into containerized Kubernetes clusters with automated CI/CD.
- Work closely with geoscientists, meteorologists, and software developers.

Your Profile:
- Degree in quantitative sciences (Physics, Geophysics, Engineering, Math, or Computer Science).
- Solid coding skills in Python, NumPy, Pandas, Scikit-learn, and PyTorch.
- Experience with cloud infrastructure (Azure or AWS) and Docker.
- Curiosity to solve complex physical-world engineering problems with machine learning.`
  },
  {
    id: "job-003",
    portal: "FreeHire",
    portalKey: "freehire",
    title: "Lead Python / AI Backend Architect",
    company: "SimCorp",
    location: "Copenhagen",
    sector: "FinTech / Enterprise",
    roleType: "Full-time",
    workplace: "Flexible Hybrid",
    deadline: "2026-11-30",
    postedDate: "2026-11-02",
    url: "https://freehire.me/job/simcorp-ai-backend-9311",
    salaryEstimate: "75,000 - 90,000 DKK/mo",
    matchScore: 86,
    tags: ["Python", "FastAPI", "PostgreSQL", "Kafka", "Microservices"],
    description: `SimCorp is modernizing investment management platforms with next-generation automated analytics.

Your Mission:
- Lead the architecture and implementation of AI-assisted financial document extraction and portfolio forecasting services.
- Write robust, asynchronous Python backend services using FastAPI, asyncio, and event streaming (Kafka/RabbitMQ).
- Implement enterprise-grade observability, telemetry, and automated security verification.
- Collaborate with quantitative analysts and front-end engineers.

Requirements:
- 5+ years of software development experience with deep Python mastery.
- Experience building scalable REST/GraphQL APIs and distributed architectures.
- Experience with relational databases (PostgreSQL) and database optimization.
- Strong communication skills and enthusiasm for developer tooling.`
  },
  {
    id: "job-004",
    portal: "Jobnet",
    portalKey: "jobnet",
    title: "Data Scientist - Advanced Analytics",
    company: "Maersk",
    location: "Copenhagen Port",
    sector: "Logistics & Supply Chain",
    roleType: "Full-time",
    workplace: "On-site / Hybrid",
    deadline: "2026-12-15",
    postedDate: "2026-11-05",
    url: "https://jobnet.dk/job/maersk-data-scientist-4421",
    salaryEstimate: "65,000 - 76,000 DKK/mo",
    matchScore: 82,
    tags: ["Python", "Optimization", "Predictive ML", "Docker", "SQL"],
    description: `Join A.P. Moller - Maersk to optimize global ocean freight operations through data-driven intelligence.

Responsibilities:
- Build optimization and machine learning algorithms for container allocation and vessel routing.
- Process massive telemetry datasets from thousands of container vessels globally.
- Partner with product managers and fleet captains to test models in real shipping corridors.

Qualifications:
- Solid background in computational sciences, mathematics, or physics.
- Proficiency in Python, SQL, statistical modeling, and data visualization.
- Practical experience with git, Linux, and containerization.`
  },
  {
    id: "job-005",
    portal: "Akademikernes Jobbank",
    portalKey: "jobbank",
    title: "Research Engineer in AI & Sensor Systems",
    company: "Ambu A/S",
    location: "Ballerup",
    sector: "Medical Devices",
    roleType: "Full-time",
    workplace: "Hybrid",
    deadline: "2026-12-10",
    postedDate: "2026-11-03",
    url: "https://jobbank.dk/job/ambu-research-engineer-592",
    salaryEstimate: "62,000 - 74,000 DKK/mo",
    matchScore: 88,
    tags: ["Computer Vision", "Signal Processing", "Python", "C++", "PyTorch"],
    description: `Ambu develops single-use endoscopy products that save human lives every day.

We are seeking a Research Engineer for our innovation center:
- Apply computer vision and image processing to real-time endoscopic video streams.
- Design deep learning algorithms for lesion detection and anatomical landmark segmentation.
- Work with embedded software teams to quantize neural nets for on-device inference.

Candidate Profile:
- PhD or MSc in Biomedical Engineering, Physics, Signal Processing, or Computer Science.
- Strong foundation in linear algebra, digital signal/image processing, and PyTorch.
- Experience with edge deployments or C++ is a plus.`
  },
  {
    id: "job-006",
    portal: "Jobdanmark",
    portalKey: "jobdanmark",
    title: "Cloud Data Engineer",
    company: "Netcompany",
    location: "Aalborg / Aarhus / Copenhagen",
    sector: "IT Consulting",
    roleType: "Full-time",
    workplace: "Hybrid",
    deadline: "2026-11-25",
    postedDate: "2026-11-01",
    url: "https://jobdanmark.dk/job/netcompany-cloud-data-332",
    salaryEstimate: "58,000 - 70,000 DKK/mo",
    matchScore: 78,
    tags: ["Azure", "SQL", "Python", "DataOps", "ETL"],
    description: `Netcompany is delivering critical digital transformations across Scandinavian public and private enterprises.

Role:
- Build modern cloud data lakes and integration pipelines using Azure, Python, and SQL.
- Implement robust DataOps, automated data quality checks, and CI/CD pipelines.
- Collaborate with business analysts and government stakeholders.

Requirements:
- Bachelor's or Master's in IT, Computer Science, or similar.
- Fluency in Danish and English (Danish client projects require Danish proficiency).`
  },
  {
    id: "job-007",
    portal: "LinkedIn",
    portalKey: "linkedin",
    title: "Senior MLOps & Platform Engineer",
    company: "Spotify",
    location: "Stockholm / Remote EU",
    sector: "Music & Streaming",
    roleType: "Full-time",
    workplace: "Remote",
    deadline: "2026-12-18",
    postedDate: "2026-11-07",
    url: "https://linkedin.com/jobs/view/spotify-mlops-engineer-921",
    salaryEstimate: "85,000 - 105,000 SEK/mo",
    matchScore: 92,
    language: "English",
    tags: ["Python", "Kubernetes", "Ray", "MLflow", "Docker", "GCP"],
    description: `Spotify's Personalization Infrastructure team is hiring a Senior MLOps Engineer.
You will architect the distributed training clusters and model serving pipelines delivering audio recommendations to 600M+ users.

What you will do:
- Scale high-throughput machine learning inference on Google Cloud Platform and Kubernetes.
- Collaborate with audio research scientists to transition PyTorch prototypes to production.
- Build automated regression, bias detection, and canary deployment systems.

Requirements:
- 4+ years building production data pipelines and deploying ML models.
- Deep expertise in Python, Docker, Kubernetes, and cloud infrastructure.`
  },
  {
    id: "job-008",
    portal: "LinkedIn",
    portalKey: "linkedin",
    title: "Ingénieur R&D en Intelligence Artificielle (LLM & Agents)",
    company: "Mistral AI",
    location: "Paris / Remote",
    sector: "AI & Machine Learning",
    roleType: "Full-time",
    workplace: "Hybrid",
    deadline: "2026-12-20",
    postedDate: "2026-11-06",
    url: "https://linkedin.com/jobs/view/mistral-ai-rd-engineer-512",
    salaryEstimate: "80 000 - 100 000 €/an",
    matchScore: 95,
    language: "French",
    tags: ["PyTorch", "LLMs", "Inférence Distribuée", "CUDA", "FastAPI"],
    description: `À propos du poste:
Mistral AI développe des modèles de fondation ouverts et performants. Nous recrutons un(e) Ingénieur(e) R&D pour concevoir des architectures d'agents et optimiser nos pipelines d'inférence haute performance.

Missions:
- Développer et optimiser les kernels d'inférence pour modèles de langage (LLM).
- Concevoir des frameworks d'évaluation systématiques et des outils agentiques.
- Collaborer avec l'équipe de recherche fondamentale sur l'alignement et le raisonnement.

Profil recherché:
- Diplôme d'ingénieur ou Doctorat en mathématiques, physique théorique ou informatique.
- Excellente maîtrise de Python, PyTorch et du calcul distribué.
- Esprit d'autonomie et passion pour les systèmes haute performance.`
  },
  {
    id: "job-009",
    portal: "Indeed",
    portalKey: "indeed",
    title: "Senior Python & Data Infrastructure Engineer",
    company: "Delivery Hero",
    location: "Berlin, Germany / Hybrid",
    sector: "Logistics & FoodTech",
    roleType: "Full-time",
    workplace: "Hybrid",
    deadline: "2026-12-08",
    postedDate: "2026-11-05",
    url: "https://indeed.com/viewjob?jk=delivery-hero-python-88",
    salaryEstimate: "75,000 - 92,000 €/yr",
    matchScore: 89,
    language: "German",
    tags: ["Python", "FastAPI", "PostgreSQL", "Kafka", "AWS"],
    description: `Delivery Hero is building the world's leading quick-commerce ecosystem.
We are looking for a Senior Python Developer to build real-time dispatching and routing engines.

Responsibilities:
- Build low-latency event-driven microservices handling 50k+ transactions per minute.
- Maintain high-availability PostgreSQL and Redis caching layers.
- Implement robust integration testing and observability metrics.

Requirements:
- Strong experience with Python asynchronous programming (asyncio, FastAPI).
- English fluency is required; German is a plus.`
  },
  {
    id: "job-010",
    portal: "Glassdoor",
    portalKey: "glassdoor",
    title: "Lead AI Research Scientist - Audio & Hearing",
    company: "Demant A/S",
    location: "Smørum, Copenhagen",
    sector: "Medical Devices & Hearing Care",
    roleType: "Full-time",
    workplace: "Hybrid",
    deadline: "2026-12-14",
    postedDate: "2026-11-04",
    url: "https://glassdoor.com/job-listing/demant-ai-research-scientist-41",
    salaryEstimate: "70,000 - 84,000 DKK/mo",
    matchScore: 93,
    language: "English",
    tags: ["Deep Learning", "Audio DSP", "Signal Processing", "PyTorch", "C++"],
    description: `Demant is a global leader in hearing healthcare. In our Oticon AI Research group, we are pushing the boundaries of neural sound processing for hearing aids.

What you will do:
- Design neural network architectures for real-time speech enhancement in challenging acoustic environments.
- Translate scientific research in acoustics and numerical modeling into embedded edge devices.
- Author scientific publications and protect IP through patents.

Requirements:
- PhD in Physics, Electrical Engineering, Geophysics, or Computer Science.
- Proven expertise in digital signal processing and deep neural networks.`
  },
  {
    id: "job-011",
    portal: "Wellfound",
    portalKey: "wellfound",
    title: "Founding AI Engineer (Equity + Salary)",
    company: "Nordic Health AI (Techstars Backed)",
    location: "Copenhagen / Remote",
    sector: "BioTech / HealthTech",
    roleType: "Full-time",
    workplace: "Remote",
    deadline: "2026-12-30",
    postedDate: "2026-11-08",
    url: "https://wellfound.com/company/nordic-health-ai/jobs/founding-ai-engineer",
    salaryEstimate: "65,000 - 75,000 DKK + 1.5% Equity",
    matchScore: 90,
    language: "English",
    tags: ["FastAPI", "LLMs", "RAG", "Next.js", "PostgreSQL"],
    description: `Join as our first dedicated AI Engineer to build automated patient clinical intake pipelines.
High autonomy, rapid prototyping, direct equity ownership, and full architecture responsibility from day one.`
  }
];

const SALARY_BENCHMARKS = {
  metadata: {
    source: "Danish Tech & Engineering Union Benchmark 2025/2026",
    index_baseline: 100,
    index_label: "Market Index",
    baseline_description: "Index 100 = Danish private sector median for Tech & STEM (approx. 62,500 DKK/mo)",
    median_base_dkk: 62500,
    currency: "DKK"
  },
  companies: [
    {
      company: "Novo Nordisk A/S",
      aliases: ["novo", "novo nordisk", "novo nordisk aps"],
      city: "Bagsværd / Copenhagen",
      categories: {
        all_employees: { count: 1450, index: 114.2, avg_salary_dkk: 71375 },
        engineering: { count: 420, index: 119.8, avg_salary_dkk: 74875 },
        data_ai: { count: 185, index: 124.5, avg_salary_dkk: 77810 },
        management: { count: 110, index: 135.0, avg_salary_dkk: 84375 }
      },
      benefits: ["10% pension contribution", "Annual bonus scheme (8-15%)", "Flexible hybrid schedule", "Health insurance"]
    },
    {
      company: "Ørsted A/S",
      aliases: ["orsted", "oersted", "dong energy"],
      city: "Gentofte / Fredericia",
      categories: {
        all_employees: { count: 890, index: 110.5, avg_salary_dkk: 69060 },
        engineering: { count: 340, index: 115.4, avg_salary_dkk: 72125 },
        data_ai: { count: 120, index: 121.0, avg_salary_dkk: 75625 },
        management: { count: 75, index: 129.5, avg_salary_dkk: 80930 }
      },
      benefits: ["10.5% pension", "Green energy discount", "5 weeks paid vacation + 5 flex days", "Parental leave 24 weeks"]
    },
    {
      company: "SimCorp A/S",
      aliases: ["simcorp", "simcorp aps"],
      city: "Copenhagen",
      categories: {
        all_employees: { count: 620, index: 116.0, avg_salary_dkk: 72500 },
        engineering: { count: 280, index: 122.3, avg_salary_dkk: 76430 },
        data_ai: { count: 95, index: 126.8, avg_salary_dkk: 79250 }
      },
      benefits: ["Stock purchase program", "Catered lunch", "Training budget 20,000 DKK/yr", "International mobility"]
    },
    {
      company: "A.P. Møller - Mærsk A/S",
      aliases: ["maersk", "mærsk", "ap moller", "maersk line"],
      city: "Copenhagen",
      categories: {
        all_employees: { count: 1850, index: 112.0, avg_salary_dkk: 70000 },
        engineering: { count: 510, index: 118.2, avg_salary_dkk: 73875 },
        data_ai: { count: 240, index: 123.4, avg_salary_dkk: 77125 }
      },
      benefits: ["Global career tracks", "8% company pension", "Subsidized fitness and canteen", "Bonus program"]
    },
    {
      company: "Netcompany A/S",
      aliases: ["netcompany", "netcompany it"],
      city: "Copenhagen / Aarhus / Aalborg",
      categories: {
        all_employees: { count: 2100, index: 104.5, avg_salary_dkk: 65310 },
        engineering: { count: 1400, index: 108.2, avg_salary_dkk: 67625 },
        data_ai: { count: 320, index: 114.0, avg_salary_dkk: 71250 }
      },
      benefits: ["Rapid promotion cycles", "Netcompany Academy", "Social events & Friday bars", "Pension & health care"]
    },
    {
      company: "LEGO Group",
      aliases: ["lego", "lego system a/s", "lego group"],
      city: "Billund / Copenhagen",
      categories: {
        all_employees: { count: 1650, index: 113.8, avg_salary_dkk: 71125 },
        engineering: { count: 480, index: 119.0, avg_salary_dkk: 74375 },
        data_ai: { count: 160, index: 125.2, avg_salary_dkk: 78250 }
      },
      benefits: ["50% LEGO staff discount", "Generous bonus scheme", "Global hubs in Copenhagen & Billund"]
    },
    {
      company: "Ambu A/S",
      aliases: ["ambu"],
      city: "Ballerup",
      categories: {
        all_employees: { count: 450, index: 109.4, avg_salary_dkk: 68375 },
        engineering: { count: 180, index: 114.8, avg_salary_dkk: 71750 },
        data_ai: { count: 50, index: 120.5, avg_salary_dkk: 75310 }
      },
      benefits: ["High-impact healthcare work", "9% pension", "Hybrid working model", "Fitness center on-site"]
    },
    {
      company: "Coloplast A/S",
      aliases: ["coloplast"],
      city: "Humlebæk",
      categories: {
        all_employees: { count: 980, index: 111.0, avg_salary_dkk: 69375 },
        engineering: { count: 290, index: 116.5, avg_salary_dkk: 72810 },
        data_ai: { count: 70, index: 122.0, avg_salary_dkk: 76250 }
      },
      benefits: ["10% pension", "Seaside campus & canteen", "Global rotation programs", "Healthcare"]
    },
    {
      company: "Vestas Wind Systems A/S",
      aliases: ["vestas", "vestas wind"],
      city: "Aarhus / Copenhagen",
      categories: {
        all_employees: { count: 1350, index: 108.5, avg_salary_dkk: 67810 },
        engineering: { count: 620, index: 114.0, avg_salary_dkk: 71250 },
        data_ai: { count: 110, index: 120.0, avg_salary_dkk: 75000 }
      },
      benefits: ["Pioneer in renewable wind tech", "9.5% pension", "Flexible hours", "Health insurance"]
    }
  ]
};

const SAMPLE_APPLICATIONS = [
  {
    id: "app-101",
    date: "2026-10-12",
    company: "Novo Nordisk A/S",
    sector: "Pharma / BioTech",
    role: "Senior AI Engineer",
    role_type: "Full-time",
    channel: "Jobindex",
    status: "interview",
    contact_person: "Dr. Karen Vestergaard (Hiring Manager)",
    fit_rating: "94%",
    notes: "Passed technical coding round and LLM architecture test. Round 2 scheduled with VP of Data Science on Nov 14.",
    cv_file: "cv/main_novo_ai_engineer.tex",
    cover_letter_file: "cover_letters/cover_novo_ai_engineer.tex",
    source: "https://jobindex.dk/job/novo-ai-engineer-10492",
    deadline: "2026-11-28",
    history: [
      { date: "2026-10-12", event: "Applied via portal with tailored CV & cover letter" },
      { date: "2026-10-20", event: "Recruiter phone screening passed (45 min)" },
      { date: "2026-11-02", event: "Technical architectural deep-dive & coding challenge (A+)" }
    ]
  },
  {
    id: "app-102",
    date: "2026-10-18",
    company: "Ørsted",
    sector: "Green Tech & Energy",
    role: "ML Engineer - Offshore Wind",
    role_type: "Full-time",
    channel: "LinkedIn",
    status: "offer",
    contact_person: "Morten Jensen (Team Lead)",
    fit_rating: "91%",
    notes: "Offer received: 74,000 DKK/mo + 10.5% pension + 24 days flex. Reviewing contract deadline Nov 18.",
    cv_file: "cv/main_orsted_ml_engineer.tex",
    cover_letter_file: "cover_letters/cover_orsted_ml_engineer.tex",
    source: "https://linkedin.com/jobs/view/orsted-ml-engineer-883",
    deadline: "2026-12-05",
    history: [
      { date: "2026-10-18", event: "Submitted application via referral" },
      { date: "2026-10-27", event: "Round 1 Interview with Team Lead" },
      { date: "2026-11-04", event: "Round 2 Presentation of geophysical time-series modeling" },
      { date: "2026-11-07", event: "Formal Offer extended!" }
    ]
  },
  {
    id: "app-103",
    date: "2026-10-25",
    company: "SimCorp",
    sector: "FinTech / Enterprise",
    role: "Lead Python / AI Backend Architect",
    role_type: "Full-time",
    channel: "FreeHire",
    status: "interview",
    contact_person: "Camilla Lind (Talent Partner)",
    fit_rating: "86%",
    notes: "Completed 1st interview. Discussed distributed asyncio pipelines and system design. Waiting for stage 2 invite.",
    cv_file: "cv/main_simcorp_architect.tex",
    cover_letter_file: "cover_letters/cover_simcorp_architect.tex",
    source: "https://freehire.me/job/simcorp-ai-backend-9311",
    deadline: "2026-11-30",
    history: [
      { date: "2026-10-25", event: "Applied" },
      { date: "2026-11-03", event: "First interview with engineering director" }
    ]
  },
  {
    id: "app-104",
    date: "2026-10-28",
    company: "Ambu A/S",
    sector: "Medical Devices",
    role: "Research Engineer in AI & Sensor Systems",
    role_type: "Full-time",
    channel: "Akademikernes Jobbank",
    status: "applied",
    contact_person: "Lars Kofoed",
    fit_rating: "88%",
    notes: "Applied with emphasis on computer vision, numerical signal processing, and medical imaging background.",
    cv_file: "cv/main_ambu_research_engineer.tex",
    cover_letter_file: "cover_letters/cover_ambu_research_engineer.tex",
    source: "https://jobbank.dk/job/ambu-research-engineer-592",
    deadline: "2026-12-10",
    history: [
      { date: "2026-10-28", event: "Application submitted" }
    ]
  },
  {
    id: "app-105",
    date: "2026-11-01",
    company: "Maersk",
    sector: "Logistics & Supply Chain",
    role: "Data Scientist - Advanced Analytics",
    role_type: "Full-time",
    channel: "Jobnet",
    status: "drafted",
    contact_person: "Rasmus Nielsen",
    fit_rating: "82%",
    notes: "Tailoring CV with emphasis on numerical optimization and large-scale telemetry data.",
    cv_file: "cv/main_maersk_data_scientist.tex",
    cover_letter_file: "cover_letters/cover_maersk_data_scientist.tex",
    source: "https://jobnet.dk/job/maersk-data-scientist-4421",
    deadline: "2026-12-15",
    history: [
      { date: "2026-11-01", event: "Scraped and drafted materials" }
    ]
  },
  {
    id: "app-106",
    date: "2026-09-15",
    company: "Netcompany",
    sector: "IT Consulting",
    role: "Senior Cloud Architect",
    role_type: "Full-time",
    channel: "Direct",
    status: "rejected",
    contact_person: "Thomas Berg",
    fit_rating: "72%",
    notes: "Required 100% fluent Danish on client site + full time travel. Good interview, but opted for a closer local fit.",
    cv_file: "cv/main_netcompany_cloud.tex",
    cover_letter_file: "cover_letters/cover_netcompany_cloud.tex",
    source: "https://netcompany.com/careers",
    deadline: "2026-10-01",
    history: [
      { date: "2026-09-15", event: "Applied" },
      { date: "2026-09-22", event: "HR Screen" },
      { date: "2026-09-29", event: "Polite rejection received citing client travel criteria" }
    ]
  },
  {
    id: "app-107",
    date: "2026-08-20",
    company: "Nordic AI Labs",
    sector: "Software & SaaS",
    role: "Machine Learning Researcher",
    role_type: "Full-time",
    channel: "LinkedIn",
    status: "hired",
    contact_person: "Sofie Møller",
    fit_rating: "96%",
    notes: "Past position where multi-agent pipeline and LLM benchmarking foundations were built.",
    cv_file: "cv/main_nordic_ai.tex",
    cover_letter_file: "cover_letters/cover_nordic_ai.tex",
    source: "https://linkedin.com",
    deadline: "2026-09-01",
    history: [
      { date: "2026-08-20", event: "Applied" },
      { date: "2026-09-05", event: "All rounds passed" },
      { date: "2026-09-10", event: "Signed contract!" }
    ]
  }
];

const INTERVIEW_PREP_DATA = {
  stages: [
    {
      id: "recruiter",
      name: "Recruiter Screen",
      duration: "30 mins",
      focus: "High-level background, motivation, salary alignment, culture fit, practical constraints."
    },
    {
      id: "technical",
      name: "Technical Deep-Dive",
      duration: "60-90 mins",
      focus: "System design, live coding, architectural trade-offs, ML evaluation, debugging."
    },
    {
      id: "hiring_manager",
      name: "Hiring Manager & Team",
      duration: "45-60 mins",
      focus: "Project ownership, collaboration under pressure, conflict resolution, domain vision."
    },
    {
      id: "cultural",
      name: "Executive & Culture Fit",
      duration: "45 mins",
      focus: "Company values, long-term career ambition, stakeholder management, curiosity."
    }
  ],
  starFlashcards: [
    {
      id: "star-1",
      category: "Technical Architecture",
      question: "Describe a time when you designed and deployed an automated AI or data pipeline that saved significant time or costs.",
      situation: "At Nordic Tech Solutions, manual classification and extraction of scientific reports took research teams 30+ hours weekly.",
      task: "I was tasked with engineering an automated ingestion and retrieval pipeline with high precision.",
      action: "I built a modular multi-agent workflow in Python and FastAPI using deterministic integrity filters, semantic embeddings, and automated regression tests.",
      result: "Processing time plummeted by 75%, extraction accuracy reached 99.2%, and researchers reclaimed 22 hours per week for active experimentation.",
      keyTakeaway: "Demonstrates practical engineering rigor over hype; emphasizes measurable business ROI."
    },
    {
      id: "star-2",
      category: "Handling Ambiguity & Complexity",
      question: "How do you handle a scenario where model outputs are nondeterministic or hallucinations arise in production?",
      situation: "During an LLM application pilot, free-form text generation produced inconsistent data types for downstream relational databases.",
      task: "Ensure deterministic output schema without sacrificing the expressive reasoning capabilities of LLMs.",
      action: "Implemented Pydantic structured extraction with retry loops, strict regex guardrails, and automated verification before database commits.",
      result: "Downstream pipeline failures dropped from 14% to 0.05%, creating a production-grade fault-tolerant service.",
      keyTakeaway: "Shows deep understanding of LLM reliability engineering and systems design."
    },
    {
      id: "star-3",
      category: "Bridging Backgrounds & Transition",
      question: "You transitioned from Geophysics to AI Engineering. How does your academic research background benefit software engineering?",
      situation: "Interviewers frequently ask whether academic research skills translate into commercial agile software development.",
      task: "Articulate how numerical inversion, signal processing, and scientific rigor translate directly into ML engineering.",
      action: "I explained that geophysics is essentially applied inverse problem solving: handling noisy real-world data, multi-dimensional optimization, and computational efficiency.",
      result: "Instead of being perceived as a gap, my mathematical and physics foundation became my strongest asset for understanding deep learning internals.",
      keyTakeaway: "Honest bridge framing that turns a perceived non-traditional path into a unique superpower."
    },
    {
      id: "star-4",
      category: "Conflict Resolution & Disagreement",
      question: "Tell me about a time you disagreed with a colleague on a technical decision and how you reached consensus.",
      situation: "Debating between building a fine-tuned custom open-source model vs implementing a RAG pipeline on managed cloud APIs.",
      task: "Reach an evidence-based consensus without slowing sprint velocity or creating friction.",
      action: "I proposed a 3-day timeboxed spike benchmark: we evaluated latency, dollar cost per 10k requests, and domain precision on 50 real sample queries.",
      result: "The benchmark clearly proved RAG was 4x cheaper and reached target accuracy with 80% less maintenance overhead. The team unified behind the decision.",
      keyTakeaway: "Data-driven decision making removes personal ego from technical choices."
    }
  ]
};

const UPSKILL_CATALOG = [
  {
    skill: "Kubernetes & Production Container Orchestration",
    category: "DevOps & Infrastructure",
    gapLevel: "Moderate",
    priority: "High",
    estimatedHours: 25,
    description: "Crucial for enterprise ML deployments at scale (Novo Nordisk, Maersk, Ørsted).",
    suggestedPath: [
      "CKAD fundamentals course on Udemy / KodeKloud",
      "Deploy a local multi-service FastAPI + Redis app with Minikube",
      "Configure Helm charts and automated zero-downtime rolling deploys"
    ],
    targetRoles: ["Senior AI Engineer", "MLOps Engineer", "Backend Architect"]
  },
  {
    skill: "Streaming Pipelines (Kafka / Apache Flink)",
    category: "Data Engineering",
    gapLevel: "High",
    priority: "High",
    estimatedHours: 30,
    description: "High demand in FinTech (SimCorp) and Real-time Logistics (Maersk).",
    suggestedPath: [
      "Confluent Kafka Developer Certification track",
      "Build an event-driven telemetry stream for simulated wind turbine data in Python",
      "Benchmark throughput and backpressure handling"
    ],
    targetRoles: ["Lead Python Architect", "Full Stack ML Engineer"]
  },
  {
    skill: "Enterprise Observability (OpenTelemetry & Prometheus)",
    category: "Production Readiness",
    gapLevel: "Low",
    priority: "Medium",
    estimatedHours: 15,
    description: "Standard for production AI agents and REST microservices.",
    suggestedPath: [
      "Instrument a FastAPI app with OpenTelemetry tracing and Grafana dashboards",
      "Implement latency percentiles (p95, p99) and alert routing"
    ],
    targetRoles: ["All Senior Engineering roles"]
  },
  {
    skill: "Danish Business Communication (Dansk til Erhverv)",
    category: "Language & Culture",
    gapLevel: "Low",
    priority: "Medium",
    estimatedHours: 20,
    description: "Elevates conversational Danish to confident technical and consulting meetings.",
    suggestedPath: [
      "Read Danish engineering trade magazines (Ingeniøren, Version2)",
      "Practice STAR interview scenarios in Danish"
    ],
    targetRoles: ["IT Consulting", "Public Sector Projects"]
  }
];

