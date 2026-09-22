import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FormsService } from '@modules/forms/services/forms.service';

/**
 * Deleting a form template returned an internal server error for any template
 * that had sections - which is every real one. The template hierarchy
 * (sections, groups, fields, options) was created with ON DELETE RESTRICT, so
 * the delete was refused by the database.
 *
 * The children now cascade, which is what the migration changes. These tests
 * cover the decisions the service still owns: what is refused, and with which
 * error. The cascade itself is a database guarantee, verified against a real
 * Postgres rather than mocked here.
 */
const buildService = (overrides: Record<string, any> = {}) => {
  const prisma: any = {
    dynamicForm: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'form-1', submissions: [] }),
      delete: jest.fn().mockResolvedValue({ id: 'form-1' }),
    },
    formSection: {
      findUnique: jest.fn().mockResolvedValue({ id: 'sec-1' }),
      delete: jest.fn().mockResolvedValue({ id: 'sec-1' }),
    },
    inputGroup: {
      findUnique: jest.fn().mockResolvedValue({ id: 'grp-1' }),
      delete: jest.fn().mockResolvedValue({ id: 'grp-1' }),
    },
    formField: {
      findUnique: jest.fn().mockResolvedValue({ id: 'fld-1' }),
      delete: jest.fn().mockResolvedValue({ id: 'fld-1' }),
    },
    ...overrides,
  };

  return { service: new FormsService(prisma), prisma };
};

describe('FormsService.deleteForm', () => {
  it('deletes a template that has never been used', async () => {
    const { service, prisma } = buildService();

    await expect(service.deleteForm('form-1')).resolves.toBeUndefined();
    expect(prisma.dynamicForm.delete).toHaveBeenCalledWith({
      where: { id: 'form-1' },
    });
  });

  it('refuses a template that has submissions, with a 400 rather than a 500', async () => {
    const { service, prisma } = buildService({
      dynamicForm: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'form-1', submissions: [{ id: 'sub-1' }] }),
        delete: jest.fn(),
      },
    });

    await expect(service.deleteForm('form-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.dynamicForm.delete).not.toHaveBeenCalled();
  });

  it('reports an unknown template as not found', async () => {
    const { service } = buildService({
      dynamicForm: {
        findUnique: jest.fn().mockResolvedValue(null),
        delete: jest.fn(),
      },
    });

    await expect(service.deleteForm('nope')).rejects.toThrow(NotFoundException);
  });
});

/**
 * The same RESTRICT chain broke these three endpoints too, for anything with
 * children. They are fixed by the same migration.
 */
describe.each([
  ['deleteSection', 'formSection', 'sec-1'],
  ['deleteGroup', 'inputGroup', 'grp-1'],
  ['deleteField', 'formField', 'fld-1'],
] as const)('FormsService.%s', (method, delegate, id) => {
  it('deletes the node and lets its children cascade', async () => {
    const { service, prisma } = buildService();

    await expect((service as any)[method](id)).resolves.toBeUndefined();
    expect(prisma[delegate].delete).toHaveBeenCalledWith({ where: { id } });
  });

  it('reports an unknown node as not found', async () => {
    const { service } = buildService({
      [delegate]: {
        findUnique: jest.fn().mockResolvedValue(null),
        delete: jest.fn(),
      },
    });

    await expect((service as any)[method]('nope')).rejects.toThrow(
      NotFoundException,
    );
  });
});
