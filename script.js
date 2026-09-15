// JavaScript for AI Career Coach Website - Dynamic Git CDN Fetching & App Promotion

let globalSkills = [];
const CDN_SKILLS_URL = 'https://cdn.jsdelivr.net/gh/SiddhuSandySam/ai-career-coach@main/website/skills.json';
const RAW_SKILLS_URL = 'https://raw.githubusercontent.com/SiddhuSandySam/ai-career-coach/main/website/skills.json';
const CDN_GYM_BASE = 'https://cdn.jsdelivr.net/gh/SiddhuSandySam/ai-career-coach@main/website/gym/';
const APP_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.sandeshkoli.aicareercoach';

// Fetch Dynamic Skills JSON from Git CDN (0 Firebase Reads!)
async function loadDynamicSkills() {
    try {
        let response = await fetch(CDN_SKILLS_URL);
        if (!response.ok) {
            response = await fetch(RAW_SKILLS_URL);
        }
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
        console.warn("Git CDN skills fetch failed, using fallback:", e);
    }

    // Fallback Data if CDN fetch is offline
    globalSkills = [
        {
            id: "java",
            name: "☕ Core Java & OOPs",
            questions: [
                { q: "How does HashMap handle bucket collisions in Java 8?", a: "In Java 8, HashMap handles collisions by using LinkedList initially, but automatically converts the bucket into a Balanced Red-Black Tree when the number of elements exceeds TREEIFY_THRESHOLD (8). This improves worst-case lookup time from O(n) to O(log n).", level: "Medium", p: ["Uses LinkedList initially", "Converts to Red-Black Tree if size > 8", "O(log n) worst-case lookup speed"] },
                { q: "Explain the difference between String, StringBuilder, and StringBuffer.", a: "String is immutable in Java. StringBuilder is mutable and non-thread-safe (fastest for single thread). StringBuffer is mutable and thread-safe with synchronized methods.", level: "Easy", p: ["String: Immutable", "StringBuilder: Mutable & Fast (Not thread-safe)", "StringBuffer: Mutable & Thread-safe"] },
                { q: "How does Garbage Collection (G1/ZGC) work under the hood in JVM?", level: "Hard" }
            ]
        },
        {
            id: "android",
            name: "📱 Android & Kotlin",
            questions: [
                { q: "Explain Activity Lifecycle order during screen rotation.", a: "When screen rotates, current Activity is destroyed and recreated: onPause() -> onStop() -> onDestroy() -> onCreate() -> onStart() -> onResume(). SavedInstanceState or ViewModel preserves state.", level: "Easy", p: ["Destroys and recreates Activity", "ViewModel retains state across rotation", "onSaveInstanceState preserves UI state bundle"] },
                { q: "How do Coroutines and StateFlow replace LiveData in modern MVVM?", level: "Medium" }
            ]
        },
        {
            id: "python",
            name: "🐍 Python & FastAPI",
            questions: [
                { q: "Explain GIL (Global Interpreter Lock) in Python concurrency.", level: "Hard" },
                { q: "What is the difference between list.append() and list.extend()?", level: "Easy" }
            ]
        },
        {
            id: "sql",
            name: "🛢️ SQL & Indexing",
            questions: [
                { q: "What is the difference between INNER JOIN and LEFT OUTER JOIN?", level: "Easy" },
                { q: "Explain B-Tree Indexing and why over-indexing slows down INSERTS.", level: "Hard" }
            ]
        },
        {
            id: "springboot",
            name: "🌿 Spring Boot & Microservices",
            questions: [
                { q: "How does Dependency Injection (IoC Container) work in Spring?", level: "Easy" },
                { q: "Explain @Transactional annotation rollback mechanism.", level: "Medium" }
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
            ? 'active bg-cyan-500/20 border-cyan-500/40 text-white shadow-lg shadow-cyan-500/10'
            : 'bg-slate-800/60 border-slate-700/60 text-slate-400';

        html += `
            <button onclick="filterSkill('${skill.id}')" id="chip-${skill.id}" class="skill-chip ${activeClass} px-5 py-2.5 rounded-xl text-sm font-bold border hover:text-white transition-all">
                ${skill.name}
            </button>
        `;
    });

    chipContainer.innerHTML = html;
}

// Filter Skill Questions & Render Preview vs App Redirect Cards
async function filterSkill(skillId) {
    // Style active chip
    const chips = document.querySelectorAll('.skill-chip');
    chips.forEach(chip => {
        chip.classList.remove('active', 'bg-cyan-500/20', 'border-cyan-500/40', 'text-white', 'shadow-lg', 'shadow-cyan-500/10');
        chip.classList.add('bg-slate-800/60', 'border-slate-700/60', 'text-slate-400');
    });

    const activeChip = document.getElementById(`chip-${skillId}`);
    if (activeChip) {
        activeChip.classList.add('active', 'bg-cyan-500/20', 'border-cyan-500/40', 'text-white', 'shadow-lg', 'shadow-cyan-500/10');
        activeChip.classList.remove('bg-slate-800/60', 'border-slate-700/60', 'text-slate-400');
    }

    const container = document.getElementById('skill-questions-container');
    if (!container) return;

    let questions = [];

    // Try fetching deep gym questions from Git CDN for this skill
    try {
        const gymResponse = await fetch(`${CDN_GYM_BASE}${skillId}.json`);
        if (gymResponse.ok) {
            const gymData = await gymResponse.json();
            if (gymData && gymData.concepts) {
                gymData.concepts.forEach(concept => {
                    if (concept.questions) {
                        concept.questions.forEach(qObj => {
                            questions.push({
                                q: qObj.q,
                                a: qObj.a || null,
                                p: qObj.p || [],
                                level: qObj.level || "Medium",
                                concept: concept.conceptName
                            });
                        });
                    }
                });
            }
        }
    } catch (e) {
        console.log(`Deep gym fetch fallback for ${skillId}:`, e);
    }

    // Fallback to master skills list if deep gym not available
    if (questions.length === 0) {
        const matchedSkill = globalSkills.find(s => s.id === skillId) || globalSkills[0];
        questions = matchedSkill ? matchedSkill.questions : [];
    }

    let html = '';
    const displayList = questions.slice(0, 9);

    displayList.forEach((item, index) => {
        const isFreePreview = index < 2 && item.a; // Show full content preview for 1st & 2nd question

        if (isFreePreview) {
            // Render Free Sample Preview Card
            let pointsHtml = '';
            if (item.p && item.p.length > 0) {
                pointsHtml = `
                    <div class="mt-3 pt-3 border-t border-slate-800/80">
                        <p class="text-[11px] font-bold text-cyan-400 uppercase tracking-wide mb-1.5">📌 Key Revision Points:</p>
                        <ul class="list-disc list-inside text-xs text-slate-300 space-y-1">
                            ${item.p.map(pt => `<li>${pt}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            html += `
                <div class="bg-[#151C2C] border border-cyan-500/40 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group transition-all shadow-xl shadow-cyan-950/40">
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <span class="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase ${getLevelBadgeClass(item.level)}">${item.level}</span>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">🟢 Free Answer Sample</span>
                        </div>
                        <h4 class="text-slate-100 font-bold text-base leading-snug mb-3">"${item.q}"</h4>

                        <!-- Free Answer Preview Box -->
                        <div class="bg-slate-900/80 rounded-xl p-4 border border-slate-800/90 text-xs text-slate-300 leading-relaxed mb-2">
                            <p class="font-semibold text-slate-200 mb-1">💡 Professional Answer:</p>
                            <p>${item.a}</p>
                            ${pointsHtml}
                        </div>
                    </div>

                    <div class="pt-4 border-t border-slate-800/80 mt-3">
                        <a href="${APP_PLAY_STORE_URL}" target="_blank"
                           class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 hover:scale-[1.02] transition-all">
                            <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
                            <span>Practice Voice Interview in App</span>
                        </a>
                    </div>
                </div>
            `;
        } else {
            // Render Locked App Redirect CTA Card
            html += `
                <div class="bg-[#151C2C] border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group hover:border-cyan-500/40 transition-all shadow-xl">
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <span class="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase ${getLevelBadgeClass(item.level)}">${item.level}</span>
                            <span class="text-xs text-slate-500 font-semibold">Verified Question</span>
                        </div>
                        <h4 class="text-slate-100 font-bold text-base leading-snug mb-4">"${item.q}"</h4>
                        ${item.concept ? `<p class="text-xs text-slate-400 mb-4 font-medium">📌 ${item.concept}</p>` : ''}
                    </div>

                    <!-- Locked Answer CTA -->
                    <div class="pt-4 border-t border-slate-800/80 mt-2">
                        <a href="${APP_PLAY_STORE_URL}" target="_blank"
                           class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            <i data-lucide="lock" class="w-3.5 h-3.5"></i>
                            <span>Unlock Full Answer in App</span>
                        </a>
                    </div>
                </div>
            `;
        }
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
