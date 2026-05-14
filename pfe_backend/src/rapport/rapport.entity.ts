import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TypeRapport } from 'src/common/enums';
import { User } from 'src/users/user.entity';
import { Scenario } from 'src/scenario/scenario.entity';

@Entity()
export class Rapport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TypeRapport })
  type: TypeRapport;

  @CreateDateColumn()
  date: Date;

  @Column({ type: 'jsonb', nullable: true })
  donnees: Record<string, unknown>;

  @Column({ type: 'float', nullable: true })
  score: number;

  @ManyToOne(() => User, (user) => user.rapports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Scenario, (scenario) => scenario.rapports, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'scenarioId' })
  scenario: Scenario;
}
