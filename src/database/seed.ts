import { sequelize } from '../config/database';
import { Payment, PaymentHistory } from '../models';
import { setupAssociations } from '../models';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Setup associations
    setupAssociations();
    
    // Force sync (drops existing tables)
    await sequelize.sync({ force: true });
    console.log('✅ Database tables created');
    
    // Create sample payments
    await Payment.create({
      description: 'Pago por servicios de consultoría',
      dueDate: new Date('2024-12-31'),
      amountCents: 50000,
      currency: 'USD',
      payerName: 'Juan Pérez',
      payerEmail: 'juan.perez@example.com',
      status: 'pending',
      checkoutUrl: 'https://sandbox.hibe.local/checkout/sample-1',
      idempotencyKey: 'seed-payment-1',
    });
    
    const payment2 = await Payment.create({
      description: 'Pago por licencia de software',
      dueDate: new Date('2024-11-30'),
      amountCents: 25000,
      currency: 'ARS',
      payerName: 'María González',
      payerEmail: 'maria.gonzalez@example.com',
      status: 'paid',
      checkoutUrl: 'https://sandbox.hibe.local/checkout/sample-2',
      idempotencyKey: 'seed-payment-2',
    });
    
    console.log('✅ Sample payments created');
    
    // Create sample payment history
    await PaymentHistory.create({
      paymentId: payment2.id,
      oldStatus: 'pending',
      newStatus: 'paid',
      reason: 'Pago completado exitosamente',
    });
    
    console.log('✅ Sample payment history created');
    console.log('📊 Database file location:', process.env['DB_PATH'] || './database/hibe_ai.db');
    console.log('✅ Seeding completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
