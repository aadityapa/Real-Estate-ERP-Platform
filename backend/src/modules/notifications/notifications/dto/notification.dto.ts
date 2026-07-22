import { IsBoolean, IsOptional } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export class FilterNotificationDto extends PaginationDto {
  @IsOptional() @IsBoolean() isRead?: boolean;
}

export class MarkReadDto {
  @IsOptional() @IsBoolean() isRead?: boolean = true;
}
