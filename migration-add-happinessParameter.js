// migration-add-happinessParameter.js
const mongoose = require("mongoose");
const Evaluation = require("./models/evaluationSchema");

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

async function migrate() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(
      "mongodb+srv://happy2age_user:happy2age3000@happy2age.pbct5.mongodb.net/happy2age?retryWrites=true&w=majority"
    );
    console.log("✅ Connected to MongoDB successfully!");

    console.log("🔍 Fetching all evaluations...");
    const evaluations = await Evaluation.find({});
    console.log(`📊 Found ${evaluations.length} evaluations to process`);

    let updatedCount = 0;
    let processedCount = 0;

    for (const evalDoc of evaluations) {
      processedCount++;
      console.log(
        `\n📝 Processing evaluation ${processedCount}/${evaluations.length} (ID: ${evalDoc._id})`
      );

      let changed = false;
      if (Array.isArray(evalDoc.domain)) {
        console.log(`   Found ${evalDoc.domain.length} domains`);
        for (const d of evalDoc.domain) {
          if (
            !d.happinessParameter ||
            !Array.isArray(d.happinessParameter) ||
            d.happinessParameter.length === 0
          ) {
            d.happinessParameter = domainToHappiness[d.name] || [];
            changed = true;
            console.log(
              `   ✅ Added happinessParameter to domain: "${
                d.name
              }" -> [${d.happinessParameter.join(", ")}]`
            );
          } else {
            console.log(
              `   ⏭️  Domain "${
                d.name
              }" already has happinessParameter: [${d.happinessParameter.join(
                ", "
              )}]`
            );
          }
        }
      } else {
        console.log(`   ⚠️  No domains found in this evaluation`);
      }

      if (changed) {
        // Mark the domain array as modified for Mongoose to detect changes
        evalDoc.markModified("domain");
        await evalDoc.save();
        updatedCount++;
        console.log(`   💾 Saved updated evaluation`);
      } else {
        console.log(`   ⏭️  No changes needed for this evaluation`);
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(
      `📈 Updated ${updatedCount} out of ${evaluations.length} evaluation documents.`
    );
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
// node migration-add-happinessParameter.js
