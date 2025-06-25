import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';
import { Attribute, Dimension, LocationAction, LocationType } from '../dto/Task_Generation.dto';

@Entity('warehouse')
export class Warehouse {
    @PrimaryColumn()
    warehouse_id: string;

    @Column({type: 'varchar'})
    warehouse_name: string;

    @Column({type: 'varchar'})
    api_key: string;

    @Column({type: 'boolean'})
    locations_customer_managed: boolean;
}
