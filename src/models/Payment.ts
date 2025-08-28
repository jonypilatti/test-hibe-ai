import {
  Model,
  DataTypes,
  Optional,
  Association,
} from 'sequelize';
import { sequelize } from '../config/database';
import { PaymentHistory } from './PaymentHistory';

export interface PaymentAttributes {
  id: string;
  description: string;
  dueDate: Date;
  amountCents: number;
  currency: 'USD' | 'ARS';
  payerName: string;
  payerEmail: string;
  status: 'pending' | 'paid' | 'reversed';
  checkoutUrl: string;
  idempotencyKey: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentCreationAttributes
  extends Optional<PaymentAttributes, 'id' | 'status' | 'checkoutUrl' | 'createdAt' | 'updatedAt'> {}

export class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  public id!: string;
  public description!: string;
  public dueDate!: Date;
  public amountCents!: number;
  public currency!: 'USD' | 'ARS';
  public payerName!: string;
  public payerEmail!: string;
  public status!: 'pending' | 'paid' | 'reversed';
  public checkoutUrl!: string;
  public idempotencyKey!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly paymentHistories?: PaymentHistory[];

  public static override associations: {
    paymentHistories: Association<Payment, PaymentHistory>;
  };
}

Payment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [1, 200],
      },
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isAfterNow(value: string) {
          if (new Date(value) <= new Date()) {
            throw new Error('Due date must be in the future');
          }
        },
      },
    },
    amountCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    currency: {
      type: DataTypes.ENUM('USD', 'ARS'),
      allowNull: false,
    },
    payerName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    payerEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'reversed'),
      defaultValue: 'pending',
      allowNull: false,
    },
    checkoutUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    idempotencyKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    tableName: 'payments',
    indexes: [
      {
        unique: true,
        fields: ['idempotency_key'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

// Remove duplicate associations - they are defined in index.ts
