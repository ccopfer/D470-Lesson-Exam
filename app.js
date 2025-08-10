
// Single-section viewport exam (sections do not appear on the same page)
const state = {
  data: null,
  answers: {}, // qid -> {selected, correctIdx, isCorrect, sectionIdx, explanation}
  totals: { correct: 0, total: 0 },
  currentSection: 0
};

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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
  if (typeof rec.selected === "number") return; // lock after first choose

  rec.selected = choiceIdx;
  rec.isCorrect = (choiceIdx === rec.correctIdx);
  if (rec.isCorrect) state.totals.correct += 1;

  // Lock radios for that question
  const radios = document.querySelectorAll(`input[name="q_${qId}"]`);
  radios.forEach(r => r.disabled = true);

  // Feedback
  const container = document.getElementById(`q_${qId}_feedback`);
  if (container) {
    const correctness = rec.isCorrect ? "correct" : "incorrect";
    const msg = rec.isCorrect ? "Correct!" : "Incorrect";
    container.innerHTML = `<div class="feedback ${correctness}">${msg}</div>`;
    const ansText = document.getElementById(`q_${qId}_choice_${rec.correctIdx}`).textContent.trim();
    if (!rec.isCorrect) {
      container.innerHTML += `<div class="correct-answer"><strong>Correct answer:</strong> ${ansText}</div>`;
    }
    const expl = (rec.explanation || "").trim();
    if (expl) container.innerHTML += `<div class="correct-answer"><strong>Explanation:</strong> ${expl}</div>`;
  }

  updateProgress();
}

function buildQuestionEl(q, sectionIdx) {
  const wrap = document.createElement("div");
  wrap.className = "question";
  const qId = q.id;
  state.answers[qId] = state.answers[qId] || {
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

    // If already answered (navigating back), reflect state
    if (typeof state.answers[qId].selected === "number") {
      input.disabled = true;
      if (state.answers[qId].selected === idx) input.checked = true;
    }

    label.appendChild(input);
    label.appendChild(document.createTextNode(" " + choice));
    choicesDiv.appendChild(label);
  });

  wrap.appendChild(choicesDiv);

  const feedback = document.createElement("div");
  feedback.id = `q_${qId}_feedback`;
  // If already answered, rehydrate feedback
  const rec = state.answers[qId];
  if (typeof rec.selected === "number") {
    const correctness = rec.isCorrect ? "correct" : "incorrect";
    const msg = rec.isCorrect ? "Correct!" : "Incorrect";
    feedback.innerHTML = `<div class="feedback ${correctness}">${msg}</div>`;
    const ansText = q.choices[rec.correctIdx];
    if (!rec.isCorrect) {
      feedback.innerHTML += `<div class="correct-answer"><strong>Correct answer:</strong> ${ansText}</div>`;
    }
    const expl = (rec.explanation || "").trim();
    if (expl) feedback.innerHTML += `<div class="correct-answer"><strong>Explanation:</strong> ${expl}</div>`;
  }
  wrap.appendChild(feedback);

  return wrap;
}

function renderSection(index) {
  state.currentSection = index;
  const vp = document.getElementById("sectionViewport");
  vp.innerHTML = "";

  const sec = state.data.sections[index];
  const card = document.createElement("div");
  card.className = "section-card";

  const header = document.createElement("div");
  header.className = "section-header";
  const title = document.createElement("h2");
  title.textContent = sec.title;
  header.appendChild(title);

  const toTop = document.createElement("button");
  toTop.className = "btn light";
  toTop.textContent = "Top";
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  const headerBtns = document.createElement("div");
  headerBtns.className = "nav-buttons";
  headerBtns.appendChild(toTop);

  header.appendChild(headerBtns);
  card.appendChild(header);

  sec.questions.forEach(q => card.appendChild(buildQuestionEl(q, index)));

  vp.appendChild(card);

  // Update prev/next button states
  document.getElementById("prevSectionBtn").disabled = (index === 0);
  document.getElementById("nextSectionBtn").disabled = (index === state.data.sections.length - 1);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildSectionNav(sections) {
  const nav = document.getElementById("sectionNav");
  nav.innerHTML = "";
  sections.forEach((sec, idx) => {
    const b = document.createElement("button");
    b.className = "btn light";
    b.textContent = sec.title;
    b.addEventListener("click", () => renderSection(idx));
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

  const qIndex = {};
  state.data.sections.forEach((sec) => {
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
    btn.style.display = window.scrollY > 300 ? "block" : "none";
  });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

async function init() {
  setupScrollTop();
  const res = await fetch("quiz-data.json");
  const data = await res.json();
  document.getElementById("quizTitle").textContent = data.title || "Exam";
  const randomized = randomizedSections(data.sections || []);
  state.data = { ...data, sections: randomized };

  // Totals
  state.totals.total = randomized.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0);
  state.totals.correct = 0;
  updateProgress();

  // Build nav and first section
  buildSectionNav(randomized);
  renderSection(0);

  // Prev / Next behavior
  const prevBtn = document.getElementById("prevSectionBtn");
  const nextBtn = document.getElementById("nextSectionBtn");
  prevBtn.addEventListener("click", () => {
    if (state.currentSection > 0) renderSection(state.currentSection - 1);
  });
  nextBtn.addEventListener("click", () => {
    if (state.currentSection < state.data.sections.length - 1) renderSection(state.currentSection + 1);
  });

  document.getElementById("retakeBtn").addEventListener("click", () => window.location.reload());
  document.getElementById("submitBtn").addEventListener("click", renderSummary);
}

document.addEventListener("DOMContentLoaded", init);
