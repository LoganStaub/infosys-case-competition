// Cache interactive elements once so event handlers do not repeatedly query the DOM.
const careerCards = [...document.querySelectorAll('.career-card')];
const randomButton = document.getElementById('random-career-btn');
const randomResult = document.getElementById('random-result');
const assessmentButton = document.getElementById('toggle-assessment-btn');
const assessmentPanel = document.getElementById('career-assessment');
const assessmentForm = document.getElementById('career-assessment-form');
const assessmentResult = document.getElementById('assessment-result');
const careerDetails = document.getElementById('career-details');
const careerDetailsContent = document.getElementById('career-details-content');
const detailsClose = document.getElementById('details-close');

// Role-specific content is kept in one keyed object. Each key must match a
// career card's `data-career` value and any values used by survey answers.
const careerProfiles = {
  developer: {
    intro: 'Turns user and business needs into working software for web, mobile, desktop, or internal systems.',
    dayToDay: 'Design features, write and review code, test and debug applications, join planning meetings, document decisions, and collaborate with designers, analysts, and other engineers.',
    skills: 'JavaScript or TypeScript, Python, Java, C#, or another core language; Git; APIs; SQL; testing; debugging; and a framework such as React, .NET, or Spring.',
    entry: 'Build and explain two or three complete projects, understand programming fundamentals and data structures, use Git confidently, query a database, and discuss how you tested your work.',
    salary: 'Approximate U.S. progression: $75k–$105k entry level, $105k–$145k mid-career, and $145k–$180k+ senior or lead. BLS projects 15% growth for software developers, QA analysts, and testers from 2024–2034.',
    strong: 'A strong candidate writes maintainable code, learns unfamiliar systems, communicates tradeoffs, accepts feedback, and can connect technical choices to a real user problem.',
    source: 'https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm'
  },
  analyst: {
    intro: 'Connects business problems with technology by studying processes, requirements, data flows, and system behavior.',
    dayToDay: 'Interview stakeholders, map current processes, write requirements and user stories, analyze gaps, coordinate testing, recommend system changes, and translate between technical and business teams.',
    skills: 'SQL, Excel, process mapping, requirements gathering, data modeling, Jira or Azure DevOps, diagramming tools, presentation skills, and familiarity with APIs and databases.',
    entry: 'Know how to ask useful discovery questions, create a process diagram, write clear requirements, perform basic SQL analysis, and explain a project where you improved a process.',
    salary: 'Approximate U.S. progression: $65k–$90k entry level, $90k–$120k mid-career, and $120k–$140k+ senior. BLS projects 9% growth for computer systems analysts from 2024–2034.',
    strong: 'A strong candidate is curious, structured, tactful with stakeholders, precise in documentation, and comfortable explaining the same issue to both executives and developers.',
    source: 'https://www.bls.gov/ooh/computer-and-information-technology/computer-systems-analysts.htm'
  },
  data: {
    intro: 'Uses data to explain what happened, predict what may happen, and help organizations make better decisions.',
    dayToDay: 'Clean and combine datasets, explore trends, build dashboards or statistical models, validate results, present findings, and work with teams to define useful metrics.',
    skills: 'SQL, Excel, Python or R, statistics, data visualization with Tableau or Power BI, data cleaning, experimentation, and clear written and verbal storytelling.',
    entry: 'Show portfolio projects with messy real-world data, write joins and aggregations in SQL, explain basic statistics, create readable visualizations, and state the limits of an analysis.',
    salary: 'Approximate U.S. progression: $70k–$100k entry level, $100k–$140k mid-career, and $140k–$170k+ senior. BLS projects 34% growth for data scientists from 2024–2034.',
    strong: 'A strong candidate checks assumptions, documents data quality issues, avoids overstating conclusions, and translates analysis into a decision someone can actually make.',
    source: 'https://www.bls.gov/ooh/math/data-scientists.htm'
  },
  cybersecurity: {
    intro: 'Protects systems, networks, applications, and data by identifying risk and responding to suspicious activity.',
    dayToDay: 'Monitor alerts and logs, investigate incidents, scan for vulnerabilities, manage access controls, document risk, support audits, test defenses, and teach safer practices.',
    skills: 'Networking, Linux and Windows, identity and access management, SIEM tools, vulnerability scanners, cloud security, scripting, incident response, and security frameworks such as NIST.',
    entry: 'Understand networking and operating-system fundamentals, practice in a home lab or cyber range, document investigations, know common attacks and controls, and consider Security+ or a similar foundational credential.',
    salary: 'Approximate U.S. progression: $75k–$105k entry level, $105k–$145k mid-career, and $145k–$175k+ senior. BLS projects 29% growth for information security analysts from 2024–2034.',
    strong: 'A strong candidate is ethical, calm under pressure, relentlessly curious, careful with evidence, and able to explain risk without drowning everyone in acronyms.',
    source: 'https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm'
  },
  'project-manager': {
    intro: 'Guides technology projects from idea to delivery by coordinating people, scope, schedule, budget, risk, and communication.',
    dayToDay: 'Build plans, lead stand-ups and status meetings, remove blockers, track budgets and risks, coordinate vendors, manage changes, and communicate progress to stakeholders.',
    skills: 'Project planning, Agile or Scrum, Jira, spreadsheets, budgeting, risk management, facilitation, negotiation, documentation, and enough technical fluency to ask the right questions.',
    entry: 'Demonstrate leadership on a student, internship, or volunteer project; understand project lifecycles; write clear status updates; track tasks and risks; and consider CAPM or Scrum training.',
    salary: 'Approximate U.S. progression: $70k–$95k entry level, $95k–$130k mid-career, and $130k–$155k+ senior or program management. BLS projects 6% growth for project management specialists from 2024–2034.',
    strong: 'A strong candidate creates clarity, follows through, handles conflict without drama, spots risk early, and keeps a team focused on outcomes instead of ceremonial meetings.',
    source: 'https://www.bls.gov/ooh/business-and-financial/project-management-specialists.htm'
  },
  product: {
    intro: 'Shapes useful, usable digital products by understanding customers, designing experiences, and prioritizing what a team should build.',
    dayToDay: 'Interview users, map journeys, create wireframes or prototypes, analyze product feedback, define requirements, prioritize roadmaps, run usability tests, and collaborate with engineering and business teams.',
    skills: 'Figma, prototyping, user research, usability testing, accessibility, analytics, product strategy, roadmapping, writing user stories, and persuasive communication.',
    entry: 'Create case studies that show your process—not only polished screens—explain research decisions, demonstrate accessibility awareness, and show how feedback changed a design or product choice.',
    salary: 'Approximate U.S. progression: $65k–$100k entry level, $100k–$145k mid-career, and $145k–$180k+ senior. Titles vary widely; BLS projects 7% growth for web developers and digital designers from 2024–2034.',
    strong: 'A strong candidate balances user needs, technical constraints, and business goals; welcomes evidence that challenges an idea; and communicates why a feature deserves to exist.',
    source: 'https://www.bls.gov/ooh/computer-and-information-technology/web-developers.htm'
  },
  consultant: {
    intro: 'Helps organizations select, configure, implement, and improve enterprise platforms such as SAP, Oracle, Salesforce, or Workday.',
    dayToDay: 'Run client workshops, map business processes, configure systems, migrate and validate data, coordinate integrations, test workflows, train users, and support go-live changes.',
    skills: 'Business process knowledge, SQL and data migration, requirements gathering, platform configuration, integration concepts, testing, change management, presentations, and one ERP or CRM ecosystem.',
    entry: 'Understand core business processes, learn one platform through coursework or a developer sandbox, practice requirements and process mapping, and show that you can communicate professionally with clients.',
    salary: 'Approximate U.S. progression: $70k–$100k entry level, $100k–$140k mid-career, and $140k–$175k+ senior or solution architect. BLS projects 9% growth for management analysts from 2024–2034.',
    strong: 'A strong candidate learns industries quickly, earns client trust, manages ambiguity, documents decisions, travels or adapts when needed, and understands that configuration is not the same as magic.',
    source: 'https://www.bls.gov/ooh/business-and-financial/management-analysts.htm'
  },
  cloud: {
    intro: 'Builds and operates the platforms, networks, automation, and cloud services that applications depend on.',
    dayToDay: 'Provision infrastructure, automate deployments, monitor reliability and cost, troubleshoot incidents, manage networks and permissions, improve backups, and partner with developers on scalable systems.',
    skills: 'AWS, Azure, or Google Cloud; Linux; networking; Git; scripting; Docker; Terraform; CI/CD; monitoring; identity management; and security fundamentals.',
    entry: 'Build a small cloud project, explain networking and Linux basics, automate a repeatable task, use Git, understand cost and access controls, and consider an entry-level cloud certification.',
    salary: 'Approximate U.S. progression: $80k–$110k entry level, $110k–$150k mid-career, and $150k–$185k+ senior or architect. BLS projects 12% growth for computer network architects from 2024–2034.',
    strong: 'A strong candidate automates repeatable work, documents systems, troubleshoots methodically, treats reliability and security as design requirements, and stays composed during incidents.',
    source: 'https://www.bls.gov/ooh/computer-and-information-technology/computer-network-architects.htm'
  }
};

const careerNames = Object.fromEntries(
  careerCards.map((card) => [card.dataset.career, card.querySelector('h2').textContent])
);

/**
 * Visually selects one or more career cards.
 * @param {string[]} careerKeys - Career profile keys that should be highlighted.
 */
function highlightCareers(careerKeys) {
  careerCards.forEach((card) => {
    card.classList.toggle('is-selected', careerKeys.includes(card.dataset.career));
  });
}

/**
 * Renders a selected profile into the reusable details panel.
 * Content comes from the trusted local `careerProfiles` object, not user input.
 * @param {string} careerKey - Key of the career profile to display.
 */
function showCareerDetails(careerKey) {
  const profile = careerProfiles[careerKey];
  highlightCareers([careerKey]);
  careerDetailsContent.innerHTML = `
    <h2>${careerNames[careerKey]}</h2>
    <p class="details-intro">${profile.intro}</p>
    <div class="details-grid">
      <div class="detail-block"><h3>Day-to-day work</h3><p>${profile.dayToDay}</p></div>
      <div class="detail-block"><h3>Technical skills and tools</h3><p>${profile.skills}</p></div>
      <div class="detail-block"><h3>Entry-level expectations</h3><p>${profile.entry}</p></div>
      <div class="detail-block"><h3>What makes a strong candidate</h3><p>${profile.strong}</p></div>
      <div class="detail-block salary"><h3>Salary and growth trajectory</h3><p>${profile.salary} Pay varies by location, industry, and employer. <a href="${profile.source}" target="_blank" rel="noopener noreferrer">View the closest BLS occupation profile</a>.</p></div>
    </div>
  `;
  careerDetails.hidden = false;
  careerDetails.focus();
  careerDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Clicking a card opens its matching profile; native buttons also support Enter/Space.
careerCards.forEach((card) => {
  card.addEventListener('click', () => showCareerDetails(card.dataset.career));
});

// Closing details also clears the card highlight to keep visual state accurate.
detailsClose.addEventListener('click', () => {
  careerDetails.hidden = true;
  highlightCareers([]);
});

// Random exploration chooses an unbiased index from the complete card list.
randomButton.addEventListener('click', () => {
  const chosenCard = careerCards[Math.floor(Math.random() * careerCards.length)];
  highlightCareers([chosenCard.dataset.career]);
  randomResult.textContent = `Try exploring: ${careerNames[chosenCard.dataset.career]}`;
  chosenCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// The assessment stays out of the way until requested and exposes its state to assistive technology.
assessmentButton.addEventListener('click', () => {
  const willOpen = assessmentPanel.hidden;
  assessmentPanel.hidden = !willOpen;
  assessmentButton.setAttribute('aria-expanded', String(willOpen));
  assessmentButton.textContent = willOpen ? 'Hide assessment' : 'Find my best fit';

  if (willOpen) assessmentPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Each answer may award one point to multiple related pathways. The highest
// score wins; equal high scores are deliberately returned as ties.
assessmentForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const scores = Object.fromEntries(Object.keys(careerNames).map((career) => [career, 0]));
  const answers = new FormData(assessmentForm);

  answers.forEach((answer) => {
    answer.split(',').forEach((career) => {
      scores[career] += 1;
    });
  });

  const highestScore = Math.max(...Object.values(scores));
  const bestMatches = Object.keys(scores).filter((career) => scores[career] === highestScore);
  const matchNames = bestMatches.map((career) => careerNames[career]);

  highlightCareers(bestMatches);
  assessmentResult.innerHTML = `
    <h3>Your best ${bestMatches.length > 1 ? 'matches are' : 'match is'} ${matchNames.join(' and ')}</h3>
    <p>Your answers point toward ${bestMatches.length > 1 ? 'these pathways' : 'this pathway'}. Use the result as a conversation starter, then explore coursework, internships, and professionals in the field.</p>
  `;
  assessmentResult.hidden = false;
  assessmentResult.focus();
});

// Native form reset clears radio buttons; this handler clears derived UI state.
assessmentForm.addEventListener('reset', () => {
  highlightCareers([]);
  assessmentResult.replaceChildren();
  assessmentResult.hidden = true;
});
