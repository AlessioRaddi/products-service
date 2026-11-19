export class ErrorResponseDto {
  readonly statusCode: number;
  readonly timestamp: string;
  readonly path: string;
  readonly messages: string[];
}
