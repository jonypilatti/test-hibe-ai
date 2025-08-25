import { Payment } from './Payment';
import { PaymentHistory } from './PaymentHistory';
import { IdempotencyKey } from './IdempotencyKey';

// Export all models
export { Payment, PaymentHistory, IdempotencyKey };

// Set up associations
export const setupAssociations = (): void => {
  // Payment associations
  Payment.hasMany(PaymentHistory, {
    sourceKey: 'id',
    foreignKey: 'paymentId',
    as: 'paymentHistories',
  });

  // PaymentHistory associations
  PaymentHistory.belongsTo(Payment, {
    targetKey: 'id',
    foreignKey: 'paymentId',
    as: 'payment',
  });
};
