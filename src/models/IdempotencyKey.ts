import {
  Model,
  DataTypes,
  Optional,
} from 'sequelize';
import { sequelize } from '../config/database';

export interface IdempotencyKeyAttributes {
  id: string;
  key: string;
  requestHash: string;
  responseData: string;
  expiresAt: Date;
  createdAt?: Date;
}

export interface IdempotencyKeyCreationAttributes
  extends Optional<IdempotencyKeyAttributes, 'id' | 'createdAt'> {}

export class IdempotencyKey extends Model<IdempotencyKeyAttributes, IdempotencyKeyCreationAttributes> implements IdempotencyKeyAttributes {
  public id!: string;
  public key!: string;
  public requestHash!: string;
  public responseData!: string;
  public expiresAt!: Date;
  public readonly createdAt!: Date;
}

IdempotencyKey.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    requestHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    responseData: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'idempotency_keys',
    indexes: [
      {
        unique: true,
        fields: ['key'],
      },
      {
        fields: ['expires_at'],
      },
    ],
  }
);
