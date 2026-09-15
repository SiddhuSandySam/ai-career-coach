// JavaScript for AI Career Coach Website - Dynamic GitHub JSON Fetching

let globalSkills = [];

// Fetch Dynamic Skills JSON from GitHub Raw CDN (0 Firebase Reads!)
async function loadDynamicSkills() {
    const githubJsonUrl = 'https://raw.githubusercontent.com/SiddhuSandySam/ai-career-coach/main/website/skills.json';
    try {
        const response = await fetch(githubJsonUrl);
        const data = await response.json();
        if (data && data.skills) {
            globalSkills = data.skills;
            renderSkillChips(globalSkills);
            if (globalSkills.length > 0) {
                filterSkill(globalSkills[0].id);
            }
            return;
        }
    } catch (e) {
        console.warn("GitHub JSON fetch failed, using local fallback:", e);
    }

    // Fallback Data if GitHub fetch is offline
    globalSkills = [
        {
            id: "java",
            name: "☕ Core Java & OOPs",
            questions: [
                { q: "How does HashMap handle bucket collisions in Java 8?", level: "Medium" },
                { q: "Explain the difference between String, StringBuilder, and StringBuffer.", level: "Easy" },
                { q: "How does Garbage Collection (G1/ZGC) work under the hood in JVM?", level: "Hard" }
            ]
        },
        {
            id: "android",
            name: "📱 Android & Kotlin",
            questions: [
                { q: "Explain Activity Lifecycle order during screen rotation.", level: "Easy" },
                { q: "How do Coroutines and StateFlow replace LiveData in modern MVVM?", level: "Medium" },
                { q: "How do you prevent memory leaks when passing Context to singletons?", level: "Hard" }
            ]
        },
        {
            id: "python",
            name: "🐍 Python & FastAPI",
            questions: [
                { q: "Explain GIL (Global Interpreter Lock) in Python concurrency.", level: "Hard" },
                { q: "What is the difference between list.append() and list.extend()?", level: "Easy" },
                { q: "How do Decorators and Generators work in Python?", level: "Medium" }
            ]
        },
        {
            id: "sql",
            name: "🛢️ SQL & Indexing",
            questions: [
                { q: "What is the difference between INNER JOIN and LEFT OUTER JOIN?", level: "Easy" },
                { q: "Explain B-Tree Indexing and why over-indexing slows down INSERTS.", level: "Hard" },
                { q: "Explain ACID properties in database transactions.", level: "Medium" }
            ]
        },
        {
            id: "docker",
            name: "🐋 Docker & Cloud",
            questions: [
                { q: "What is the difference between Docker Image and Docker Container?", level: "Easy" },
                { q: "How does Docker Compose orchestrate multi-container microservices?", level: "Medium" },
                { q: "How do multi-stage Docker builds optimize image size?", level: "Hard" }
            ]
        }
    ];

    renderSkillChips(globalSkills);
    filterSkill('java');
}

// Dynamically Render Skill Filter Chips
function renderSkillChips(skills) {
    const chipContainer = document.getElementById('skill-chips-container');
    if (!chipContainer) return;

    let html = '';
    skills.forEach((skill, index) => {
        const activeClass = index === 0
            ? 'active bg-cyan-500/20 border-cyan-500/40 text-white'
            : 'bg-slate-800/60 border-slate-700/60 text-slate-400';

        html += `
            <button onclick="filterSkill('${skill.id}')" id="chip-${skill.id}" class="skill-chip ${activeClass} px-5 py-2.5 rounded-xl text-sm font-bold border hover:text-white transition-all">
                ${skill.name}
            </button>
        `;
    });

    chipContainer.innerHTML = html;
}

// Filter Skill Questions & Render Lock Cards
function filterSkill(skillId) {
    // Style active chip
    const chips = document.querySelectorAll('.skill-chip');
    chips.forEach(chip => {
        chip.classList.remove('active', 'bg-cyan-500/20', 'border-cyan-500/40', 'text-white');
        chip.classList.add('bg-slate-800/60', 'border-slate-700/60', 'text-slate-400');
    });

    const activeChip = document.getElementById(`chip-${skillId}`);
    if (activeChip) {
        activeChip.classList.add('active', 'bg-cyan-500/20', 'border-cyan-500/40', 'text-white');
        activeChip.classList.remove('bg-slate-800/60', 'border-slate-700/60', 'text-slate-400');
    }

    const container = document.getElementById('skill-questions-container');
    if (!container) return;

    const matchedSkill = globalSkills.find(s => s.id === skillId) || globalSkills[0];
    const questions = matchedSkill ? matchedSkill.questions : [];

    let html = '';
    questions.forEach(item => {
        html += `
            <div class="bg-[#151C2C] border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group hover:border-cyan-500/40 transition-all shadow-xl">
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <span class="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase ${getLevelBadgeClass(item.level)}">${item.level}</span>
                        <span class="text-xs text-slate-500 font-semibold">Verified Question</span>
                    </div>
                    <h4 class="text-slate-100 font-bold text-base leading-snug mb-4">"${item.q}"</h4>
                </div>

                <!-- Locked Answer CTA -->
                <div class="pt-4 border-t border-slate-800/80 mt-2">
                    <a href="https://play.google.com/store/apps/details?id=com.sandeshkoli.aicareercoach" target="_blank"
                       class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all">
                        <i data-lucide="lock" class="w-3.5 h-3.5"></i>
                        <span>Unlock Full Answer in App</span>
                    </a>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    if (window.lucide) {
        lucide.createIcons();
    }
}

function getLevelBadgeClass(level) {
    if (level === 'Easy') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (level === 'Medium') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
}

// Interactive Tab Switcher for Demo Section
function switchTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.add('hidden'));

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-600', 'text-white');
        btn.classList.add('bg-slate-800/60', 'text-slate-400');
    });

    const selectedContent = document.getElementById(`content-${tabName}`);
    if (selectedContent) {
        selectedContent.classList.remove('hidden');
    }

    const selectedBtn = document.getElementById(`tab-${tabName}`);
    if (selectedBtn) {
        selectedBtn.classList.add('active', 'bg-indigo-600', 'text-white');
        selectedBtn.classList.remove('bg-slate-800/60', 'text-slate-400');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    loadDynamicSkills();
});
