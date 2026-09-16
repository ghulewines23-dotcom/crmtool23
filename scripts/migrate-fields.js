const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://ayushjha425a_db_user:28NkRA8meGEvuWbt@cluster0.ackvhe3.mongodb.net/serene-crm';

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('=== MIGRATION: requirements -> requirement, add sourceUrl ===');

  const totalBefore = await db.collection('leads').countDocuments();
  const withRequirements = await db.collection('leads').countDocuments({ requirements: { $exists: true } });
  const withRequirement = await db.collection('leads').countDocuments({ requirement: { $exists: true } });
  const withSourceUrl = await db.collection('leads').countDocuments({ sourceUrl: { $exists: true } });

  console.log('Total leads:', totalBefore);
  console.log('Has "requirements" (plural):', withRequirements);
  console.log('Has "requirement" (singular):', withRequirement);
  console.log('Has "sourceUrl":', withSourceUrl);

  if (withRequirements > 0) {
    console.log('\nStep 1: Renaming requirements -> requirement...');
    const renameResult = await db.collection('leads').updateMany(
      { requirements: { $exists: true } },
      [{ $set: { requirement: '$requirements' } }]
    );
    console.log('Renamed:', renameResult.modifiedCount, 'docs');

    const unsetResult = await db.collection('leads').updateMany(
      { requirements: { $exists: true } },
      [{ $unset: 'requirements' }]
    );
    console.log('Removed old field from:', unsetResult.modifiedCount, 'docs');
  }

  if (withSourceUrl < totalBefore) {
    console.log('\nStep 2: Adding sourceUrl field to docs missing it...');
    const addResult = await db.collection('leads').updateMany(
      { sourceUrl: { $exists: false } },
      [{ $set: { sourceUrl: '' } }]
    );
    console.log('Added sourceUrl to:', addResult.modifiedCount, 'docs');
  }

  console.log('\n=== VERIFICATION ===');
  const totalAfter = await db.collection('leads').countDocuments();
  const withReqAfter = await db.collection('leads').countDocuments({ requirement: { $exists: true } });
  const withOldReq = await db.collection('leads').countDocuments({ requirements: { $exists: true } });
  const withSourceUrlAfter = await db.collection('leads').countDocuments({ sourceUrl: { $exists: true } });

  console.log('Total leads:', totalAfter);
  console.log('Has "requirement" (singular):', withReqAfter);
  console.log('Has "requirements" (plural):', withOldReq);
  console.log('Has "sourceUrl":', withSourceUrlAfter);

  const sample = await db.collection('leads').findOne({});
  if (sample) {
    const fields = Object.keys(sample).sort();
    console.log('\nSample doc fields:', fields.join(', '));
    console.log('requirement value:', JSON.stringify(sample.requirement));
    console.log('sourceUrl value:', JSON.stringify(sample.sourceUrl));
  }

  await mongoose.disconnect();
  console.log('\n=== MIGRATION COMPLETE ===');
}
migrate().catch(e => { console.error(e); process.exit(1); });
