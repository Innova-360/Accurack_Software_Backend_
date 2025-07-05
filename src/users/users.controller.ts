import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { ProfileEndpoint } from './decorators/profile-endpoints.decorator';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    clientId: string;
    businessId?: string;
    [key: string]: unknown;
  };
}

@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ProfileEndpoint.GetProfile()
  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.usersService.getMe(userId);
  }

  @ProfileEndpoint.UpdateProfile(UpdateUserProfileDto)
  @Patch('me')
  async updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ) {
    const userId = req.user.id;
    return this.usersService.updateMe(userId, updateUserProfileDto);
  }
}
