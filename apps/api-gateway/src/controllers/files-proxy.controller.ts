import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Files (Proxy)')
@Controller('files')
export class FilesProxyController {}
