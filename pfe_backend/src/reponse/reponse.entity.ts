import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Question } from 'src/question/question.entity';

@Entity()
export class Reponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  texte: string;

  @Column({ default: false })
  estCorrect: boolean;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @ManyToOne(() => Question, (question) => question.reponses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'questionId' })
  question: Question;
}
