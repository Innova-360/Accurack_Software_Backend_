import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateEmployeePermissionsDto } from './dto/update-employee-permissions.dto';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { UpdateEmployeeStoresDto } from './dto/update-employee-stores.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import {
  EmployeeEndpoint,
  BaseEmployeeController,
  ResponseService,
} from '../common';

@ApiTags('employees')
@ApiBearerAuth('JWT-auth')
@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeeController extends BaseEmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @Post()
  @EmployeeEndpoint.CreateEmployee(CreateEmployeeDto)
  create(@Body() createEmployeeDto: CreateEmployeeDto, @Request() req: any) {
    return this.handleEmployeeCreation(() =>
      this.employeeService.create(createEmployeeDto, req),
    );
  }

  @Get()
  @EmployeeEndpoint.GetAllEmployees()
  findAll() {
    return this.handleEmployeeRetrieval(
      () => this.employeeService.findAll(),
      'Employees retrieved successfully',
    );
  }

  @Get(':id')
  @EmployeeEndpoint.GetEmployeeById()
  findOne(@Param('id') id: string) {
    return this.handleEmployeeRetrieval(() => this.employeeService.findOne(id));
  }

  @Put(':id')
  @EmployeeEndpoint.UpdateEmployee(UpdateEmployeeDto)
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Request() req: any,
  ) {
    return this.handleEmployeeUpdate(() =>
      this.employeeService.update(id, updateEmployeeDto, req.user.id),
    );
  }

  @Delete(':id')
  @EmployeeEndpoint.DeleteEmployee()
  remove(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.employeeService.remove(id),
      'Employee deleted successfully',
    );
  }

  @Put(':id/deactivate')
  @EmployeeEndpoint.DeactivateEmployee()
  deactivate(@Param('id') id: string) {
    return this.handleEmployeeUpdate(
      () => this.employeeService.deactivate(id),
      'Employee deactivated successfully',
    );
  }

  @Put(':id/permissions')
  @EmployeeEndpoint.UpdateEmployeePermissions(UpdateEmployeePermissionsDto)
  updatePermissions(
    @Param('id') id: string,
    @Body() permissions: UpdateEmployeePermissionsDto,
  ) {
    return this.handlePermissionUpdate(() =>
      this.employeeService.updatePermissions(id, permissions),
    );
  }

  @Post('invite')
  @EmployeeEndpoint.InviteEmployee(InviteEmployeeDto)
  inviteEmployee(@Body() inviteDto: InviteEmployeeDto, @Request() req: any) {
    return this.handleEmployeeInvitation(() =>
      this.employeeService.invite(inviteDto, req.user.id),
    );
  }

  @Post(':id/reset-password')
  @EmployeeEndpoint.ResetEmployeePassword()
  resetPassword(@Param('id') id: string) {
    return this.handleEmployeeUpdate(
      () => this.employeeService.resetPassword(id),
      'Employee password reset successfully',
    );
  }

  @Put(':id/stores')
  @EmployeeEndpoint.UpdateEmployeeStores(UpdateEmployeeStoresDto)
  updateStores(
    @Param('id') id: string,
    @Body() updateStoresDto: UpdateEmployeeStoresDto,
  ) {
    return this.handleEmployeeUpdate(
      () =>
        this.employeeService.updateStoreAssignments(
          id,
          updateStoresDto.storeIds,
        ),
      'Employee store assignments updated successfully',
    );
  }
}
