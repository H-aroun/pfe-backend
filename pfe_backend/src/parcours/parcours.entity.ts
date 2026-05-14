import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Scenario } from 'src/scenario/scenario.entity';

@Entity()
export class Parcours {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  titre: string;

  @Column({ nullable: true })
  texte: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  dureeEstimee: number;

  @ManyToOne(() => Scenario, (scenario) => scenario.parcours, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scenarioId' })
  scenario: Scenario;
}
