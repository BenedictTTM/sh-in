import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateChoiceDto {
  @IsOptional()
  @IsInt()
  id?: number; // If provided, updates existing; if omitted, creates new

  @IsString()
  @MaxLength(1000)
  text: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  _delete?: boolean; // Mark for deletion
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsInt()
  id?: number; // If provided, updates existing; if omitted, creates new

  @IsString()
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateChoiceDto)
  choices?: UpdateChoiceDto[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  correctChoiceIndexes?: number[];

  @IsOptional()
  @IsBoolean()
  _delete?: boolean; // Mark for deletion
}

export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  passingScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuestionDto)
  questions?: UpdateQuestionDto[];
}
