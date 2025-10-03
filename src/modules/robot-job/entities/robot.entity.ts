import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TaskType } from '../dto/Task_Generation.dto';

@Entity('robots')
export class Robot {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    robot_id: string;

    @Column({ type: 'boolean', default: true })
    available: boolean;

    @Column({ type: 'enum', enum : TaskType, default: TaskType.GoodsToPerson })
    task_type: TaskType;

    @Column({ type: 'boolean', default: true})
    is_active: boolean;

    @Column({ type: 'varchar', length: 100, nullable: true })
    message_code: 'maintenance' | 'charging' | 'error' | null;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
