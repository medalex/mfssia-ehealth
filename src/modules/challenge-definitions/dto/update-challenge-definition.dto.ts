import { PartialType } from '@nestjs/mapped-types';
import { CreateChallengeDefinitionDto } from './create-challenge-definition.dto';

export class UpdateChallengeDefinitionDto extends PartialType(
  CreateChallengeDefinitionDto,
) {}
