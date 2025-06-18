import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StandardResponseDto<T = any> {
  @ApiProperty({
    description: 'Success status of the request',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Response data (optional)',
  })
  data?: T;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  status: number;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2025-06-18T10:30:00.000Z',
  })
  timestamp: string;

  @ApiPropertyOptional({
    description: 'Error details (only present when success is false)',
  })
  error?: string;
  @ApiPropertyOptional({
    description: 'Pagination metadata (for paginated responses)',
  })
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;
}
