/**
 * fix_providers.js
 * One-time migration script to clean up bad data in provider accounts.
 *
 * Fixes:
 * 1. Service providers whose providerProfile contains old doctor-schema fields
 *    (about, consultationFee, doctorImage, experience, isOnline, languages,
 *     qualification, specialization) — these are stripped out.
 * 2. Prints a list of service providers with missing/empty serviceType
 *    so you know which accounts need to re-submit their profile.
 *
 * Usage: node fix_providers.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("❌ MONGO_URI not found in .env");
    process.exit(1);
}

// We connect directly and use a raw collection to bypass Mongoose strict mode
// so we can deliberately $unset fields that aren't in the current schema
const run = async () => {
    try {
        const conn = await mongoose.connect(MONGO_URI);
        console.log("✅ Connected:", MONGO_URI);

        const db = conn.connection.db;
        const collection = db.collection("users");

        // --- FIX 1: Remove doctor-style fields from providerProfile sub-document ---
        // These fields got saved there when old code set providerProfile = doctorObject
        const doctorFieldsInProfile = [
            "providerProfile.about",
            "providerProfile.consultationFee",
            "providerProfile.doctorImage",
            "providerProfile.experience",
            "providerProfile.isOnline",
            "providerProfile.languages",
            "providerProfile.qualification",
            "providerProfile.specialization",
        ];

        const unsetObj = {};
        doctorFieldsInProfile.forEach(f => { unsetObj[f] = ""; });

        const fix1Result = await collection.updateMany(
            {
                userType: { $in: ["service-provider", "service provider"] },
                $or: doctorFieldsInProfile.map(f => ({ [f]: { $exists: true } }))
            },
            { $unset: unsetObj }
        );

        console.log(`\n🔧 FIX 1 — Removed contaminated doctor fields from providerProfile:`);
        console.log(`   Matched:  ${fix1Result.matchedCount} service-provider accounts`);
        console.log(`   Modified: ${fix1Result.modifiedCount} documents`);

        // --- REPORT: Show providers with no serviceType ---
        const noServiceType = await collection.find({
            userType: { $in: ["service-provider", "service provider"] },
            $or: [
                { "providerProfile.serviceType": { $exists: false } },
                { "providerProfile.serviceType": "" },
                { "providerProfile.serviceType": null },
            ]
        }, {
            projection: { name: 1, email: 1, "providerProfile.serviceType": 1, profileCompleted: 1 }
        }).toArray();

        if (noServiceType.length > 0) {
            console.log(`\n⚠️  REPORT — Service providers with missing serviceType (need to re-submit profile):`);
            noServiceType.forEach(u => {
                console.log(`   • ${u.name} (${u.email}) — profileCompleted: ${u.profileCompleted}`);
            });
        } else {
            console.log(`\n✅ All service providers have a serviceType set.`);
        }

        // --- REPORT: Show all providers and their serviceType ---
        const allProviders = await collection.find(
            { userType: { $in: ["service-provider", "service provider"] } },
            { projection: { name: 1, email: 1, "providerProfile.serviceType": 1, "providerProfile.verification.status": 1 } }
        ).toArray();

        console.log(`\n📋 All Service Providers:`);
        allProviders.forEach(u => {
            const st = u.providerProfile?.serviceType || "❌ MISSING";
            const vs = u.providerProfile?.verification?.status || "none";
            console.log(`   • ${u.name} | serviceType: ${st} | verification: ${vs}`);
        });

        console.log("\n✅ Migration complete.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
};

run();
