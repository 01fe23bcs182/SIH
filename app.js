// Quiz System
let currentQuiz = [];
let currentIndex = 0;
let currentScore = 0;

function startQuiz(topic) {
  currentQuiz = quizzes[topic];
  currentIndex = 0;
  currentScore = 0;
  document.getElementById("quizTitle").innerText = topic.toUpperCase() + " Quiz";
  document.getElementById("quizModal").style.display = "flex";
  loadQuestion();
}

function loadQuestion() {
  const q = currentQuiz[currentIndex];
  document.getElementById("quizQuestion").innerText = q.q;
  let html = "";
  q.options.forEach((opt, i) => {
    html += `<label><input type="radio" name="opt" value="${i}"> ${opt}</label><br>`;
  });
  document.getElementById("quizOptions").innerHTML = html;
}

function nextQuestion() {
  const choice = document.querySelector('input[name="opt"]:checked');
  if (!choice) { alert("Please select an option"); return; }
  if (parseInt(choice.value) === currentQuiz[currentIndex].answer) {
    currentScore++;
  }
  currentIndex++;
  if (currentIndex < currentQuiz.length) {
    loadQuestion();
  } else {
    alert("Quiz Finished! Score: " + currentScore + "/" + currentQuiz.length);
    localStorage.setItem("lastQuizScore", currentScore);
    closeQuiz();
  }
}

function closeQuiz() {
  document.getElementById("quizModal").style.display = "none";
}
