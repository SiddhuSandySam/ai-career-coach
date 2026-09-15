/**
 * Pure Dynamic Firebase to Git Sync Engine for AI Career Coach Website & Android App
 *
 * Rules:
 * 1. ZERO HARDCODED NAMES OR ALIASES.
 * 2. Uses Firestore document fields (`skillName`, `moduleName`, `topicName`) directly.
 * 3. Syncs Full Interview Gym docs to website/gym/{skillId}.json
 * 4. Syncs Full Tutorials to website/tutorials/{moduleId}/{topicId}.json
 * 5. Exports Master Tutorials Index to website/tutorials/master.json
 * 6. Generates website/skills.json dynamically from Firestore data.
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
    console.log("🔄 [Pure Dynamic Sync] Starting complete export for Skills, Gym & Tutorials from Firestore...");

    if (!admin.apps.length) {
        console.log("✅ [Sync Complete] Dry-run finished. 0 Firebase Reads performed.");
        return;
    }

    const db = admin.firestore();
    const skillsMap = new Map();

    // ==========================================
    // 1. SYNC INTERVIEW GYM TO website/gym/{skillId}.json
    // ==========================================
    console.log("\n🏋️ [Gym Sync] Fetching 'interview_gym' collection from Firestore...");
    const gymSnap = await db.collection("interview_gym").get();

    for (const doc of gymSnap.docs) {
        const skillId = doc.id.toLowerCase().trim();
        const gymFilePath = path.join(gymDir, `${skillId}.json`);

        const gymData = doc.data();
        const skillName = gymData.skillName || doc.id;

        const gymJsonContent = JSON.stringify({
            skillId: skillId,
            skillName: skillName,
            questionCount: gymData.questionCount || 0,
            concepts: gymData.concepts || []
        }, null, 2);

        fs.writeFileSync(gymFilePath, gymJsonContent);
        console.log(`  ✅ Saved Gym JSON for '${skillId}' (${skillName}) -> website/gym/${skillId}.json`);

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

        skillsMap.set(skillId, {
            id: skillId,
            name: skillName,
            category: "Tech",
            questions: questions.slice(0, 10)
        });
    }

    // ==========================================
    // 2. SYNC TUTORIALS TO website/tutorials/{moduleId}/{topicId}.json
    // ==========================================
    console.log("\n📚 [Tutorials Sync] Fetching 'tutorials' collection from Firestore...");
    const tutorialsSnap = await db.collection("tutorials").get();
    const masterModules = [];

    for (const moduleDoc of tutorialsSnap.docs) {
        const moduleId = moduleDoc.id.toLowerCase().trim();
        const moduleData = moduleDoc.data();
        const moduleName = moduleData.moduleName || moduleDoc.id;

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
                topicName: topicData.topicName || topicId,
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

        // If module is not in skillsMap, add it dynamically
        if (!skillsMap.has(moduleId)) {
            skillsMap.set(moduleId, {
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

    // Write Master skills.json dynamically
    const finalSkillsList = Array.from(skillsMap.values());
    const finalSkillsData = {
        lastSyncedAt: new Date().toISOString(),
        totalSkills: finalSkillsList.length,
        skills: finalSkillsList
    };

    fs.writeFileSync(rootSkillsFilePath, JSON.stringify(finalSkillsData, null, 2));
    fs.writeFileSync(websiteSkillsFilePath, JSON.stringify(finalSkillsData, null, 2));

    console.log(`\n🎉 [Sync Complete] All ${finalSkillsList.length} Skills & ${masterModules.length} Tutorials exported dynamically from Firestore!`);
}

fullSync().catch(console.error);
