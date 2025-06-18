import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';
import { Attribute, Dimension, LocationAction, LocationType } from '../dto/Task_Generation.dto';

@Entity('locations')
export class Location {
    @PrimaryColumn()
    location_id: string;

    @Column({ type: 'enum', enum: LocationType, default: LocationType.Pallet })
    location_type:  LocationType;

    @Column({ type: 'enum', enum: LocationAction})
    location_action: LocationAction;

    @Column({ type: 'json' })
    location_dimension: Dimension;

    @Column({ type: 'json', nullable: true })
    location_attribute: Attribute;

    @Column({ type: 'int', nullable: true })
    pickupPriority: number;

    @Column({ type: 'int', nullable: true })
    dropPriority: number;

    @Column({ type: 'int', nullable: true })
    row: number;

    @Column({ type: 'int', nullable: true })
    column: number;

    @Column({ type: "boolean", default: false })
    isEmpty: boolean;

}
