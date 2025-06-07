import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ForeignKey, ManyToOne, JoinTable, PrimaryColumn, JoinColumn } from 'typeorm';
import { Cargo, Location, TaskType, Wait } from '../dto/Task_Generation.dto'; // Adjust the import path as necessary
import { BatchJob } from './batch_task.entity'; // Adjust the import path as necessary
@Entity('tasks')
export class Task {
    @PrimaryColumn()
    task_id: string;

    @Column({ nullable: true })
    task_pallet_id: string;

    @Column({ type: 'enum', enum: TaskType, default: TaskType.CrossDocking })
    task_type: TaskType;

    @Column({ nullable: true })
    task_dependency : string;

    @Column({type: 'json'})
    start_location: Location;

    @Column({type: 'json'})
    end_location: Location;

    @Column({ type: 'json', nullable: true })
    wait_time: Wait; 

    @Column({ type: 'json' })
    cargos: Cargo[];

    @ManyToOne(() => BatchJob, {
        nullable: true,
        eager: true,
        cascade: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'batch_job_id' })
    batch_job: BatchJob;

    @Column ({ type: 'varchar', default: "pending" })
    status: string;
}