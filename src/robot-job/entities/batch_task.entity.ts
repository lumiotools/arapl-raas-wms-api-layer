import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, PrimaryColumn, OneToMany } from 'typeorm';
import { Task } from './task.entity';

@Entity('batch_tasks')
export class BatchJob {
    @PrimaryColumn()
    batch_job_id: string;

    @Column({ type: 'int', nullable: true })
    batch_priority: number;

    @Column({ type: 'varchar', nullable: true })
    batch_type: string;

    @Column({ type: 'int', nullable: true })
    batch_frequency: number;

    @Column ({ type: 'boolean', default: false })
    status: boolean;

}