import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { pageArgs, PageQueryDto } from '../../common/pagination';
import { AdminRequest, CsrfGuard, PermissionsGuard, SessionGuard } from '../../common/security/admin-guards';
import { RequirePermissions } from '../../common/security/require-permissions';
import { CommunityService } from './community.service';

const context = (req: AdminRequest) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
const flag = (value?: string) => (value === undefined ? undefined : value === 'true');
const version = () => ApiProperty({ description: 'Versión leída; si cambió, la API responde 409' });

class CourseListDto {
  @ApiProperty() @IsUUID() establishmentId!: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2100) academicYear?: number;
  @ApiPropertyOptional({ enum: ['true', 'false'] }) @IsOptional() @IsIn(['true', 'false']) active?: string;
}
class CreateCourseDto {
  @ApiProperty() @IsUUID() establishmentId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(60) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) level?: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(2000) @Max(2100) academicYear!: number;
}
class UpdateCourseDto {
  @version() @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(60) name?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(60) level?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
class PeopleListDto extends PageQueryDto {
  @ApiProperty() @IsUUID() establishmentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) search?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] }) @IsOptional() @IsIn(['true', 'false']) active?: string;
}
class StudentListDto extends PeopleListDto { @ApiPropertyOptional() @IsOptional() @IsUUID() courseId?: string; }
class GuardianListDto extends PeopleListDto { @ApiPropertyOptional() @IsOptional() @IsUUID() studentId?: string; }
class CreateStudentDto {
  @ApiProperty() @IsUUID() establishmentId!: string;
  @ApiProperty({ example: '12.345.678-5' }) @IsString() @MaxLength(15) rut!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) firstNames!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) lastNames!: string;
  @ApiPropertyOptional({ example: '2015-03-21' }) @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() courseId?: string;
}
class UpdateStudentDto {
  @version() @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(15) rut?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(120) firstNames?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(120) lastNames?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsDateString() birthDate?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsUUID() courseId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
class LinkGuardianDto {
  @ApiProperty() @IsUUID() guardianId!: string;
  @ApiProperty({ example: 'MADRE' }) @IsString() @MinLength(2) @MaxLength(40) relationship!: string;
  @ApiProperty() @IsBoolean() isPrimary!: boolean;
}
class ImportRowDto {
  @ApiProperty() @IsString() @MaxLength(15) rut!: string;
  @ApiProperty() @IsString() @MaxLength(120) firstNames!: string;
  @ApiProperty() @IsString() @MaxLength(120) lastNames!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) courseName?: string;
}
class ImportStudentsDto {
  @ApiProperty() @IsUUID() establishmentId!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(2000) @Max(2100) academicYear!: number;
  @ApiProperty({ type: [ImportRowDto], description: 'Hasta 500 filas por carga' }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => ImportRowDto) rows!: ImportRowDto[];
}
class CreateGuardianDto {
  @ApiProperty() @IsUUID() establishmentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(15) rut?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) firstNames!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) lastNames!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(180) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
}
class UpdateGuardianDto {
  @version() @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(15) rut?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(120) firstNames?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(120) lastNames?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsEmail() @MaxLength(180) email?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(30) phone?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
class CreateStaffDto extends CreateGuardianDto {
  @ApiProperty({ example: 'Inspector general' }) @IsString() @MinLength(2) @MaxLength(120) position!: string;
  @ApiPropertyOptional({ description: 'Cuenta de acceso de la persona, si tiene una' }) @IsOptional() @IsUUID() userId?: string;
}
class UpdateStaffDto extends UpdateGuardianDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(120) position?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsUUID() userId?: string | null;
}

@ApiTags('comunidad educativa') @ApiCookieAuth() @Controller() @UseGuards(SessionGuard, CsrfGuard, PermissionsGuard)
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('courses') @RequirePermissions('courses.read') @ApiOperation({ summary: 'Lista los cursos del establecimiento' })
  courses(@Req() req: AdminRequest, @Query() q: CourseListDto) { return this.community.listCourses(req.actorId!, { establishmentId: q.establishmentId, academicYear: q.academicYear, active: flag(q.active) }); }
  @Post('courses') @RequirePermissions('courses.manage') @ApiOperation({ summary: 'Crea un curso' })
  createCourse(@Req() req: AdminRequest, @Body() dto: CreateCourseDto) { return this.community.createCourse(req.actorId!, dto, context(req)); }
  @Patch('courses/:id') @RequirePermissions('courses.manage') @ApiOperation({ summary: 'Edita un curso (con control de versión)' })
  updateCourse(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCourseDto) { return this.community.updateCourse(req.actorId!, id, dto, context(req)); }

  @Get('students') @RequirePermissions('students.read') @ApiOperation({ summary: 'Lista estudiantes con búsqueda por nombre o RUT' })
  students(@Req() req: AdminRequest, @Query() q: StudentListDto) { return this.community.listStudents(req.actorId!, { establishmentId: q.establishmentId, search: q.search, courseId: q.courseId, active: flag(q.active) }, pageArgs(q)); }
  @Post('students/import') @RequirePermissions('students.manage') @ApiOperation({ summary: 'Carga masiva de estudiantes (todo o nada, máximo 500 filas)' })
  importStudents(@Req() req: AdminRequest, @Body() dto: ImportStudentsDto) { return this.community.importStudents(req.actorId!, dto, context(req)); }
  @Post('students') @RequirePermissions('students.manage') @ApiOperation({ summary: 'Registra un estudiante' })
  createStudent(@Req() req: AdminRequest, @Body() dto: CreateStudentDto) { return this.community.createStudent(req.actorId!, dto, context(req)); }
  @Get('students/:id') @RequirePermissions('students.read') @ApiOperation({ summary: 'Ficha del estudiante con sus apoderados' })
  student(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) { return this.community.getStudent(req.actorId!, id); }
  @Patch('students/:id') @RequirePermissions('students.manage') @ApiOperation({ summary: 'Edita un estudiante (con control de versión)' })
  updateStudent(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudentDto) { return this.community.updateStudent(req.actorId!, id, dto, context(req)); }
  @Get('students/:id/cases') @RequirePermissions('students.read', 'cases.read') @ApiOperation({ summary: 'Expedientes visibles donde el estudiante es involucrado' })
  studentCases(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) { return this.community.studentCases(req.actorId!, id); }
  @Post('students/:id/guardians') @RequirePermissions('students.manage', 'guardians.manage') @ApiOperation({ summary: 'Asocia (o actualiza) un apoderado del estudiante' })
  linkGuardian(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: LinkGuardianDto) { return this.community.linkGuardian(req.actorId!, id, dto, context(req)); }
  @Post('students/:id/guardians/:guardianId/unlink') @RequirePermissions('students.manage', 'guardians.manage') @ApiOperation({ summary: 'Quita la relación entre estudiante y apoderado' })
  unlinkGuardian(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Param('guardianId', ParseUUIDPipe) guardianId: string) { return this.community.unlinkGuardian(req.actorId!, id, guardianId, context(req)); }

  @Get('guardians') @RequirePermissions('guardians.read') @ApiOperation({ summary: 'Lista apoderados' })
  guardians(@Req() req: AdminRequest, @Query() q: GuardianListDto) { return this.community.listGuardians(req.actorId!, { establishmentId: q.establishmentId, search: q.search, studentId: q.studentId, active: flag(q.active) }, pageArgs(q)); }
  @Post('guardians') @RequirePermissions('guardians.manage') @ApiOperation({ summary: 'Registra un apoderado' })
  createGuardian(@Req() req: AdminRequest, @Body() dto: CreateGuardianDto) { return this.community.createGuardian(req.actorId!, dto, context(req)); }
  @Get('guardians/:id') @RequirePermissions('guardians.read') @ApiOperation({ summary: 'Ficha del apoderado con sus estudiantes' })
  guardian(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string) { return this.community.getGuardian(req.actorId!, id); }
  @Patch('guardians/:id') @RequirePermissions('guardians.manage') @ApiOperation({ summary: 'Edita un apoderado (con control de versión)' })
  updateGuardian(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGuardianDto) { return this.community.updateGuardian(req.actorId!, id, dto, context(req)); }

  @Get('staff') @RequirePermissions('staff.read') @ApiOperation({ summary: 'Lista funcionarios' })
  staff(@Req() req: AdminRequest, @Query() q: PeopleListDto) { return this.community.listStaff(req.actorId!, { establishmentId: q.establishmentId, search: q.search, active: flag(q.active) }, pageArgs(q)); }
  @Post('staff') @RequirePermissions('staff.manage') @ApiOperation({ summary: 'Registra un funcionario' })
  createStaff(@Req() req: AdminRequest, @Body() dto: CreateStaffDto) { return this.community.createStaff(req.actorId!, dto, context(req)); }
  @Patch('staff/:id') @RequirePermissions('staff.manage') @ApiOperation({ summary: 'Edita un funcionario (con control de versión)' })
  updateStaff(@Req() req: AdminRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStaffDto) { return this.community.updateStaff(req.actorId!, id, dto, context(req)); }
}
