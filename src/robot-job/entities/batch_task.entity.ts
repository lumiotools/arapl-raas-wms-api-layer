import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, PrimaryColumn, OneToMany, BatchType } from 'typeorm';
import { batch_type } from '../dto/Task_Generation.dto';

@Entity('batch_tasks')
export class BatchJob {
    @PrimaryColumn()
    batch_job_id: string;

    @Column({ type: 'int', nullable: true })
    batch_priority: number;

    @Column({ type: 'enum', enum: ["Continuous","Discrete"], nullable: true , default: batch_type.Discrete })
    batch_type: batch_type;

    @Column({ type: 'int', nullable: true })
    batch_frequency: number;

    @Column ({ type: 'varchar', default: "pending" })
    status: string;

}