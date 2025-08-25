import {
  Model,
  DataTypes,
  Optional,
  BelongsTo,
  Association,
} from 'sequelize';
import { sequelize } from '../config/database';
import { Payment } from './Payment';

export interface PaymentHistoryAttributes {
  id: string;
  paymentId: string;
  oldStatus: 'pending' | 'paid' | 'reversed';
  newStatus: 'pending' | 'paid' | 'reversed';
  reason?: string;
  createdAt?: Date;
}

export interface PaymentHistoryCreationAttributes
  extends Optional<PaymentHistoryAttributes, 'id' | 'createdAt'> {}

export class PaymentHistory extends Model<PaymentHistoryAttributes, PaymentHistoryCreationAttributes> implements PaymentHistoryAttributes {
  public id!: string;
  public paymentId!: string;
  public oldStatus!: 'pending' | 'paid' | 'reversed';
  public newStatus!: 'pending' | 'paid' | 'reversed';
  public reason?: string;
  public readonly createdAt!: Date;

  // Associations
  public readonly payment?: Payment;

  public static associations: {
    payment: Association<PaymentHistory, Payment>;
  };
}

PaymentHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'payments',
        key: 'id',
      },
    },
    oldStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'reversed'),
      allowNull: false,
    },
    newStatus: {
      type: DataTypes.ENUM('pending', 'paid', 'reversed'),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'payment_histories',
    indexes: [
      {
        fields: ['payment_id'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

// Remove duplicate associations - they are defined in index.ts
