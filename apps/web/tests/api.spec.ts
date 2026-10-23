import { describe, expect, it } from 'vitest';
import { api } from '../src/services/api';
describe('cliente API', () => { it('usa la base URL configurada', () => expect(api.defaults.baseURL).toContain('/api')); });
