import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class PlaceholderPipe implements PipeTransform {
  transform(value: any): any {
    return value;
  }
}
