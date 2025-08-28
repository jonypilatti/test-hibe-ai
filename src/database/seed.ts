import { sequelize } from '../config/database';
import { Payment, PaymentHistory } from '../models';
import { setupAssociations } from '../models';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    console.log('📁 Database path:', process.env['DB_PATH'] || './database/hibe_ai.db');
    console.log('🔧 Environment:', process.env['NODE_ENV'] || 'development');
    console.log('');
    
    // Setup associations
    console.log('🔗 Setting up database associations...');
    setupAssociations();
    console.log('✅ Associations configured');
    console.log('');
    
    // Force sync (drops existing tables)
    console.log('🗄️ Creating database tables...');
    await sequelize.sync({ force: true });
    console.log('✅ Database tables created successfully');
    console.log('');
    
    // Create sample payments
    console.log('💰 Creating sample payments...');
    
    console.log('  📝 Creating payment 1: Consultoría...');
    const payment1 = await Payment.create({
      description: 'Pago por servicios de consultoría',
      dueDate: new Date('2026-12-31'),
      amountCents: 50000,
      currency: 'USD',
      payerName: 'Juan Pérez',
      payerEmail: 'juan.perez@example.com',
      status: 'pending',
      checkoutUrl: 'https://sandbox.hibe.local/checkout/sample-1',
      idempotencyKey: 'seed-payment-1',
    });
    console.log(`    ✅ Payment 1 created with ID: ${payment1.id}`);
    
    console.log('  📝 Creating payment 2: Licencia de software...');
    const payment2 = await Payment.create({
      description: 'Pago por licencia de software',
      dueDate: new Date('2026-11-30'),
      amountCents: 25000,
      currency: 'ARS',
      payerName: 'María González',
      payerEmail: 'maria.gonzalez@example.com',
      status: 'paid',
      checkoutUrl: 'https://sandbox.hibe.local/checkout/sample-2',
      idempotencyKey: 'seed-payment-2',
    });
    console.log(`    ✅ Payment 2 created with ID: ${payment2.id}`);
    
    console.log('✅ Sample payments created successfully');
    console.log('');
    
    // Create sample payment history
    console.log('📈 Creating payment history...');
    const history = await PaymentHistory.create({
      paymentId: payment2.id,
      oldStatus: 'pending',
      newStatus: 'paid',
      reason: 'Pago completado exitosamente',
    });
    console.log(`  ✅ History record created with ID: ${history.id}`);
    console.log('✅ Sample payment history created successfully');
    console.log('');
    
    // Summary
    console.log('📊 SEEDING SUMMARY:');
    console.log('  🗄️  Database: Created/Reset');
    console.log('  💰  Payments: 2 records');
    console.log('  📈  History: 1 record');
    console.log('  📁  Location:', process.env['DB_PATH'] || './database/hibe_ai.db');
    console.log('');
    console.log('🎉 Seeding completed successfully!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('  - Start the application: npm run dev');
    console.log('  - Test endpoints with the sample data');
    console.log('  - View data in DBeaver or similar tool');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ SEEDING FAILED ❌');
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as any).errors)) {
      console.error('Validation errors:');
      (error as any).errors.forEach((err: any) => {
        console.error(`  - ${err.path}: ${err.message}`);
      });
    }
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('  - Check database connection');
    console.error('  - Verify environment variables');
    console.error('  - Check model validations');
    console.error('');
    process.exit(1);
  }
}

seed();
