import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
  OneToMany,
  BatchType,
  Unique,
} from 'typeorm';
import { batch_type } from '../dto/Task_Generation.dto';

@Entity('batch_tasks')
export class BatchJob {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar'})
  batch_job_id: string;

  @Column({ nullable: true })
  warehouse_id: string;

  @Column({ type: 'int', default: 5 })
  batch_priority: number;

  @Column({ type: 'enum', enum: batch_type, default: batch_type.Discrete })
  batch_type: batch_type;

  @Column({ type: 'int', nullable: true })
  batch_frequency: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;
}
