/**
 * Pure Dynamic Daily Question Poster for Global Chat & Pinned Banner
 *
 * Rules:
 * 1. Picks a RANDOM question directly from Firestore 'interview_gym' collection (0 Hardcoding!).
 * 2. Posts to 'global_chat' as 'AI Career Coach Bot 🤖'
 * 3. Updates 'statistics/daily_discussion' doc so Android App auto-pins today's question banner!
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("❌ No serviceAccountKey.json found!");
        process.exit(1);
    }
}

async function postDailyQuestion() {
    console.log("🚀 [Daily Discussion] Fetching random question from Firestore 'interview_gym'...");

    const db = admin.firestore();

    // 1. Fetch all documents from interview_gym
    const gymSnap = await db.collection("interview_gym").get();
    if (gymSnap.empty) {
        console.error("❌ 'interview_gym' collection is empty!");
        return;
    }

    // Collect all valid questions across all skills
    const allQuestions = [];

    gymSnap.forEach(doc => {
        const gymData = doc.data();
        const skillName = gymData.skillName || doc.id;
        const concepts = gymData.concepts || [];

        concepts.forEach(concept => {
            const conceptName = concept.conceptName || "Technical Concept";
            if (Array.isArray(concept.questions)) {
                concept.questions.forEach(qObj => {
                    if (qObj && qObj.q) {
                        allQuestions.push({
                            skillId: doc.id,
                            skillName: skillName,
                            conceptName: conceptName,
                            q: qObj.q,
                            level: qObj.level || "Medium"
                        });
                    }
                });
            }
        });
    });

    if (allQuestions.length === 0) {
        console.error("❌ No questions found in 'interview_gym'!");
        return;
    }

    // 2. Pick a random question
    const randomIndex = Math.floor(Math.random() * allQuestions.length);
    const selected = allQuestions[randomIndex];

    const todayStr = new Date().toISOString().split('T')[0]; // "2026-09-15"
    console.log(`✨ Picked Random Question [${selected.skillName} - ${selected.level}]: "${selected.q}"`);

    // 3. Format Bot Chat Message
    const botMessageText = `📌 TODAY'S DAILY DISCUSSION QUESTION:\n\n"${selected.q}"\n\n📌 Category: ${selected.skillName} • ${selected.conceptName}\n📊 Difficulty: ${selected.level}\n\n💬 Share your answer, thoughts, or code in the comments below! 👇`;

    const chatRef = db.collection("global_chat").doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    const chatMessageData = {
        messageId: chatRef.id,
        senderUid: "ai_bot_official",
        senderName: "AI Career Coach Bot 🤖",
        senderPhotoUrl: "https://raw.githubusercontent.com/SiddhuSandySam/ai-career-coach/main/sandesh.png",
        message: botMessageText,
        timestamp: timestamp,
        isDailyQuestion: true,
        skillId: selected.skillId,
        questionText: selected.q,
        category: selected.skillName,
        level: selected.level
    };

    // 4. Save message to global_chat
    await chatRef.set(chatMessageData);
    console.log(`✅ Posted message to 'global_chat' (ID: ${chatRef.id})`);

    // 5. Update 'statistics/daily_discussion' doc so Android App auto-pins today's question!
    const dailyRef = db.collection("statistics").doc("daily_discussion");
    const dailyData = {
        date: todayStr,
        question: selected.q,
        skillName: selected.skillName,
        conceptName: selected.conceptName,
        level: selected.level,
        messageId: chatRef.id,
        updatedAt: timestamp
    };

    await dailyRef.set(dailyData, { merge: true });
    console.log(`📌 Auto-pinned today's question in 'statistics/daily_discussion'!`);

    console.log("🎉 [Daily Discussion Complete] Question posted and pinned successfully!");
}

postDailyQuestion().catch(console.error);
