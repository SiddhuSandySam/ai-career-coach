/**
 * Incremental Firebase to Git Sync Engine for AI Career Coach Website & Android App
 *
 * Rules:
 * 1. Syncs Full Interview Gym docs to website/gym/{skillId}.json
 * 2. Syncs Full Tutorials to website/tutorials/{moduleId}/{topicId}.json
 * 3. Exports Master Tutorials Index to website/tutorials/master.json
 * 4. Places Tutorial Skills FIRST in website/skills.json for W3Schools-style top nav
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Ensure output directories exist
const websiteDir = path.join(__dirname, 'website');
const gymDir = path.join(__dirname, 'website', 'gym');
const tutorialsDir = path.join(__dirname, 'website', 'tutorials');

if (!fs.existsSync(websiteDir)) fs.mkdirSync(websiteDir, { recursive: true });
if (!fs.existsSync(gymDir)) fs.mkdirSync(gymDir, { recursive: true });
if (!fs.existsSync(tutorialsDir)) fs.mkdirSync(tutorialsDir, { recursive: true });

const rootSkillsFilePath = path.join(__dirname, 'skills.json');
const websiteSkillsFilePath = path.join(websiteDir, 'skills.json');
const masterTutorialsFilePath = path.join(tutorialsDir, 'master.json');

// Helper to format clean skill names
function formatSkillName(raw) {
    if (!raw) return "Tech Skill";
    const nameMap = {
        "java": "☕ Java Programming",
        "core_java": "☕ Core Java & OOPs",
        "python": "🐍 Python & FastAPI",
        "javascript": "💛 JavaScript (ES6+)",
        "reactjs": "⚛️ React.js & Frontend",
        "angular": "🅰️ Angular Framework",
        "spring_boot": "🌿 Spring Boot & Microservices",
        "sql": "🛢️ SQL & Database Indexing",
        "data_structures__algorithms": "⚙️ Data Structures & Algorithms",
        "html5": "🌐 HTML5 & CSS3",
        "nodejs": "🟢 Node.js & Express",
        "docker": "🐋 Docker & Kubernetes",
        "git": "🔀 Git & GitHub",
        "aws_amazon_web_services": "☁️ AWS Amazon Web Services",
        "google_cloud_gcp": "☁️ Google Cloud GCP",
        "mongodb": "🍃 MongoDB NoSQL",
        "c": "💻 C Programming",
        "php": "🐘 PHP & Web Backend",
        "oracle_db": "🛢️ Oracle Database SQL",
        "linux_system_administration": "🐧 Linux System Administration",
        "jquery": "⚡ jQuery Library",
        "jpa": "🍃 JPA & Hibernate ORM",
        "general": "💡 General CS Fundamentals",
        "plsql": "🛢️ PL/SQL Database"
    };

    const cleanKey = raw.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
    return nameMap[cleanKey] || raw;
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.log("ℹ️ No serviceAccountKey.json found. Script running in dry-run mode.");
    }
}

async function fullSync() {
    console.log("🔄 [Full Sync] Starting complete export for Skills, Gym & Tutorials...");

    if (!admin.apps.length) {
        console.log("✅ [Sync Complete] Dry-run finished. 0 Firebase Reads performed.");
        return;
    }

    const db = admin.firestore();
    const gymSkillsMap = new Map();

    // ==========================================
    // 1. SYNC INTERVIEW GYM TO website/gym/{skillId}.json
    // ==========================================
    console.log("\n🏋️ [Gym Sync] Syncing 'interview_gym' collection...");
    const gymSnap = await db.collection("interview_gym").get();

    for (const doc of gymSnap.docs) {
        const skillId = doc.id.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
        const gymFilePath = path.join(gymDir, `${skillId}.json`);

        const gymData = doc.data();
        const formattedName = formatSkillName(gymData.skillName || doc.id);

        const gymJsonContent = JSON.stringify({
            skillId: skillId,
            skillName: formattedName,
            questionCount: gymData.questionCount || 0,
            concepts: gymData.concepts || []
        }, null, 2);

        fs.writeFileSync(gymFilePath, gymJsonContent);
        console.log(`  ✅ Saved full Gym JSON for '${skillId}' -> website/gym/${skillId}.json`);

        const concepts = gymData.concepts || [];
        const questions = [];

        concepts.forEach(concept => {
            if (concept.questions) {
                concept.questions.forEach(qObj => {
                    questions.push({
                        q: qObj.q,
                        a: qObj.a || null,
                        p: qObj.p || [],
                        level: qObj.level || "Easy"
                    });
                });
            }
        });

        gymSkillsMap.set(skillId, {
            id: skillId,
            name: formattedName,
            category: "Tech",
            questions: questions.slice(0, 10)
        });
    }

    // ==========================================
    // 2. SYNC TUTORIALS TO website/tutorials/{moduleId}/{topicId}.json
    // ==========================================
    console.log("\n📚 [Tutorials Sync] Syncing 'tutorials' collection...");
    const tutorialsSnap = await db.collection("tutorials").get();
    const masterModules = [];
    const tutorialSkillsList = [];

    for (const moduleDoc of tutorialsSnap.docs) {
        const moduleId = moduleDoc.id.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
        const moduleData = moduleDoc.data();
        const moduleName = formatSkillName(moduleData.moduleName || moduleDoc.id);

        const moduleDir = path.join(tutorialsDir, moduleId);
        if (!fs.existsSync(moduleDir)) fs.mkdirSync(moduleDir, { recursive: true });

        const topicsSnap = await moduleDoc.ref.collection("topics").get();
        const topicsList = [];

        for (const topicDoc of topicsSnap.docs) {
            const topicId = topicDoc.id;
            const topicData = topicDoc.data();
            const topicFilePath = path.join(moduleDir, `${topicId}.json`);

            const topicJsonContent = JSON.stringify({
                topicId: topicId,
                topicName: topicData.topicName || "",
                order: topicData.order || 0,
                content: topicData.content || "[]"
            }, null, 2);

            fs.writeFileSync(topicFilePath, topicJsonContent);

            topicsList.push({
                topicId: topicId,
                topicName: topicData.topicName || topicId,
                order: topicData.order || 0
            });
        }

        topicsList.sort((a, b) => a.order - b.order);

        masterModules.push({
            moduleId: moduleId,
            moduleName: moduleName,
            order: moduleData.order || 0,
            description: moduleData.description || "",
            topics: topicsList
        });

        // Use questions from interview_gym if available, else construct from topics
        let skillQuestions = [];
        if (gymSkillsMap.has(moduleId)) {
            skillQuestions = gymSkillsMap.get(moduleId).questions;
            gymSkillsMap.delete(moduleId); // Removed from gym map so it's not duplicated
        } else {
            skillQuestions = topicsList.slice(0, 5).map(t => ({
                q: `Explain ${t.topicName}`,
                level: "Easy"
            }));
        }

        tutorialSkillsList.push({
            id: moduleId,
            name: moduleName,
            order: moduleData.order || 0,
            category: "Tutorial",
            questions: skillQuestions
        });
    }

    // Sort tutorial skills by order
    tutorialSkillsList.sort((a, b) => a.order - b.order);
    masterModules.sort((a, b) => a.order - b.order);

    fs.writeFileSync(masterTutorialsFilePath, JSON.stringify({ modules: masterModules }, null, 2));
    console.log(`  ✅ Saved Master Tutorials Index -> website/tutorials/master.json (${masterModules.length} Modules)`);

    // Combine tutorial skills FIRST, followed by any remaining gym skills
    const extraGymSkills = Array.from(gymSkillsMap.values());
    const finalSkillsList = [...tutorialSkillsList, ...extraGymSkills];

    const finalSkillsData = {
        lastSyncedAt: new Date().toISOString(),
        totalSkills: finalSkillsList.length,
        skills: finalSkillsList
    };

    fs.writeFileSync(rootSkillsFilePath, JSON.stringify(finalSkillsData, null, 2));
    fs.writeFileSync(websiteSkillsFilePath, JSON.stringify(finalSkillsData, null, 2));

    console.log(`\n🎉 [Sync Complete] All ${finalSkillsList.length} Skills (Tutorials first) successfully synced to Git CDN repository!`);
}

fullSync().catch(console.error);
