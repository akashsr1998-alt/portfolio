(function () {
  const $ = (id) => document.getElementById(id);
  $('yr').textContent = new Date().getFullYear();

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const tablist = document.querySelector('[role="tablist"]');
  function activateTab(tab, moveFocus = false) {
    tabs.forEach((item) => {
      const active = item === tab;
      const panel = $(item.dataset.t);
      item.classList.toggle('on', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      panel.classList.toggle('on', active);
      panel.hidden = !active;
    });
    if (moveFocus) tab.focus();
  }
  tabs.forEach((tab) => {
    $(tab.dataset.t).hidden = !tab.classList.contains('on');
    tab.addEventListener('click', () => activateTab(tab));
  });
  tablist.addEventListener('keydown', (event) => {
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    activateTab(tabs[next], true);
  });

  const nodes = [...document.querySelectorAll('#pipe .node')];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let busy = false;

  function scenarios(s) {
    const t = s.trim().replace(/\s+/g, ' ');
    const short = t.slice(0, 90) + (t.length > 90 ? '…' : '');
    if (/customs|declaration|vin|import/i.test(s))
      return `Grounded in: "${short}"
(RAG: 3 matching acceptance criteria retrieved)

Feature: Vehicle import declaration
  @P1 Scenario: Valid declaration moves Draft -> Submitted -> Cleared
  @P1 Scenario: Declaration with missing VIN is rejected
  @P2 Scenario Outline: VIN boundary values (16, 17, 18 chars)
  @P2 Scenario: Invalid characters in VIN (I, O, Q) are rejected
  @P2 Scenario: Status cannot skip from Draft to Cleared
  @P3 Scenario: Downstream system receives correct message payload
  @P3 Scenario: DB record matches submitted declaration data`;
    if (/log\s?in|password|sign/i.test(s))
      return `Grounded in: "${short}"

  @P1 Scenario: Valid credentials open the dashboard
  @P1 Scenario: Invalid password shows an error
  @P2 Scenario: Empty fields show validation
  @P2 Scenario: Account locks after repeated failures
  @P3 Scenario: Injection strings are rejected safely`;
    return `Grounded in: "${short}"

  @P1 Scenario: Main happy path from the requirement
  @P1 Scenario: Mandatory inputs missing -> validation
  @P2 Scenario Outline: Boundary values on each input
  @P2 Scenario: Unauthorized access is blocked
  @P3 Scenario: Error handling when a downstream service fails`;
  }

  function code(fw) {
    if (fw === 'api')
      return `@Test(description = "Missing VIN is rejected")
public void missingVinIsRejected() {
    given().spec(customsSpec)
        .body(DeclarationFactory.valid().withVin(null))
    .when().post("/declarations")
    .then().statusCode(400)
        .body("errors[0].field", equalTo("vin"));
}

@Test(description = "Status flow Draft -> Submitted")
public void submitMovesToSubmitted() {
    String id = createDraft();
    given().spec(customsSpec).post("/declarations/{id}/submit", id)
        .then().statusCode(200).body("status", equalTo("SUBMITTED"));
}`;
    if (fw === 'eval')
      return `from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (AnswerRelevancyMetric,
    FaithfulnessMetric, HallucinationMetric)

def test_customs_assistant_answer():
    ctx = ["A declaration without a VIN must be rejected."]
    q = "Can I submit a declaration without a VIN?"
    case = LLMTestCase(input=q, actual_output=customs_bot.ask(q),
                       retrieval_context=ctx, context=ctx)
    assert_test(case, [
        AnswerRelevancyMetric(threshold=0.8),
        FaithfulnessMetric(threshold=0.8),
        HallucinationMetric(threshold=0.3)])`;
    return `# declaration.feature
Scenario: Declaration with missing VIN is rejected
  Given I am logged in as a customs officer
  And I create an import declaration for "UK" without a VIN
  When I submit the declaration
  Then I should see the error "VIN is required"
  And the declaration status should be "Draft"

// DeclarationSteps.java
@When("I submit the declaration")
public void submit() { declarationPage.submit(); }

@Then("the declaration status should be {string}")
public void statusIs(String s) {
  assertThat(declarationPage.status()).hasText(s);
}`;
  }

  function triage(fw) {
    if (fw === 'eval')
      return `DeepEval quality gate (sample run)
  answer_relevancy : 0.91  (>= 0.80) PASS
  faithfulness     : 0.88  (>= 0.80) PASS
  hallucination    : 0.12  (<= 0.30) PASS
  prompt_injection : 12/12 refused   PASS

Gate: GREEN - safe to promote build.`;
    return `CI run (Azure DevOps, sample)
  Passed: 6   Failed: 1   Healed: 1

FAIL  "VIN boundary values (18 chars)"
  Cause    : Locator '#vin-err' not found
  Category : SCRIPT ISSUE (UI change), not a product defect
  Healer   : Proposed getByTestId('vin-error')  [verified: 1 match]
  Action   : PR raised for human-in-the-loop review

Release readiness: GREEN with 1 pending review.`;
  }

  function resetOutputs() {
    nodes.forEach((n) => n.classList.remove('run', 'done'));
    $('log').textContent = 'Waiting to run…';
    $('o1').textContent = 'Scenarios will appear here.';
    $('o2').textContent = 'Generated code will appear here.';
    $('o3').textContent = 'Triage report will appear here.';
  }

  async function run() {
    if (busy) return;
    const story = $('story').value.trim();
    if (!story) { $('log').textContent = 'Please enter a requirement first.'; return; }
    busy = true; $('run').disabled = true;
    const fw = $('fw').value;
    ['o1', 'o2', 'o3'].forEach((i) => ($(i).textContent = '…'));
    $('log').textContent = '';
    nodes.forEach((n) => n.classList.remove('run', 'done'));
    const steps = [
      ['RAG', 'Retrieving user stories, AC and process docs…'],
      ['Generator', 'Generating scenarios with structured prompt template…'],
      ['MCP', 'Exploring live DOM / accessibility tree for locators…'],
      ['Executor', 'Running suite in Azure DevOps pipeline…'],
      ['Healer', 'Self-healing locators and classifying failures…'],
      ['Evaluator', 'Applying quality gates…'],
    ];
    for (let i = 0; i < steps.length; i++) {
      nodes[i].classList.add('run');
      $('log').textContent += `[${steps[i][0]}] ${steps[i][1]}\n`;
      await sleep(650);
      nodes[i].classList.replace('run', 'done');
      if (i === 1) $('o1').textContent = scenarios(story);
      if (i === 2) $('o2').textContent = code(fw);
      if (i === 5) $('o3').textContent = triage(fw);
    }
    $('log').textContent += '\n✔ Pipeline complete - human review pending. See the tabs.';
    busy = false; $('run').disabled = false;
  }

  $('run').addEventListener('click', run);
  $('reset').addEventListener('click', () => { if (!busy) resetOutputs(); });

  const navLinks = [...document.querySelectorAll('nav a[href^="#"]')];
  const sections = navLinks.map((link) => $(link.hash.slice(1))).filter(Boolean);
  let activeSectionId = '';
  function setActiveSection(id) {
    if (id === activeSectionId) return;
    activeSectionId = id;
    navLinks.forEach((link) => {
      if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reducedMotion) {
    document.body.classList.add('reveal-ready');
    const revealTargets = document.querySelectorAll(
      'section .wrap > h2, section .wrap > .sub, .grid > .card, .tl > .job, section .wrap > .pipe, section .wrap > .demo, section .wrap > .tblwrap, section .wrap > .card'
    );
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach((target) => {
      target.classList.add('reveal');
      revealObserver.observe(target);
    });
  }

  const progress = $('scroll-progress');
  const backToTop = $('back-to-top');
  function updateScrollUI() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
    progress.style.transform = `scaleX(${percentage})`;
    backToTop.hidden = window.scrollY < 480;
    const activeSection = scrollable > 0 && window.scrollY >= scrollable - 1
      ? sections[sections.length - 1]
      : sections.reduce(
        (active, section) => section.getBoundingClientRect().top <= window.innerHeight * 0.3 ? section : active,
        sections[0]
      );
    if (activeSection) setActiveSection(activeSection.id);
  }
  let scrollFrame = 0;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      updateScrollUI();
      scrollFrame = 0;
    });
  }, { passive: true });
  window.addEventListener('resize', updateScrollUI);
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });
  updateScrollUI();
})();
