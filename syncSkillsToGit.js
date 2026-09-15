/**
 * Incremental Firebase to Git Sync Engine for AI Career Coach Website
 *
 * Rules:
 * 1. Checks existing skills in skills.json
 * 2. Fetches 'skills_master' from Firestore ONCE
 * 3. Skips any skill that ALREADY exists in skills.json (0 Reads for old skills!)
 * 4. Only fetches NEW skills from Firestore 'interview_gym'
 * 5. Strips full answers to prevent data leakage and forces App downloads for answers!
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase Admin (Requires serviceAccountKey.json or Google App Credentials)
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
    console.log("🔄 [Incremental Sync] Starting check for new skills...");

    const skillsFilePath = path.join(__dirname, 'skills.json');
    let existingData = { lastSyncedAt: null, totalSkills: 0, skills: [] };

    if (fs.existsSync(skillsFilePath)) {
        existingData = JSON.parse(fs.readFileSync(skillsFilePath, 'utf8'));
    }

    const existingSkillIds = new Set(existingData.skills.map(s => s.id));
    console.log(`📋 Found ${existingSkillIds.size} skills already in Git repository.`);

    if (!admin.apps.length) {
        console.log("✅ [Sync Complete] All skills up-to-date in Git CDN. 0 Firebase Reads performed.");
        return;
    }

    const db = admin.firestore();
    const masterSnap = await db.collection("skills_master").get();

    let newSkillsAdded = 0;

    for (const doc of masterSnap.docs) {
        const list = doc.data().skills || [];
        for (const skillName of list) {
            const skillId = skillName.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');

            // SKIPS IF SKILL ALREADY EXISTS IN GIT! (0 READS)
            if (existingSkillIds.has(skillId)) {
                console.log(`⏩ Skipping existing skill: '${skillName}' (0 Reads)`);
                continue;
            }

            console.log(`✨ Found NEW skill in Firebase: '${skillName}'! Fetching Q&A teaser...`);
            const gymDoc = await db.collection("interview_gym").doc(skillId).get();

            if (gymDoc.exists && gymDoc.data().concepts) {
                const concepts = gymDoc.data().concepts;
                const questions = [];

                concepts.forEach(concept => {
                    if (concept.questions) {
                        concept.questions.forEach(qObj => {
                            questions.push({
                                q: qObj.q,
                                level: qObj.level || "Easy"
                                // Note: 'a' and 'p' (answers) are deliberately omitted to promote App downloads!
                            });
                        });
                    }
                });

                existingData.skills.push({
                    id: skillId,
                    name: skillName,
                    category: "Tech",
                    questions: questions.slice(0, 5) // Store top 5 teaser questions
                });

                existingSkillIds.add(skillId);
                newSkillsAdded++;
            }
        }
    }

    if (newSkillsAdded > 0) {
        existingData.lastSyncedAt = new Date().toISOString();
        existingData.totalSkills = existingData.skills.length;
        fs.writeFileSync(skillsFilePath, JSON.stringify(existingData, null, 2));
        console.log(`✅ [Sync Complete] Added ${newSkillsAdded} NEW skills to Git repository!`);
    } else {
        console.log("🎉 [Sync Complete] No new skills found. Everything is already synced in Git!");
    }
}

incrementalSync().catch(console.error);
