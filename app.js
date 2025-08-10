
/**
 * WGU-themed GitHub Exam
 * - 4 sections (one per sheet)
 * - Randomizes questions within each section only
 * - Progress bar shows score and percentage (always visible)
 * - Per-question feedback with explanations, locks answers
 * - Navigation buttons and scroll-to-top
 * - Summary with export (CSV) and exam results (questions & answers)
 */
const state = {
  data: null,
  sectionOrder: [],
  answers: {}, // key: question id, value: {selected, correctIdx, isCorrect, sectionIdx}
  totals: { correct: 0, total: 0 },
};

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Randomize questions within each section only
function randomizedSections(sections) {
  return sections.map(sec => {
    const cloned = JSON.parse(JSON.stringify(sec));
    cloned.questions = shuffleInPlace(cloned.questions);
    return cloned;
  });
}

function updateProgress() {
  const pct = state.totals.total ? Math.round((state.totals.correct / state.totals.total) * 100) : 0;
  const txt = `${state.totals.correct} / ${state.totals.total} correct • ${pct}%`;
  document.getElementById("progressText").textContent = txt;
  document.getElementById("progressFill").style.width = pct + "%";
}

function onAnswerSelect(qId, choiceIdx) {
  const rec = state.answers[qId];
  if (!rec) return;
  // If already answered, don't allow changes
  if (typeof rec.selected === "number") return;

  rec.selected = choiceIdx;
  rec.isCorrect = (choiceIdx === rec.correctIdx);
  if (rec.isCorrect) state.totals.correct += 1;

  // Lock radios for that question
  const radios = document.querySelectorAll(`input[name="q_${qId}"]`);
  radios.forEach(r => r.disabled = true);

  // Show feedback
  const container = document.getElementById(`q_${qId}_feedback`);
  if (container) {
    const correctness = rec.isCorrect ? "correct" : "incorrect";
    const msg = rec.isCorrect ? "Correct!" : "Incorrect";
    container.innerHTML = `<div class="feedback ${correctness}">${msg}</div>`;
    if (!rec.isCorrect) {
      const ansText = document.getElementById(`q_${qId}_choice_${rec.correctIdx}`).textContent.trim();
      const expl = (rec.explanation || "").trim();
      const explanationBlock = expl ? `<div class="correct-answer"><strong>Explanation:</strong> ${expl}</div>` : "";
      container.innerHTML += `<div class="correct-answer"><strong>Correct answer:</strong> ${ansText}</div>${explanationBlock}`;
    } else {
      const expl = (rec.explanation || "").trim();
      if (expl) {
        container.innerHTML += `<div class="correct-answer"><strong>Explanation:</strong> ${expl}</div>`;
      }
    }
  }

  updateProgress();
}

function buildQuestionEl(q, sectionIdx) {
  const wrap = document.createElement("div");
  wrap.className = "question";
  const qId = q.id;
  state.answers[qId] = {
    selected: null,
    correctIdx: q.answer,
    isCorrect: false,
    sectionIdx,
    explanation: q.explanation || ""
  };

  const h = document.createElement("h3");
  h.textContent = q.question;
  wrap.appendChild(h);

  const choicesDiv = document.createElement("div");
  choicesDiv.className = "choices";

  q.choices.forEach((choice, idx) => {
    const id = `q_${qId}_choice_${idx}`;
    const label = document.createElement("label");
    label.setAttribute("for", id);
    label.id = id;

    const input = document.createElement("input");
    input.type = "radio";
    input.name = `q_${qId}`;
    input.value = idx;
    input.addEventListener("change", () => onAnswerSelect(qId, idx));

    label.appendChild(input);
    label.appendChild(document.createTextNode(" " + choice));
    choicesDiv.appendChild(label);
  });

  wrap.appendChild(choicesDiv);

  const feedback = document.createElement("div");
  feedback.id = `q_${qId}_feedback`;
  wrap.appendChild(feedback);

  return wrap;
}

function buildSection(sec, idx) {
  const card = document.createElement("div");
  card.className = "section-card";
  card.id = `section_${idx}`;

  const header = document.createElement("div");
  header.className = "section-header";

  const title = document.createElement("h2");
  title.textContent = sec.title;
  header.appendChild(title);

  const navBtns = document.createElement("div");
  navBtns.className = "nav-buttons";

  const toTop = document.createElement("button");
  toTop.className = "btn light";
  toTop.textContent = "Top";
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  navBtns.appendChild(toTop);

  // Previous section
  if (idx > 0) {
    const prev = document.createElement("button");
    prev.className = "btn secondary";
    prev.textContent = "Previous Section";
    prev.addEventListener("click", () => {
      document.getElementById(`section_${idx-1}`).scrollIntoView({ behavior: "smooth" });
    });
    navBtns.appendChild(prev);
  }
  // Next section
  if (idx < state.data.sections.length - 1) {
    const next = document.createElement("button");
    next.className = "btn";
    next.textContent = "Next Section";
    next.addEventListener("click", () => {
      document.getElementById(`section_${idx+1}`).scrollIntoView({ behavior: "smooth" });
    });
    navBtns.appendChild(next);
  }

  header.appendChild(navBtns);
  card.appendChild(header);

  sec.questions.forEach(q => {
    card.appendChild(buildQuestionEl(q, idx));
  });

  return card;
}

function buildSectionNav(sections) {
  const nav = document.getElementById("sectionNav");
  nav.innerHTML = "";
  sections.forEach((sec, idx) => {
    const b = document.createElement("button");
    b.className = "btn light";
    b.textContent = sec.title;
    b.addEventListener("click", () => {
      document.getElementById(`section_${idx}`).scrollIntoView({ behavior: "smooth" });
    });
    nav.appendChild(b);
  });
}

function computeTotals() {
  const total = Object.keys(state.answers).length;
  const correct = Object.values(state.answers).filter(r => r.isCorrect).length;
  state.totals.total = total;
  state.totals.correct = correct;
  updateProgress();
}

function renderSummary() {
  computeTotals();
  const cont = document.getElementById("summaryContainer");
  cont.style.display = "block";
  const pct = state.totals.total ? Math.round((state.totals.correct / state.totals.total) * 100) : 0;

  let html = `<h2>Summary</h2>
    <p><strong>Score:</strong> ${state.totals.correct} / ${state.totals.total} (${pct}%)</p>
    <div class="nav-buttons" style="margin: 10px 0 20px;">
      <button class="btn" id="exportCsvBtn">Export CSV</button>
      <button class="btn secondary" id="printBtn">Print</button>
    </div>
    <table>
      <thead><tr><th>#</th><th>Section</th><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Result</th><th>Explanation</th></tr></thead>
      <tbody>
  `;

  // Build a map of question id -> text choices for quick lookup
  const qIndex = {};
  state.data.sections.forEach((sec, sIdx) => {
    sec.questions.forEach(q => { qIndex[q.id] = { q, secTitle: sec.title }; });
  });

  let i = 1;
  for (const [qIdStr, rec] of Object.entries(state.answers)) {
    const qId = parseInt(qIdStr, 10);
    const meta = qIndex[qId];
    if (!meta) continue;
    const questionText = meta.q.question;
    const secTitle = meta.secTitle;
    const yourAnswer = typeof rec.selected === "number" ? meta.q.choices[rec.selected] : "";
    const correctAnswer = meta.q.choices[rec.correctIdx];
    const result = rec.isCorrect ? "Correct" : "Incorrect";
    const explanation = (rec.explanation || "").replace(/\n/g, " ");
    html += `<tr>
      <td>${i}</td>
      <td>${secTitle}</td>
      <td>${questionText}</td>
      <td>${yourAnswer}</td>
      <td>${correctAnswer}</td>
      <td>${result}</td>
      <td>${explanation}</td>
    </tr>`;
    i++;
  }

  html += `</tbody></table>`;
  cont.innerHTML = html;

  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("printBtn").addEventListener("click", () => window.print());
}

function exportCsv() {
  // Build CSV
  const rows = [["Section","Question","Your Answer","Correct Answer","Result","Explanation"]];
  const qIndex = {};
  state.data.sections.forEach((sec) => {
    sec.questions.forEach(q => { qIndex[q.id] = { q, secTitle: sec.title }; });
  });
  for (const [qIdStr, rec] of Object.entries(state.answers)) {
    const qId = parseInt(qIdStr, 10);
    const meta = qIndex[qId];
    if (!meta) continue;
    const secTitle = meta.secTitle;
    const questionText = meta.q.question;
    const yourAnswer = typeof rec.selected === "number" ? meta.q.choices[rec.selected] : "";
    const correctAnswer = meta.q.choices[rec.correctIdx];
    const result = rec.isCorrect ? "Correct" : "Incorrect";
    const explanation = (rec.explanation || "").replace(/\n/g, " ");
    rows.push([secTitle, questionText, yourAnswer, correctAnswer, result, explanation]);
  }
  const csv = rows.map(r => r.map(v => `"${(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "exam_results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function setupScrollTop() {
  const btn = document.getElementById("scrollTopBtn");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) btn.style.display = "block"; else btn.style.display = "none";
  });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

async function init() {
  setupScrollTop();
  const res = await fetch("quiz-data.json");
  const data = await res.json();
  document.getElementById("quizTitle").textContent = data.title || "Exam";
  // Randomize questions per section only
  const randomized = randomizedSections(data.sections || []);
  state.data = { ...data, sections: randomized };

  // Build totals (total questions)
  state.totals.total = randomized.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0);
  state.totals.correct = 0;
  updateProgress();

  buildSectionNav(randomized);

  const container = document.getElementById("sectionsContainer");
  container.innerHTML = "";
  randomized.forEach((sec, idx) => {
    container.appendChild(buildSection(sec, idx));
  });

  document.getElementById("submitBtn").addEventListener("click", renderSummary);
  document.getElementById("retakeBtn").addEventListener("click", () => {
    // Simple retake: reload to re-randomize
    window.location.reload();
  });
}

document.addEventListener("DOMContentLoaded", init);
