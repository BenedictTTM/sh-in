import { IsString, IsInt, Min } from 'class-validator';

export class SubmitAnswerDto {
  @IsInt()
  @Min(1)
  questionId: number;

  @IsInt()
  @Min(1)
  selectedChoiceId: number;

  @IsString()
  idempotencyKey: string;
}
