import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('robots')
export class Robot {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    robot_id: string;

    @Column({ type: 'boolean', default: true })
    available: boolean;


    @Column({ type: 'varchar', length: 100, nullable: true })
    last_task_id: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    current_task_id: string | null;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
