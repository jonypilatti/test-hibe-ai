import { sequelize } from '../config/database';
import { setupAssociations } from '../models';

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Setup associations
    setupAssociations();
    console.log('✅ Database associations configured');
    
    // Sync all models (in production, use migrations instead)
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized');
    
    console.log('📊 Database file location:', process.env['DB_PATH'] || './database/hibe_ai.db');
    console.log('✅ Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
