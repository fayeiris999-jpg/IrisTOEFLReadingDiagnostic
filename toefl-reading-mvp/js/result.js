/**
 * TOEFL Reading Result Analysis
 * 
 * Handles data retrieval, diagnostic calculation, and rendering.
 */

document.addEventListener('DOMContentLoaded', () => {
    init();
});

// --- Initialization ---

function init() {
    const rawData = localStorage.getItem('toefl_result');
    
    if (!rawData) {
        alert("未找到测试数据，即将返回首页...");
        window.location.href = 'index.html';
        return;
    }

    try {
        const testData = JSON.parse(rawData);
        const analysis = calculateResult(testData);
        
        renderResult(analysis);
        
        // Bind Save Button
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                saveResultToLocalStorage(analysis);
            });
        }

    } catch (e) {
        console.error("Error processing result:", e);
        alert("数据解析错误，请重试。");
    }
}

// --- Analysis Logic ---

function calculateResult(data) {
    const { answers, questions, totalTime } = data;
    const TOTAL_TIME_LIMIT = 1080; // 18 mins
    
    // 1. Accuracy & Type Analysis
    let correctCount = 0;
    const typeStats = {}; // { type: { total: 0, correct: 0 } }

    answers.forEach((record, index) => {
        const question = questions[index];
        const isCorrect = record.answer === question.answer;
        
        if (isCorrect) correctCount++;
        
        // Type Stats
        const type = question.type || 'General';
        if (!typeStats[type]) {
            typeStats[type] = { total: 0, correct: 0, name: formatTypeName(type) };
        }
        typeStats[type].total++;
        if (isCorrect) typeStats[type].correct++;
    });

    // 2. Weakness & Strength Identification
    const typeArray = Object.values(typeStats).map(stat => ({
        ...stat,
        accuracy: (stat.correct / stat.total) * 100
    }));

    // Sort by accuracy (ascending)
    typeArray.sort((a, b) => a.accuracy - b.accuracy);

    const weakPoints = typeArray.filter(t => t.accuracy < 60).map(t => t.name);
    const strongPoints = typeArray.filter(t => t.accuracy >= 80).map(t => t.name);
    
    // Fallbacks
    if (weakPoints.length === 0 && correctCount < questions.length) weakPoints.push("细节理解需加强");
    if (weakPoints.length === 0 && correctCount === questions.length) weakPoints.push("暂无明显薄弱点");
    if (strongPoints.length === 0) strongPoints.push("暂无明显优势项");

    // 3. Score Prediction (0-30 Scale)
    // Simple heuristic: 10 questions -> ~3 pts each.
    let estimatedScore = correctCount * 3;
    
    // Time Penalty
    if (totalTime > 1080) estimatedScore -= 2;
    
    estimatedScore = Math.max(0, Math.min(30, estimatedScore));
    const rangeLow = Math.max(0, estimatedScore - 2);
    const rangeHigh = Math.min(30, estimatedScore + 2);
    const scoreRange = `${rangeLow}-${rangeHigh}`;

    // 4. Sprint Plan Generation
    let plan = {
        focus: "",
        material: "",
        timeAdvice: ""
    };

    if (estimatedScore < 15) {
        plan.focus = "词汇量与长难句。当前基础较弱，建议回归单词背诵（高中/四级/托福核心）和每日长难句分析。";
        plan.material = "《托福词汇词以类记》 + TPO 1-20 篇章精读";
        plan.timeAdvice = "暂不追求速度，重点在于读懂。建议单篇练习时间放宽至25分钟，逐步适应。";
    } else if (estimatedScore < 22) {
        plan.focus = "题型技巧突破。重点攻克" + (weakPoints[0] || "推断题") + "和错题分析，总结出题逻辑。";
        plan.material = "TPO 30-50 分类题型训练 + 错题本整理";
        plan.timeAdvice = "严格控制时间。每篇文章限制在20分钟内，强制自己不回读，学会抓取段落主旨。";
    } else {
        plan.focus = "全真模考与抗干扰。保持手感，训练连续做3篇文章的耐力，模拟真实考场环境。";
        plan.material = "TPO 50-70 真题模考 + 最新机经预测";
        plan.timeAdvice = "挑战极限。尝试将每篇文章时间压缩至16-17分钟，为检查和难题留出缓冲时间。";
    }

    return {
        scoreRange,
        correctCount,
        totalCount: questions.length,
        totalTime,
        typeStats: typeArray,
        weakPoints,
        strongPoints,
        plan,
        questions, // Pass through for detailed analysis
        answers,   // Pass through for detailed analysis
        date: new Date().toLocaleString()
    };
}

function formatTypeName(type) {
    const map = {
        'detail': '事实信息题',
        'negative-detail': '否定事实信息题',
        'vocabulary': '词汇题',
        'inference': '推断题',
        'summary': '句子简化题', // Note: map 'summary' to sentence-simplification if it's single choice, or prose-summary if multi. In my JSON Q2 is summary (simplification) and Q10 is summary (prose).
        'sentence-simplification': '句子简化题',
        'insertion': '句子插入题',
        'prose-summary': '文章小结题',
        'reference': '指代题',
        'rhetorical-purpose': '修辞目的题'
    };
    // Special handling for summary type based on context if needed, but for now simple map
    if (type === 'summary') return '文章小结/句子简化题';
    return map[type] || type;
}

// --- Rendering ---

function renderResult(data) {
    // 1. Score Overview
    document.getElementById('score-range').textContent = data.scoreRange;
    document.getElementById('correct-count').textContent = `${data.correctCount}/${data.totalCount}`;
    document.getElementById('time-used').textContent = formatTime(data.totalTime);

    // 2. Accuracy Chart
    const chartContainer = document.getElementById('accuracy-chart');
    chartContainer.innerHTML = data.typeStats.map(stat => {
        const colorClass = stat.accuracy >= 80 ? 'bg-green-500' : (stat.accuracy >= 50 ? 'bg-blue-500' : 'bg-red-500');
        return `
        <div class="mb-3 last:mb-0">
            <div class="flex justify-between text-xs text-slate-600 mb-1">
                <span>${stat.name}</span>
                <span class="font-bold">${Math.round(stat.accuracy)}%</span>
            </div>
            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full ${colorClass} rounded-full transition-all duration-1000 ease-out" style="width: 0%" data-width="${stat.accuracy}%"></div>
            </div>
        </div>
        `;
    }).join('');
    
    // Trigger animation
    setTimeout(() => {
        chartContainer.querySelectorAll('[data-width]').forEach(el => {
            el.style.width = el.getAttribute('data-width');
        });
    }, 100);

    // 3. Time Pie Chart
    const totalSeconds = 1080; // 18 mins
    const usedPercent = Math.min(100, (data.totalTime / totalSeconds) * 100);
    const pieChart = document.getElementById('time-pie-chart');
    
    // Update gradient: Blue (Used) -> Gray (Remaining)
    // Conic gradient syntax: color1 start end, color2 start end
    pieChart.style.background = `conic-gradient(#3b82f6 0% ${usedPercent}%, #e2e8f0 ${usedPercent}% 100%)`;
    document.getElementById('pie-total-time').textContent = formatTime(data.totalTime);

    // 4. Weaknesses & Strengths
    renderList('weak-points-list', data.weakPoints, 'text-red-500', '⚠️');
    renderList('strong-points-list', data.strongPoints, 'text-green-500', '✅');

    // 5. Sprint Plan
    document.getElementById('plan-focus').textContent = data.plan.focus;
    document.getElementById('plan-material').textContent = data.plan.material;
    document.getElementById('plan-time').textContent = data.plan.timeAdvice;

    // 6. Detailed Question Analysis
    renderQuestionAnalysis(data.questions, data.answers);
}

function renderQuestionAnalysis(questions, answers) {
    const container = document.getElementById('questions-analysis');
    if (!questions || !answers || questions.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-center py-4">暂无题目解析数据</p>';
        return;
    }

    container.innerHTML = questions.map((q, index) => {
        const userAnswer = answers[index] ? answers[index].answer : null;
        const isCorrect = userAnswer === q.answer;
        const typeName = formatTypeName(q.type);
        
        // Status Badge
        const statusBadge = isCorrect 
            ? '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">正确</span>'
            : '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">错误</span>';

        // Options Rendering
        const optionsHtml = q.options.map(opt => {
            const optLetter = opt.charAt(0); // Assuming format "A. ..."
            let optionClass = "p-3 rounded-lg border border-slate-100 text-sm";
            
            // Highlight logic
            if (optLetter === q.answer) {
                optionClass = "p-3 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm font-medium";
            } else if (optLetter === userAnswer && !isCorrect) {
                optionClass = "p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm";
            }

            return `<div class="${optionClass}">${opt}</div>`;
        }).join('');

        return `
        <div class="pt-8 first:pt-0">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <span class="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold mb-2">Question ${index + 1}</span>
                    <span class="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold mb-2 ml-2">${typeName}</span>
                    <h4 class="text-slate-900 font-medium leading-relaxed">${q.text}</h4>
                </div>
                <div class="ml-4 shrink-0">
                    ${statusBadge}
                </div>
            </div>
            
            <div class="space-y-2 mb-4">
                ${optionsHtml}
            </div>

            <div class="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <div class="flex items-center mb-2 text-sm font-bold text-slate-700">
                    <span class="mr-2">💡</span> 题目解析
                </div>
                <div class="text-sm text-slate-600 leading-relaxed">
                    ${q.explanation || "暂无详细解析"}
                </div>
                ${!isCorrect ? `
                <div class="mt-3 pt-3 border-t border-slate-200 flex items-center text-xs text-slate-500">
                    <span class="mr-2">你的答案: <strong class="text-red-600">${userAnswer || '未作答'}</strong></span>
                    <span>正确答案: <strong class="text-green-600">${q.answer}</strong></span>
                </div>
                ` : ''}
            </div>
        </div>
        `;
    }).join('');
}

function renderList(elementId, items, colorClass, icon) {
    const list = document.getElementById(elementId);
    if (items.length === 0) {
        list.innerHTML = `<li class="text-slate-400 text-xs italic">无相关数据</li>`;
        return;
    }
    list.innerHTML = items.map(item => `
        <li class="flex items-start">
            <span class="${colorClass} mr-2 mt-0.5 text-xs">●</span>
            <span>${item}</span>
        </li>
    `).join('');
}

// --- Data Persistence ---

function saveResultToLocalStorage(resultData) {
    try {
        localStorage.setItem('toefl_last_result', JSON.stringify(resultData));
        
        const btn = document.getElementById('save-btn');
        const originalHtml = btn.innerHTML;
        
        btn.innerHTML = '<span>✅</span> 已保存';
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-green-100', 'text-green-700', 'border', 'border-green-200');
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.add('bg-blue-600', 'text-white');
            btn.classList.remove('bg-green-100', 'text-green-700', 'border', 'border-green-200');
            btn.disabled = false;
        }, 2000);

    } catch (e) {
        console.error("Save failed:", e);
        alert("保存失败，可能是存储空间不足。");
    }
}

// --- Utils ---

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}分${s}秒`;
}
