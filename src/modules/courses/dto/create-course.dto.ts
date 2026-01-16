import { Type } from 'class-transformer';
import { IsString, IsInt, IsOptional, ValidateNested, IsBoolean, IsArray, IsEnum } from 'class-validator';

// 4. CHALLENGE
export class CreateChallengeDto {
    @IsString()
    question: string;

    @IsString()
    @IsOptional()
    type?: string;

    @IsInt()
    @IsOptional()
    order?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateChallengeOptionDto)
    options: CreateChallengeOptionDto[];
}

export class CreateChallengeOptionDto {
    @IsString()
    text: string;

    @IsBoolean()
    correct: boolean;

    @IsString()
    @IsOptional()
    imageSrc?: string;

    @IsString()
    @IsOptional()
    audioSrc?: string;
}

// 3. LESSON
export class CreateLessonDto {
    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    difficulty?: string;

    @IsInt()
    @IsOptional()
    order?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateChallengeDto)
    @IsOptional()
    challenges?: CreateChallengeDto[];
}

// 2. UNIT
export class CreateUnitDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsInt()
    @IsOptional()
    order?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLessonDto)
    @IsOptional()
    lessons?: CreateLessonDto[];
}

// 1. COURSE
export class CreateCourseDto {
    @IsString()
    title: string;

    @IsString()
    imageSrc?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    isPublished?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateUnitDto)
    @IsOptional()
    @IsOptional()
    units?: CreateUnitDto[];
}

export class SubmitChallengeDto {
    @IsInt()
    challengeId: number;

    @IsInt()
    optionId: number;
}
