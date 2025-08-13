import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  DynamicForm,
  FormSection,
  InputGroup,
  FormField,
  FieldOption,
  Prisma,
} from '@prisma/client';
import {
  CreateFormDto,
  UpdateFormDto,
  FormDto,
  FormSummaryDto,
  CreateFormSectionDto,
  UpdateFormSectionDto,
  CreateInputGroupDto,
  UpdateInputGroupDto,
  CreateFormFieldDto,
  UpdateFormFieldDto,
  CreateFieldOptionDto,
  FormQueryDto,
} from '../dto/form.dto';
import {
  FORM_NOT_FOUND,
  FORM_SECTION_NOT_FOUND,
  FORM_GROUP_NOT_FOUND,
  FORM_FIELD_NOT_FOUND,
  FORM_HAS_SUBMISSIONS,
  DUPLICATE_FIELD_NAME,
} from '@common/constants/errors.constants';

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  // Form CRUD Operations
  async createForm(createFormDto: CreateFormDto): Promise<FormDto> {
    const { sections, countryId, ...formData } = createFormDto;

    // Validate country exists if countryId is provided
    if (countryId) {
      const country = await this.prisma.country.findUnique({
        where: { id: countryId },
      });

      if (!country) {
        throw new NotFoundException(`Country with ID ${countryId} not found`);
      }

      if (!country.isActive) {
        throw new BadRequestException(
          'Cannot create forms for inactive countries',
        );
      }
    }

    const form = await this.prisma.dynamicForm.create({
      data: {
        ...formData,
        countryId,
        sections: sections
          ? {
              create: sections.map((section) => ({
                ...section,
                config: section.config,
                groups: section.groups
                  ? {
                      create: section.groups.map((group) => ({
                        ...group,
                        config: group.config,
                        fields: group.fields
                          ? {
                              create: group.fields.map((field) => ({
                                ...field,
                                options: field.options
                                  ? {
                                      create: field.options,
                                    }
                                  : undefined,
                              })),
                            }
                          : undefined,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: this.getFormInclude(),
    });

    return this.mapToFormDto(form);
  }

  async getForms(queryDto: FormQueryDto): Promise<{
    forms: FormSummaryDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { search, page, limit, sortBy, sortOrder, countryId, countryCode } =
      queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.DynamicFormWhereInput = {};

    // Search filtering
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Country filtering
    if (countryId) {
      where.countryId = countryId;
    } else if (countryCode) {
      where.country = {
        isoCode2: countryCode.toUpperCase(),
      };
    }

    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const [forms, total] = await Promise.all([
      this.prisma.dynamicForm.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          country: {
            select: {
              id: true,
              name: true,
              isoCode2: true,
              flag: true,
            },
          },
          sections: {
            include: {
              groups: {
                include: {
                  fields: true,
                },
              },
            },
          },
          submissions: {
            select: { id: true },
          },
        },
      }),
      this.prisma.dynamicForm.count({ where }),
    ]);

    const formSummaries = forms.map((form) => this.mapToFormSummaryDto(form));

    return {
      forms: formSummaries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFormById(id: string): Promise<FormDto> {
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id },
      include: this.getFormInclude(),
    });

    if (!form) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    return this.mapToFormDto(form);
  }

  async updateForm(id: string, updateFormDto: UpdateFormDto): Promise<FormDto> {
    const existingForm = await this.prisma.dynamicForm.findUnique({
      where: { id },
    });

    if (!existingForm) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    const { sections, ...formData } = updateFormDto;

    const updatedForm = await this.prisma.dynamicForm.update({
      where: { id },
      data: formData,
      include: this.getFormInclude(),
    });

    return this.mapToFormDto(updatedForm);
  }

  async deleteForm(id: string): Promise<void> {
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id },
      include: { submissions: { select: { id: true } } },
    });

    if (!form) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    if (form.submissions.length > 0) {
      throw new BadRequestException(FORM_HAS_SUBMISSIONS);
    }

    await this.prisma.dynamicForm.delete({
      where: { id },
    });
  }

  async duplicateForm(id: string, name?: string): Promise<FormDto> {
    const originalForm = await this.prisma.dynamicForm.findUnique({
      where: { id },
      include: this.getFormInclude(),
    });

    if (!originalForm) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    const duplicatedForm = await this.prisma.dynamicForm.create({
      data: {
        name: name || `${originalForm.name} (Copy)`,
        description: originalForm.description,
        sections: {
          create: originalForm.sections.map((section) => ({
            title: section.title,
            description: section.description,
            order: section.order,
            config: section.config,
            groups: {
              create: section.groups.map((group) => ({
                title: group.title,
                description: group.description,
                order: group.order,
                repeatable: group.repeatable,
                config: group.config,
                fields: {
                  create: group.fields.map((field) => ({
                    label: field.label,
                    name: field.name,
                    type: field.type,
                    required: field.required,
                    placeholder: field.placeholder,
                    defaultValue: field.defaultValue,
                    validation: field.validation,
                    config: field.config,
                    visibilityCondition: field.visibilityCondition,
                    calculation: field.calculation,
                    metadata: field.metadata,
                    order: field.order,
                    options: {
                      create: field.options.map((option) => ({
                        label: option.label,
                        value: option.value,
                        order: option.order,
                      })),
                    },
                  })),
                },
              })),
            },
          })),
        },
      },
      include: this.getFormInclude(),
    });

    return this.mapToFormDto(duplicatedForm);
  }

  // Section Management
  async addSectionToForm(formId: string, sectionDto: CreateFormSectionDto) {
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    const section = await this.prisma.formSection.create({
      data: {
        ...sectionDto,
        formId,
        groups: sectionDto.groups
          ? {
              create: sectionDto.groups.map((group) => ({
                ...group,
                fields: group.fields
                  ? {
                      create: group.fields.map((field) => ({
                        ...field,
                        options: field.options
                          ? {
                              create: field.options,
                            }
                          : undefined,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        groups: {
          include: {
            fields: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    return section;
  }

  async updateSection(id: string, updateSectionDto: UpdateFormSectionDto) {
    const section = await this.prisma.formSection.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException(FORM_SECTION_NOT_FOUND);
    }

    // Exclude nested fields for update operation
    const { groups, ...sectionData } = updateSectionDto;

    const updatedSection = await this.prisma.formSection.update({
      where: { id },
      data: sectionData,
      include: {
        groups: {
          include: {
            fields: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    return updatedSection;
  }

  async deleteSection(id: string): Promise<void> {
    const section = await this.prisma.formSection.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException(FORM_SECTION_NOT_FOUND);
    }

    await this.prisma.formSection.delete({
      where: { id },
    });
  }

  // Group Management
  async addGroupToSection(sectionId: string, groupDto: CreateInputGroupDto) {
    const section = await this.prisma.formSection.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException(FORM_SECTION_NOT_FOUND);
    }

    const group = await this.prisma.inputGroup.create({
      data: {
        ...groupDto,
        sectionId,
        fields: groupDto.fields
          ? {
              create: groupDto.fields.map((field) => ({
                ...field,
                options: field.options
                  ? {
                      create: field.options,
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        fields: {
          include: {
            options: true,
          },
        },
      },
    });

    return group;
  }

  async updateGroup(id: string, updateGroupDto: UpdateInputGroupDto) {
    const group = await this.prisma.inputGroup.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException(FORM_GROUP_NOT_FOUND);
    }

    // Exclude nested fields for update operation
    const { fields, ...groupData } = updateGroupDto;

    const updatedGroup = await this.prisma.inputGroup.update({
      where: { id },
      data: groupData,
      include: {
        fields: {
          include: {
            options: true,
          },
        },
      },
    });

    return updatedGroup;
  }

  async deleteGroup(id: string): Promise<void> {
    const group = await this.prisma.inputGroup.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException(FORM_GROUP_NOT_FOUND);
    }

    await this.prisma.inputGroup.delete({
      where: { id },
    });
  }

  // Field Management
  async addFieldToGroup(groupId: string, fieldDto: CreateFormFieldDto) {
    const group = await this.prisma.inputGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(FORM_GROUP_NOT_FOUND);
    }

    // Check for duplicate field names within the form
    const existingField = await this.prisma.formField.findFirst({
      where: {
        name: fieldDto.name,
        group: {
          section: {
            form: {
              sections: {
                some: {
                  groups: {
                    some: {
                      id: groupId,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (existingField) {
      throw new ConflictException(DUPLICATE_FIELD_NAME);
    }

    const field = await this.prisma.formField.create({
      data: {
        ...fieldDto,
        groupId,
        options: fieldDto.options
          ? {
              create: fieldDto.options,
            }
          : undefined,
      },
      include: {
        options: true,
      },
    });

    return field;
  }

  async updateField(id: string, updateFieldDto: UpdateFormFieldDto) {
    const field = await this.prisma.formField.findUnique({
      where: { id },
    });

    if (!field) {
      throw new NotFoundException(FORM_FIELD_NOT_FOUND);
    }

    // Exclude nested fields for update operation
    const { options, ...fieldData } = updateFieldDto;

    const updatedField = await this.prisma.formField.update({
      where: { id },
      data: fieldData,
      include: {
        options: true,
      },
    });

    return updatedField;
  }

  async deleteField(id: string): Promise<void> {
    const field = await this.prisma.formField.findUnique({
      where: { id },
    });

    if (!field) {
      throw new NotFoundException(FORM_FIELD_NOT_FOUND);
    }

    await this.prisma.formField.delete({
      where: { id },
    });
  }

  // Form Analytics
  async getFormAnalytics(id: string) {
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            groups: {
              include: {
                fields: true,
              },
            },
          },
        },
        submissions: {
          include: {
            responses: true,
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    const totalFields = form.sections.reduce(
      (total, section) =>
        total +
        section.groups.reduce(
          (groupTotal, group) => groupTotal + group.fields.length,
          0,
        ),
      0,
    );

    const submissionStats = {
      total: form.submissions.length,
      completed: form.submissions.filter((s) => s.status === 'SUBMITTED')
        .length,
      drafts: form.submissions.filter((s) => s.status === 'DRAFT').length,
      reviewed: form.submissions.filter((s) => s.status === 'REVIEWED').length,
      rejected: form.submissions.filter((s) => s.status === 'REJECTED').length,
    };

    return {
      form: {
        id: form.id,
        name: form.name,
        sectionsCount: form.sections.length,
        fieldsCount: totalFields,
      },
      submissions: submissionStats,
      completionRate:
        submissionStats.total > 0
          ? (submissionStats.completed / submissionStats.total) * 100
          : 0,
    };
  }

  // Service Fee Management Methods
  async getFormServiceFees(formId: string) {
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id: formId },
      include: {
        serviceFees: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!form) {
      throw new NotFoundException(`Form with ID ${formId} not found`);
    }

    return form.serviceFees;
  }

  async associateServiceFees(formId: string, serviceFeeIds: string[]) {
    // Verify form exists
    const form = await this.getFormById(formId);

    // Verify all service fees exist and are active
    const serviceFees = await this.prisma.serviceFee.findMany({
      where: {
        id: { in: serviceFeeIds },
        isActive: true,
      },
    });

    if (serviceFees.length !== serviceFeeIds.length) {
      const foundIds = serviceFees.map((fee) => fee.id);
      const missingIds = serviceFeeIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Service fees not found or inactive: ${missingIds.join(', ')}`,
      );
    }

    // Associate service fees with form
    await this.prisma.dynamicForm.update({
      where: { id: formId },
      data: {
        serviceFees: {
          connect: serviceFeeIds.map((id) => ({ id })),
        },
      },
    });

    return this.getFormServiceFees(formId);
  }

  async updateFormServiceFees(formId: string, serviceFeeIds: string[]) {
    // Verify form exists
    const form = await this.getFormById(formId);

    // Verify all service fees exist and are active
    const serviceFees = await this.prisma.serviceFee.findMany({
      where: {
        id: { in: serviceFeeIds },
        isActive: true,
      },
    });

    if (serviceFees.length !== serviceFeeIds.length) {
      const foundIds = serviceFees.map((fee) => fee.id);
      const missingIds = serviceFeeIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Service fees not found or inactive: ${missingIds.join(', ')}`,
      );
    }

    // Replace all service fees with new ones
    await this.prisma.dynamicForm.update({
      where: { id: formId },
      data: {
        serviceFees: {
          set: serviceFeeIds.map((id) => ({ id })),
        },
      },
    });

    return this.getFormServiceFees(formId);
  }

  async removeServiceFeeFromForm(formId: string, serviceFeeId: string) {
    // Verify form exists
    await this.getFormById(formId);

    // Remove service fee from form
    await this.prisma.dynamicForm.update({
      where: { id: formId },
      data: {
        serviceFees: {
          disconnect: { id: serviceFeeId },
        },
      },
    });

    return this.getFormServiceFees(formId);
  }

  async removeAllServiceFeesFromForm(formId: string) {
    // Verify form exists
    await this.getFormById(formId);

    // Remove all service fees from form
    await this.prisma.dynamicForm.update({
      where: { id: formId },
      data: {
        serviceFees: {
          set: [],
        },
      },
    });

    return { message: 'All service fees removed from form successfully' };
  }

  // Helper Methods
  private getFormInclude() {
    return {
      sections: {
        orderBy: { order: 'asc' as const },
        include: {
          groups: {
            orderBy: { order: 'asc' as const },
            include: {
              fields: {
                orderBy: { order: 'asc' as const },
                include: {
                  options: {
                    orderBy: { order: 'asc' as const },
                  },
                },
              },
            },
          },
        },
      },
      submissions: {
        select: { id: true },
      },
      serviceFees: {
        where: { isActive: true },
        orderBy: { name: 'asc' as const },
      },
    };
  }

  private buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc') {
    const validSortFields = ['name', 'createdAt', 'submissionCount'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    if (field === 'submissionCount') {
      return {
        submissions: {
          _count: sortOrder,
        },
      };
    }

    return { [field]: sortOrder };
  }

  private mapToFormDto(form: any): FormDto {
    return {
      id: form.id,
      name: form.name,
      description: form.description,
      createdAt: form.createdAt,
      sections: form.sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order: section.order,
        config: section.config,
        groups: section.groups.map((group: any) => ({
          id: group.id,
          title: group.title,
          description: group.description,
          order: group.order,
          repeatable: group.repeatable,
          config: group.config,
          fields: group.fields.map((field: any) => ({
            id: field.id,
            label: field.label,
            name: field.name,
            type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            defaultValue: field.defaultValue,
            validation: field.validation,
            config: field.config,
            visibilityCondition: field.visibilityCondition,
            calculation: field.calculation,
            metadata: field.metadata,
            source: field.source,
            fileTypes: field.fileTypes,
            order: field.order,
            options: field.options.map((option: any) => ({
              id: option.id,
              label: option.label,
              value: option.value,
              order: option.order,
            })),
          })),
        })),
      })),
      submissionCount: form.submissions?.length || 0,
      serviceFees: form.serviceFees?.map((fee: any) => ({
        id: fee.id,
        name: fee.name,
        description: fee.description,
        amount: fee.amount,
        currency: fee.currency,
        isOptional: fee.isOptional,
        isActive: fee.isActive,
      })) || [],
    };
  }

  private mapToFormSummaryDto(form: any): FormSummaryDto {
    const sectionCount = form.sections.length;
    const fieldCount = form.sections.reduce(
      (total: number, section: any) =>
        total +
        section.groups.reduce(
          (groupTotal: number, group: any) => groupTotal + group.fields.length,
          0,
        ),
      0,
    );

    return {
      id: form.id,
      name: form.name,
      description: form.description,
      createdAt: form.createdAt,
      sectionCount,
      fieldCount,
      submissionCount: form.submissions?.length || 0,
      status: 'draft', // TODO: Add status field to schema
    };
  }
}
