import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from 'src/role/role.entity';
import { Scenario } from 'src/scenario/scenario.entity';
import { Rapport } from 'src/rapport/rapport.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  lastName!: string;

  @Column()
  firstName!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @CreateDateColumn()
  dateInscription!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @OneToMany(() => Scenario, (scenario) => scenario.user)
  scenarios!: Scenario[];

  @OneToMany(() => Rapport, (rapport) => rapport.user)
  rapports!: Rapport[];
}
