(function () {
  const $ = (id) => document.getElementById(id);
  $('yr').textContent = new Date().getFullYear();

  // Tabs
  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('on'));
      document.querySelectorAll('.pane').forEach((x) => x.classList.remove('on'));
      t.classList.add('on');
      $(t.dataset.t).classList.add('on');
    })
  );

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
})();
