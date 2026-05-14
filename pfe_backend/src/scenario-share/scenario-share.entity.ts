import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Scenario } from 'src/scenario/scenario.entity';
import { User } from 'src/users/user.entity';

export type SharePermission = 'view' | 'edit';

@Entity()
export class ScenarioShare {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: ['view', 'edit'], default: 'view' })
  permission!: SharePermission;

  @CreateDateColumn()
  sharedAt!: Date;

  @ManyToOne(() => Scenario, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'scenarioId' })
  scenario!: Scenario;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'sharedWithId' })
  sharedWith!: User;
}
