import type { ColumnDef, FilterDef, FormSectionDef } from '@/components/types';
import { optionsFrom } from '@/lib/status';

export type CommunityEntity = 'students' | 'guardians' | 'staff' | 'courses';

const COURSES = ['1° Básico A', '3° Básico B', '5° Básico A', '6° Básico B', '7° Básico A', '8° Básico B', 'I Medio A', 'II Medio B', 'III Medio A', 'IV Medio A'];
const courseOptions = COURSES.map((v) => ({ value: v, label: v }));

interface EntityConfig {
  title: string; singular: string; description: string; searchPlaceholder: string; searchFields: string[]; subject: string; icon: string;
  columns: ColumnDef[]; filters: FilterDef[]; form: FormSectionDef[]; titleField: string; createLabel: string; privacy?: string;
}

/** Configuración de los cuatro módulos de comunidad educativa. Los formularios contemplan RUT solo cuando corresponde. */
export const COMMUNITY: Record<CommunityEntity, EntityConfig> = {
  students: {
    title: 'Estudiantes', singular: 'estudiante', subject: 'los estudiantes', icon: 'student', titleField: 'name', createLabel: 'Registrar estudiante',
    description: 'Estudiantes matriculados. La ficha muestra solo los datos necesarios para la gestión de convivencia.',
    searchPlaceholder: 'Buscar por nombre o curso', searchFields: ['name', 'course', 'enrollment'],
    privacy: 'Datos de menores de edad: acceso restringido y registrado en auditoría. No exporte ni comparta esta información fuera del sistema.',
    columns: [
      { field: 'name', header: 'Nombre', kind: 'strong' }, { field: 'course', header: 'Curso' }, { field: 'enrollment', header: 'N° de matrícula', minScreen: 'lg' },
      { field: 'activeCases', header: 'Casos activos', kind: 'number', minScreen: 'md' }, { field: 'status', header: 'Estado', kind: 'status', minScreen: 'sm' }
    ],
    filters: [{ field: 'course', label: 'Curso', options: courseOptions }, { field: 'status', label: 'Estado', options: optionsFrom(['matriculado', 'retirado']) }],
    form: [
      { title: 'Identificación', fields: [
        { name: 'firstName', label: 'Nombres', type: 'text', required: true }, { name: 'lastName', label: 'Apellidos', type: 'text', required: true },
        { name: 'rut', label: 'RUT', type: 'rut', required: true, help: 'Se valida el dígito verificador.' }, { name: 'birthDate', label: 'Fecha de nacimiento', type: 'date', required: true }
      ] },
      { title: 'Matrícula', fields: [
        { name: 'course', label: 'Curso', type: 'select', required: true, options: courseOptions }, { name: 'enrollment', label: 'N° de matrícula', type: 'text', required: true }
      ] }
    ]
  },
  guardians: {
    title: 'Apoderados', singular: 'apoderado/a', subject: 'los apoderados', icon: 'users', titleField: 'name', createLabel: 'Registrar apoderado/a',
    description: 'Apoderados titulares y suplentes vinculados a estudiantes del establecimiento.',
    searchPlaceholder: 'Buscar por nombre o relación', searchFields: ['name', 'relation'],
    columns: [
      { field: 'name', header: 'Nombre', kind: 'strong' }, { field: 'relation', header: 'Relación' }, { field: 'students', header: 'Estudiantes a cargo', kind: 'number', minScreen: 'md' },
      { field: 'contact', header: 'Contacto', minScreen: 'lg' }, { field: 'status', header: 'Estado', kind: 'status', minScreen: 'sm' }
    ],
    filters: [{ field: 'relation', label: 'Relación', options: ['Madre', 'Padre', 'Abuela', 'Tutor legal', 'Tío'].map((v) => ({ value: v, label: v })) }],
    form: [
      { title: 'Identificación', fields: [
        { name: 'firstName', label: 'Nombres', type: 'text', required: true }, { name: 'lastName', label: 'Apellidos', type: 'text', required: true },
        { name: 'rut', label: 'RUT', type: 'rut', required: true }, { name: 'relation', label: 'Relación con el estudiante', type: 'select', required: true, options: ['Madre', 'Padre', 'Abuelo/a', 'Tutor/a legal', 'Otro familiar'].map((v) => ({ value: v, label: v })) }
      ] },
      { title: 'Contacto', fields: [
        { name: 'email', label: 'Correo electrónico', type: 'email' }, { name: 'phone', label: 'Teléfono', type: 'text', placeholder: '+56 9 1234 5678' },
        { name: 'guardianType', label: 'Tipo de apoderado', type: 'select', required: true, options: [{ value: 'titular', label: 'Titular' }, { value: 'suplente', label: 'Suplente' }] }
      ] }
    ]
  },
  staff: {
    title: 'Funcionarios', singular: 'funcionario/a', subject: 'los funcionarios', icon: 'briefcase', titleField: 'name', createLabel: 'Registrar funcionario/a',
    description: 'Docentes y asistentes de la educación. La cuenta de acceso al sistema se gestiona en Administración, Usuarios.',
    searchPlaceholder: 'Buscar por nombre, cargo o área', searchFields: ['name', 'position', 'area'],
    columns: [
      { field: 'name', header: 'Nombre', kind: 'strong' }, { field: 'position', header: 'Cargo' }, { field: 'area', header: 'Área', minScreen: 'md' },
      { field: 'email', header: 'Correo institucional', minScreen: 'lg' }, { field: 'status', header: 'Estado', kind: 'status', minScreen: 'sm' }
    ],
    filters: [
      { field: 'area', label: 'Área', options: ['Enseñanza básica', 'Enseñanza media', 'Convivencia escolar', 'Inspectoría'].map((v) => ({ value: v, label: v })) },
      { field: 'status', label: 'Estado', options: optionsFrom(['activo', 'inactivo']) }
    ],
    form: [
      { title: 'Identificación', fields: [
        { name: 'firstName', label: 'Nombres', type: 'text', required: true }, { name: 'lastName', label: 'Apellidos', type: 'text', required: true },
        { name: 'rut', label: 'RUT', type: 'rut', required: true }, { name: 'email', label: 'Correo institucional', type: 'email', required: true }
      ] },
      { title: 'Cargo', fields: [
        { name: 'position', label: 'Cargo', type: 'text', required: true }, { name: 'area', label: 'Área', type: 'select', required: true, options: ['Enseñanza básica', 'Enseñanza media', 'Convivencia escolar', 'Inspectoría', 'Dirección'].map((v) => ({ value: v, label: v })) }
      ] }
    ]
  },
  courses: {
    title: 'Cursos', singular: 'curso', subject: 'los cursos', icon: 'book', titleField: 'name', createLabel: 'Registrar curso',
    description: 'Cursos del año escolar vigente con su profesor/a jefe.',
    searchPlaceholder: 'Buscar curso o profesor/a jefe', searchFields: ['name', 'headTeacher', 'level'],
    columns: [
      { field: 'name', header: 'Curso', kind: 'strong' }, { field: 'level', header: 'Nivel', minScreen: 'sm' }, { field: 'headTeacher', header: 'Profesor/a jefe', minScreen: 'md' },
      { field: 'students', header: 'Estudiantes', kind: 'number' }, { field: 'year', header: 'Año', kind: 'number', minScreen: 'lg' }
    ],
    filters: [{ field: 'level', label: 'Nivel', options: ['Enseñanza básica', 'Enseñanza media'].map((v) => ({ value: v, label: v })) }],
    form: [
      { title: 'Curso', fields: [
        { name: 'grade', label: 'Nivel y grado', type: 'select', required: true, options: ['1° Básico', '2° Básico', '3° Básico', '4° Básico', '5° Básico', '6° Básico', '7° Básico', '8° Básico', 'I Medio', 'II Medio', 'III Medio', 'IV Medio'].map((v) => ({ value: v, label: v })) },
        { name: 'letter', label: 'Letra', type: 'text', required: true, placeholder: 'A' }, { name: 'year', label: 'Año escolar', type: 'number', required: true },
        { name: 'headTeacher', label: 'Profesor/a jefe', type: 'text', required: true }
      ] }
    ]
  }
};
