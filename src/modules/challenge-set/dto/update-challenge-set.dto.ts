import { PartialType } from '@nestjs/mapped-types';
import { CreateChallengeSetDto } from './create-challenge-set.dto';

export class UpdateChallengeSetDto extends PartialType(CreateChallengeSetDto) {}
