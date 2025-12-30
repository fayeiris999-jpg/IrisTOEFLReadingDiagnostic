/**
 * TOEFL Reading Test Logic
 * 
 * Implements data loading, state management, timer, and question rendering.
 */

// --- Global State ---
const testState = {
    currentQuestionIndex: 0,
    questions: [],
    passage: [],
    title: "",
    answers: [], // Stores objects: { questionId, answer, marked, timeSpent }
    startTime: null,
    timer: null
};

// --- Constants ---
const TOTAL_TIME_SECONDS = 1080; // 18 minutes

// --- Timer Class ---
class TestTimer {
    constructor(totalSeconds) {
        this.totalSeconds = totalSeconds;
        this.remainingSeconds = totalSeconds;
        this.intervalId = null;
    }

    start(callback) {
        if (this.intervalId) return;
        this.startTime = Date.now();
        
        this.intervalId = setInterval(() => {
            this.remainingSeconds--;
            if (this.remainingSeconds <= 0) {
                this.stop();
                callback(0);
                submitTest(); // Auto-submit on timeout
            } else {
                callback(this.remainingSeconds);
            }
        }, 1000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    
    getElapsedTime() {
        return this.totalSeconds - this.remainingSeconds;
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    try {
        const data = await fetchQuestions();
        if (!data) return;

        testState.questions = data.questions;
        testState.passage = data.passage;
        testState.title = data.title;
        
        // Initialize answers array
        testState.answers = testState.questions.map(q => ({
            questionId: q.id,
            answer: q.type === 'summary' ? [] : null,
            marked: false,
            timeSpent: 0
        }));

        // Render Article
        renderArticle();

        // Initialize Timer
        testState.timer = new TestTimer(TOTAL_TIME_SECONDS);
        const timerDisplay = document.getElementById('timer');
        timerDisplay.textContent = testState.timer.formatTime(TOTAL_TIME_SECONDS);
        
        testState.timer.start((seconds) => {
            timerDisplay.textContent = testState.timer.formatTime(seconds);
            if (seconds <= 60) {
                timerDisplay.classList.add('text-red-600', 'animate-pulse'); // Red warning
                timerDisplay.classList.remove('text-slate-700');
            }
        });
        
        testState.startTime = Date.now();

        // Bind Static Controls
        document.getElementById('next-btn').addEventListener('click', () => nextQuestion());
        document.getElementById('prev-btn').addEventListener('click', () => prevQuestion());
        document.getElementById('flag-btn').addEventListener('click', () => {
            toggleMark(testState.currentQuestionIndex);
            updateControls(testState.currentQuestionIndex); // Update flag button style
            renderNavDots(); // Update dot style
        });
        
        // Mobile Article Toggle
        const articleContainer = document.getElementById('article-container');
        const toggleBtn = document.getElementById('toggle-article-btn');
        toggleBtn.addEventListener('click', () => {
            articleContainer.classList.toggle('active');
            toggleBtn.textContent = articleContainer.classList.contains('active') ? '❌ 关闭文章' : '📄 显示文章';
        });

        // Load First Question
        loadQuestion(0);

    } catch (error) {
        console.error("Initialization error:", error);
        alert("加载测试数据失败，请刷新重试。");
    }
}

async function fetchQuestions() {
    try {
        const response = await fetch('data/questions_new.json');
        if (!response.ok) throw new Error('Failed to load questions');
        return await response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

// --- Rendering ---
function renderArticle(filterIndices = null, highlightWord = null) {
    const container = document.getElementById('article-container');
    const titleHtml = `<h2 class="text-2xl font-bold mb-4 text-slate-900">${testState.title}</h2>`;
    
    // Determine which paragraphs to render
    let indicesToRender = testState.passage.map((_, i) => i); // Default: all
    if (filterIndices && filterIndices.length > 0) {
        indicesToRender = filterIndices;
    }

    const paragraphsHtml = indicesToRender.map(index => {
        let paraText = testState.passage[index];
        
        // Apply Highlight if needed
        if (highlightWord) {
             // Escape special regex chars in highlightWord just in case
             const safeWord = highlightWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
             const regex = new RegExp(`\\b(${safeWord})\\b`, 'gi');
             
             paraText = paraText.replace(regex, (match) => {
                return `<span class="bg-yellow-200 text-yellow-800 font-bold px-1 rounded border-b-2 border-yellow-400 transition-all duration-500 ease-in-out transform scale-110 inline-block shadow-sm" id="highlight-target">${match}</span>`;
             });
        }

        return `<p class="mb-4 leading-loose text-slate-700 relative pl-2">
            <span class="absolute left-[-1.5rem] top-1 text-xs font-bold text-slate-400 bg-slate-100 px-1 rounded select-none">[${index + 1}]</span>
            ${paraText}
        </p>`;
    }).join('');

    container.innerHTML = titleHtml + paragraphsHtml;

    // Auto-scroll to highlight if exists
    if (highlightWord) {
        const target = document.getElementById('highlight-target');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function getRelevantParagraphs(question) {
    // 1. Check for explicit "paragraph X"
    // Matches "paragraph 1", "Paragraph 2", etc.
    const paraMatch = question.text.match(/paragraph\s+(\d+)/i);
    if (paraMatch) {
        const index = parseInt(paraMatch[1]) - 1;
        if (index >= 0 && index < testState.passage.length) {
            return [index];
        }
    }
    
    // 2. If vocabulary question (and no explicit paragraph mentioned, or as fallback)
    if (question.type === 'vocabulary') {
        const wordMatch = question.text.match(/["“](.*?)["”]/);
        if (wordMatch) {
            const word = wordMatch[1];
            // Find paragraphs containing this word (as whole word)
            const indices = [];
            const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${safeWord}\\b`, 'i');
            
            testState.passage.forEach((para, i) => {
                if (regex.test(para)) {
                    indices.push(i);
                }
            });
            
            if (indices.length > 0) return indices;
        }
    }
    
    // Default: return null (show all)
    return null;
}

function formatQuestionText(text, type) {
    if (type === 'vocabulary') {
        // Match words inside quotes (straight or curly)
        return text.replace(/["“](.*?)["”]/g, (match, word) => {
            return `<span class="inline-block font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200 mx-1 shadow-sm text-lg transform -translate-y-0.5">"${word}"</span>`;
        });
    }
    // For other types, return as is (or add other formatting if needed)
    return text.replace(/\n/g, '<br>'); // Handle line breaks
}

function loadQuestion(index) {
    if (index < 0 || index >= testState.questions.length) return;

    testState.currentQuestionIndex = index;
    const question = testState.questions[index];
    const currentAnswerData = testState.answers[index];

    // 1. Update Progress
    const progressEl = document.getElementById('question-progress');
    progressEl.textContent = `Q${index + 1}/${testState.questions.length}`;

    // 2. Render Question Text
    const qTextEl = document.getElementById('question-text');
    const formattedText = formatQuestionText(question.text, question.type);
    qTextEl.innerHTML = `<span class="text-blue-600 mr-2">${index + 1}.</span>${formattedText}`;

    // 3. Render Options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; // Clear previous

    if (question.options) {
        question.options.forEach((opt, optIndex) => {
            const letter = String.fromCharCode(65 + optIndex); // A=65
            const isSummary = question.type === 'summary';
            const isSelected = Array.isArray(currentAnswerData.answer)
                ? currentAnswerData.answer.includes(letter)
                : currentAnswerData.answer === letter;

            const label = document.createElement('label');
            label.className = `flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${
                isSelected 
                ? 'bg-blue-50 border-blue-500 shadow-md' 
                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`;
            
            // Input (checkbox for summary, radio otherwise)
            const input = document.createElement('input');
            input.type = isSummary ? 'checkbox' : 'radio';
            input.name = `question-${question.id}`;
            input.value = letter;
            input.checked = isSelected;
            input.className = 'sr-only'; // Screen reader only
            
            // Custom Radio Circle
            const radioCircle = document.createElement('div');
            radioCircle.className = `w-6 h-6 rounded-full border-2 mr-4 flex-shrink-0 flex items-center justify-center transition-colors ${
                isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 group-hover:border-blue-400'
            }`;
            radioCircle.innerHTML = isSelected ? '<div class="w-2.5 h-2.5 bg-white rounded-full"></div>' : '';

            // Option Text
            const textSpan = document.createElement('span');
            textSpan.className = `text-lg ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-700'}`;
            textSpan.innerHTML = `<span class="font-bold mr-2">${letter}.</span> ${opt}`;

            // Event Handler
            input.onchange = () => {
                recordAnswer(index, letter);
                loadQuestion(index); // Re-render to update styles
            };

            label.appendChild(input);
            label.appendChild(radioCircle);
            label.appendChild(textSpan);
            optionsContainer.appendChild(label);
        });
    }

    // 4. Update Controls & Nav
    updateControls(index);
    renderNavDots();
    
    // 5. Render Article with filtering and highlighting
    const filterIndices = getRelevantParagraphs(question);
    let highlightWord = null;
    if (question.type === 'vocabulary') {
        const match = question.text.match(/["“](.*?)["”]/);
        if (match) highlightWord = match[1];
    }
    
    renderArticle(filterIndices, highlightWord);
}

function updateControls(index) {
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const flagBtn = document.getElementById('flag-btn');
    const isLast = index === testState.questions.length - 1;
    const isFirst = index === 0;
    const isMarked = testState.answers[index].marked;

    // Update Prev Button
    if (isFirst) {
        prevBtn.disabled = true;
        prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        prevBtn.disabled = false;
        prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    // Update Next Button Text & Style
    if (isLast) {
        nextBtn.innerHTML = `<span>提交测试</span> <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
        // Keep orange style for submit too
    } else {
        nextBtn.innerHTML = `<span>下一题</span> <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>`;
    }

    // Update Flag Button Style
    if (isMarked) {
        flagBtn.classList.add('text-yellow-600');
        flagBtn.classList.remove('text-slate-400');
    } else {
        flagBtn.classList.remove('text-yellow-600');
        flagBtn.classList.add('text-slate-400');
    }
}

function prevQuestion() {
    if (testState.currentQuestionIndex > 0) {
        loadQuestion(testState.currentQuestionIndex - 1);
    }
}

function renderNavDots() {
    const container = document.getElementById('nav-dots');
    container.innerHTML = '';

    testState.questions.forEach((_, i) => {
        const status = testState.answers[i];
        const isCurrent = i === testState.currentQuestionIndex;
        const isAnswered = Array.isArray(status.answer) ? status.answer.length > 0 : status.answer !== null;
        const isMarked = status.marked;

        const dot = document.createElement('button');
        // Base styles
        let className = 'w-3 h-3 rounded-full transition-all duration-300 ';
        
        if (isCurrent) {
            className += 'bg-blue-600 scale-125 ring-4 ring-blue-100';
        } else if (isMarked) {
            className += 'bg-yellow-400';
        } else if (isAnswered) {
            className += 'bg-blue-400';
        } else {
            className += 'bg-slate-300 hover:bg-slate-400';
        }

        dot.className = className;
        dot.title = `Question ${i + 1}`; // Tooltip
        
        dot.onclick = () => loadQuestion(i);
        container.appendChild(dot);
    });
}

// --- Interaction Logic ---

function recordAnswer(index, value) {
    const q = testState.questions[index];
    const current = testState.answers[index];
    if (q.type === 'summary') {
        const arr = Array.isArray(current.answer) ? current.answer.slice() : [];
        const exists = arr.includes(value);
        if (exists) {
            // toggle off
            current.answer = arr.filter(v => v !== value);
        } else {
            // limit to 3 selections
            if (arr.length >= 3) {
                return;
            }
            arr.push(value);
            current.answer = arr;
        }
    } else {
        current.answer = value;
    }
    // Update nav dots to show answered status immediately
    renderNavDots();
}

function toggleMark(index) {
    testState.answers[index].marked = !testState.answers[index].marked;
}

function nextQuestion() {
    if (testState.currentQuestionIndex < testState.questions.length - 1) {
        loadQuestion(testState.currentQuestionIndex + 1);
    } else {
        // Last question
        if (confirm('确定要提交答案吗？提交后将无法修改。')) {
            submitTest();
        }
    }
}

function submitTest() {
    testState.timer.stop();
    
    // Serialize data
    const resultData = {
        score: calculateScore(), // Basic calculation
        totalTime: testState.timer.getElapsedTime(),
        answers: testState.answers,
        questions: testState.questions
    };

    // Store in localStorage
    localStorage.setItem('toefl_result', JSON.stringify(resultData));

    // Redirect
    window.location.href = 'result.html';
}

// Basic client-side scoring
function calculateScore() {
    let correctCount = 0;
    testState.answers.forEach((record, index) => {
        const question = testState.questions[index];
        if (Array.isArray(question.answer)) {
            const sel = Array.isArray(record.answer) ? record.answer.slice().sort() : [];
            const ans = question.answer.slice().sort();
            const isCorrect = sel.length === ans.length && sel.every((v, i) => v === ans[i]);
            if (isCorrect) correctCount++;
        } else {
            if (record.answer === question.answer) {
                correctCount++;
            }
        }
    });
    return correctCount;
}
