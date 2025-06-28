import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';
import {
  Attribute,
  Dimension,
  LocationAction,
  LocationType,
} from '../dto/Task_Generation.dto';

@Entity('warehouse')
export class Warehouse {
  @PrimaryColumn()
  warehouse_id: string;

  @Column({ type: 'varchar' })
  warehouse_name: string;

  @Column({ type: 'varchar' })
  api_key: string;

  @Column({ type: 'boolean' })
  locations_customer_managed: boolean;

  @Column({ type: 'varchar', nullable: true })
  webhook_url: string | null;

  // Task configuration mappings stored as JSON
  @Column({ type: 'json', nullable: true })
  create_task_config: any;

  @Column({ type: 'json', nullable: true })
  update_task_config: any;

  @Column({ type: 'json', nullable: true })
  cancel_task_config: any;

  @Column({ type: 'json', nullable: true })
  get_location_config: any;
}
