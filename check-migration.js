// check-migration.js
const mongoose = require("mongoose");
const Evaluation = require("./models/evaluationSchema");

async function checkMigration() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(
      "mongodb+srv://happy2age_user:happy2age3000@happy2age.pbct5.mongodb.net/happy2age?retryWrites=true&w=majority"
    );
    console.log("✅ Connected to MongoDB successfully!");

    // Get a few sample evaluations
    const evaluations = await Evaluation.find({}).limit(5);

    console.log(`\n📊 Checking ${evaluations.length} sample evaluations:`);

    evaluations.forEach((eval, index) => {
      console.log(`\n--- Evaluation ${index + 1} (ID: ${eval._id}) ---`);
      console.log(`Cohort: ${eval.cohort}`);
      console.log(`Participant: ${eval.participant}`);
      console.log(`Activity: ${eval.activity}`);
      console.log(`Session: ${eval.session}`);
      console.log(`Grand Average: ${eval.grandAverage}`);

      if (Array.isArray(eval.domain)) {
        console.log(`\nDomains (${eval.domain.length}):`);
        eval.domain.forEach((domain, domainIndex) => {
          console.log(`  ${domainIndex + 1}. ${domain.name}`);
          console.log(`     Category: ${domain.category}`);
          console.log(`     Average: ${domain.average}`);
          console.log(
            `     Happiness Parameter: ${JSON.stringify(
              domain.happinessParameter
            )}`
          );
          console.log(
            `     SubTopics: ${domain.subTopics ? domain.subTopics.length : 0}`
          );
          console.log(`     All fields: ${Object.keys(domain).join(", ")}`);
        });
      } else {
        console.log("No domains found");
      }
    });

    // Check if any evaluations have happinessParameter
    const withHappiness = await Evaluation.find({
      "domain.happinessParameter": { $exists: true, $ne: [] },
    }).countDocuments();

    const total = await Evaluation.countDocuments();

    console.log(`\n📈 Migration Status:`);
    console.log(`Total evaluations: ${total}`);
    console.log(`Evaluations with happinessParameter: ${withHappiness}`);
    console.log(`Percentage: ${((withHappiness / total) * 100).toFixed(2)}%`);

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Check failed:", error);
    process.exit(1);
  }
}

checkMigration();
