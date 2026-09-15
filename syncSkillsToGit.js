/**
 * Incremental Firebase to Git Sync Engine for AI Career Coach Website & Android App
 *
 * Rules:
 * 1. Syncs Full Interview Gym docs to website/gym/{skillId}.json
 * 2. Syncs Full Tutorials to website/tutorials/{moduleId}/{topicId}.json
 * 3. Exports Master Tutorials Index to website/tutorials/master.json
 * 4. Combines ALL skills into website/skills.json for Web & App
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
        "angular": "🅰️ Angular Framework",
        "aws_amazon_web_services": "☁️ AWS Amazon Web Services",
        "c": "💻 C Programming",
        "core_java": "☕ Core Java & OOPs",
        "data_structures__algorithms": "⚙️ Data Structures & Algorithms",
        "docker": "🐋 Docker & Kubernetes",
        "git": "🔀 Git & GitHub",
        "google_cloud_gcp": "☁️ Google Cloud GCP",
        "html5": "🌐 HTML5 & CSS3",
        "java": "☕ Java Programming",
        "javascript": "💛 JavaScript (ES6+)",
        "jquery": "⚡ jQuery Library",
        "linux_system_administration": "🐧 Linux System Administration",
        "mongodb": "🍃 MongoDB NoSQL",
        "nodejs": "🟢 Node.js & Express",
        "oracle_db": "🛢️ Oracle Database SQL",
        "php": "🐘 PHP & Web Backend",
        "python": "🐍 Python & FastAPI",
        "reactjs": "⚛️ React.js & Frontend",
        "spring_boot": "🌿 Spring Boot & Microservices",
        "sql": "🛢️ SQL & Database Indexing",
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
    const allSkillsMap = new Map();

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

        allSkillsMap.set(skillId, {
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

        // Ensure this tutorial module is also represented in master skills
        if (!allSkillsMap.has(moduleId)) {
            allSkillsMap.set(moduleId, {
                id: moduleId,
                name: moduleName,
                category: "Tutorial",
                questions: topicsList.slice(0, 5).map(t => ({
                    q: `Explain ${t.topicName}`,
                    level: "Easy"
                }))
            });
        }
    }

    masterModules.sort((a, b) => a.order - b.order);
    fs.writeFileSync(masterTutorialsFilePath, JSON.stringify({ modules: masterModules }, null, 2));
    console.log(`  ✅ Saved Master Tutorials Index -> website/tutorials/master.json (${masterModules.length} Modules)`);

    // Write Master skills.json with ALL skills included
    const allSkillsList = Array.from(allSkillsMap.values());
    const finalSkillsData = {
        lastSyncedAt: new Date().toISOString(),
        totalSkills: allSkillsList.length,
        skills: allSkillsList
    };

    fs.writeFileSync(rootSkillsFilePath, JSON.stringify(finalSkillsData, null, 2));
    fs.writeFileSync(websiteSkillsFilePath, JSON.stringify(finalSkillsData, null, 2));

    console.log(`\n🎉 [Sync Complete] All ${allSkillsList.length} Skills, Gym Q&A and ${masterModules.length} Tutorials successfully synced to Git CDN repository!`);
}

fullSync().catch(console.error);
