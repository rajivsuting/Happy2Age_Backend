// migration-update-domains-only.js
const mongoose = require("mongoose");
const Domain = require("./models/domainSchema");
require("dotenv").config();

// Hardcoded mapping from the image
const domainToHappiness = {
  Creativity: [
    "Positive Emotions",
    "Engagement & Purpose",
    "Satisfaction with the program",
  ],
  "Motor Skills": ["Positive Emotions", "Satisfaction with the program"],
  "Perception of Self": ["Positive Emotions", "Satisfaction with the program"],
  "Group Interaction": ["Social Belonging", "Satisfaction with the program"],
  Verbalisation: ["Social Belonging"],
  Attention: ["Engagement & Purpose"],
  Cognition: ["Engagement & Purpose"],
  Initiative: ["Engagement & Purpose"],
};

async function migrateDomains() {
  try {
    console.log("🔄 Connecting to MongoDB...");

    // Use the same connection approach as the main app
    const connection = await mongoose.connect(process.env.MONGO_URL);
    console.log(
      `✅ MongoDB Connected: ${connection.connection.host} ${connection.connection.name}`
    );

    console.log("🔍 Fetching all standalone Domain records...");
    const domains = await Domain.find({});
    console.log(`📊 Found ${domains.length} standalone domains to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const domain of domains) {
      console.log(
        `\n📝 Processing domain: "${domain.name}" (ID: ${domain._id})`
      );

      if (
        !domain.happinessParameter ||
        !Array.isArray(domain.happinessParameter) ||
        domain.happinessParameter.length === 0
      ) {
        const happinessParams = domainToHappiness[domain.name] || [];
        domain.happinessParameter = happinessParams;
        await domain.save();
        updatedCount++;
        console.log(
          `   ✅ Updated domain "${domain.name}" -> [${happinessParams.join(
            ", "
          )}]`
        );
      } else {
        skippedCount++;
        console.log(
          `   ⏭️  Domain "${
            domain.name
          }" already has happinessParameter: [${domain.happinessParameter.join(
            ", "
          )}]`
        );
      }
    }

    console.log(`\n🎉 Domain migration completed!`);
    console.log(`📈 Updated ${updatedCount} domains`);
    console.log(
      `⏭️  Skipped ${skippedCount} domains (already had happinessParameter)`
    );
    console.log(`📊 Total processed: ${domains.length} domains`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateDomains().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Run with: node migration-update-domains-only.js
