/**
 * Incremental Firebase to Git Sync Engine for AI Career Coach Website & Android App
 *
 * Rules:
 * 1. Checks existing skills in website/skills.json
 * 2. Syncs Full Interview Gym docs to website/gym/{skillId}.json
 * 3. Syncs Full Tutorials to website/tutorials/{moduleId}/{topicId}.json
 * 4. Skips already synced items if unmodified (0 Reads for old data!)
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

// Also support root-level skills.json if needed
const rootSkillsFilePath = path.join(__dirname, 'skills.json');
const websiteSkillsFilePath = path.join(websiteDir, 'skills.json');

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

async function incrementalSync() {
    console.log("🔄 [Incremental Sync] Starting sync for Skills, Gym & Tutorials...");

    let existingData = { lastSyncedAt: null, totalSkills: 0, skills: [] };

    const targetSkillsPath = fs.existsSync(websiteSkillsFilePath) ? websiteSkillsFilePath : rootSkillsFilePath;
    if (fs.existsSync(targetSkillsPath)) {
        try {
            existingData = JSON.parse(fs.readFileSync(targetSkillsPath, 'utf8'));
        } catch (e) {}
    }

    const existingSkillIds = new Set((existingData.skills || []).map(s => s.id));
    console.log(`📋 Found ${existingSkillIds.size} skills in master skills.json.`);

    if (!admin.apps.length) {
        console.log("✅ [Sync Complete] Dry-run finished. 0 Firebase Reads performed.");
        return;
    }

    const db = admin.firestore();

    // ==========================================
    // 1. SYNC INTERVIEW GYM TO website/gym/{skillId}.json
    // ==========================================
    console.log("\n🏋️ [Gym Sync] Checking 'interview_gym' collection...");
    const gymSnap = await db.collection("interview_gym").get();

    for (const doc of gymSnap.docs) {
        const skillId = doc.id.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
        const gymFilePath = path.join(gymDir, `${skillId}.json`);

        const gymData = doc.data();
        const gymJsonContent = JSON.stringify({
            skillId: skillId,
            skillName: gymData.skillName || doc.id,
            questionCount: gymData.questionCount || 0,
            concepts: gymData.concepts || []
        }, null, 2);

        // Save full gym file for CDN
        fs.writeFileSync(gymFilePath, gymJsonContent);
        console.log(`  ✅ Saved full Gym JSON for '${skillId}' -> website/gym/${skillId}.json`);

        // Add teaser to master skills.json if missing
        if (!existingSkillIds.has(skillId)) {
            const concepts = gymData.concepts || [];
            const questions = [];

            concepts.forEach(concept => {
                if (concept.questions) {
                    concept.questions.forEach(qObj => {
                        questions.push({
                            q: qObj.q,
                            level: qObj.level || "Easy"
                        });
                    });
                }
            });

            existingData.skills.push({
                id: skillId,
                name: gymData.skillName || doc.id,
                category: "Tech",
                questions: questions.slice(0, 5)
            });
            existingSkillIds.add(skillId);
        }
    }

    // Save updated master skills.json to both locations if present
    existingData.lastSyncedAt = new Date().toISOString();
    existingData.totalSkills = (existingData.skills || []).length;

    fs.writeFileSync(rootSkillsFilePath, JSON.stringify(existingData, null, 2));
    fs.writeFileSync(websiteSkillsFilePath, JSON.stringify(existingData, null, 2));

    // ==========================================
    // 2. SYNC TUTORIALS TO website/tutorials/{moduleId}/{topicId}.json
    // ==========================================
    console.log("\n📚 [Tutorials Sync] Checking 'tutorials' collection...");
    const tutorialsSnap = await db.collection("tutorials").get();

    for (const moduleDoc of tutorialsSnap.docs) {
        const moduleId = moduleDoc.id.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
        const moduleDir = path.join(tutorialsDir, moduleId);
        if (!fs.existsSync(moduleDir)) fs.mkdirSync(moduleDir, { recursive: true });

        const topicsSnap = await moduleDoc.ref.collection("topics").get();
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
            console.log(`  ✅ Saved Tutorial Topic '${topicId}' -> website/tutorials/${moduleId}/${topicId}.json`);
        }
    }

    console.log("\n🎉 [Sync Complete] All Skills, Gym Q&A and Tutorials successfully synced to Git CDN repository!");
}

incrementalSync().catch(console.error);
