import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { Roles } from '@common/constants/roles.constants';
import {
  hasUnrestrictedAccess,
  resolveAccessibleCenters,
} from '@common/access/privileged-scope';
import { AgicApplicantRecord } from './agic-applicant';
import { AgicConfig } from './agic.config';

/**
 * A precondition for importing that ASFAAR itself does not meet - missing set
 * up rather than anything wrong with the applicant.
 */
export class AgicSetupError extends Error {}

export interface AgicTargets {
  agency: { id: string };
  center: { id: string; name: string };
  form: { id: string; name: string };
  warnings: string[];
}

/** "Family Visit", "FAMILY_VISIT" and "family-visit" all compare equal. */
const comparable = (value?: string | null) =>
  (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Works out where an AGIC applicant belongs on ASFAAR: the AGIC agency account
 * they become a client of, the center they attend, and the form their
 * application is filed under.
 */
@Injectable()
export class AgicTargetsService {
  private readonly logger = new Logger(AgicTargetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    record: AgicApplicantRecord,
    staffId: string,
    config: AgicConfig,
  ): Promise<AgicTargets> {
    const warnings: string[] = [];
    const [agency, center, form] = await Promise.all([
      this.agency(config),
      this.center(record, staffId, config),
      this.form(record, config, warnings),
    ]);
    return { agency, center, form, warnings };
  }

  private async agency(config: AgicConfig) {
    const agency = await this.prisma.user.findFirst({
      where: {
        email: { equals: config.agencyEmail, mode: 'insensitive' },
        roles: { has: Roles.AGENCY },
      },
      select: { id: true },
    });
    if (!agency) {
      throw new AgicSetupError(
        `The AGIC travel agency account (${config.agencyEmail}) does not exist on ASFAAR or is not an agency`,
      );
    }
    return agency;
  }

  /**
   * The applicant is standing at the gate of the center this member of staff
   * works at, which is where check-in and capture will happen - so that is the
   * center to book, whatever AGIC calls it. An explicit AGIC_CENTER_MAP entry
   * wins; matching AGIC's center name is the fallback for staff who are not
   * tied to one center, such as administrators.
   */
  private async center(
    record: AgicApplicantRecord,
    staffId: string,
    config: AgicConfig,
  ) {
    const agicCenterId = record.biometricCenter?.centerId;
    const mapped =
      agicCenterId !== undefined ? config.centerMap[String(agicCenterId)] : '';
    if (mapped) {
      const center = await this.prisma.biometricCenter.findFirst({
        where: { isActive: true, OR: [{ id: mapped }, { code: mapped }] },
        select: { id: true, name: true },
      });
      if (!center) {
        throw new AgicSetupError(
          `AGIC_CENTER_MAP sends AGIC center ${agicCenterId} to "${mapped}", which is not an active ASFAAR center`,
        );
      }
      return center;
    }

    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: { roles: true },
    });
    const staffCenters = await resolveAccessibleCenters<{
      id: string;
      name: string;
    }>(this.prisma, staffId);
    if (!hasUnrestrictedAccess(staff?.roles) && staffCenters.length === 1) {
      return staffCenters[0];
    }

    const names = [
      record.biometricCenter?.centerName,
      record.biometricCenter?.locationName,
    ].filter((n): n is string => !!n && !!n.trim());
    for (const name of names) {
      const center = await this.prisma.biometricCenter.findFirst({
        where: {
          isActive: true,
          OR: [
            { name: { equals: name.trim(), mode: 'insensitive' } },
            { code: { equals: name.trim(), mode: 'insensitive' } },
            { city: { equals: name.trim(), mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true },
      });
      if (center) return center;
    }

    throw new AgicSetupError(
      `No ASFAAR center matches AGIC center "${
        names.join(' / ') || agicCenterId
      }". Assign this account to a center or set AGIC_CENTER_MAP.`,
    );
  }

  /**
   * The ASFAAR form for the AGIC visa: an AGIC_FORM_MAP entry, else the
   * destination country's form for that visa type, else the country's only
   * form. With several candidates and none matching, the newest is used and a
   * warning returned - an applicant at the gate should not be turned away
   * over which form their record is filed under.
   */
  private async form(
    record: AgicApplicantRecord,
    config: AgicConfig,
    warnings: string[],
  ) {
    const { visaCountryId, visaTypeId, visaCountry, visaType } = record.visa;
    const mappedId =
      config.formMap[`${visaCountryId}:${visaTypeId}`] ||
      config.formMap[String(visaCountryId)];
    if (mappedId) {
      const form = await this.prisma.dynamicForm.findFirst({
        where: { id: mappedId, country: { isNot: null } },
        select: { id: true, name: true },
      });
      if (!form) {
        throw new AgicSetupError(
          `AGIC_FORM_MAP names form "${mappedId}", which does not exist or has no country`,
        );
      }
      return form;
    }

    const country = await this.country(visaCountry);

    const forms = await this.prisma.dynamicForm.findMany({
      where: { countryId: country.id },
      select: {
        id: true,
        name: true,
        applicationType: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!forms.length) {
      throw new AgicSetupError(`ASFAAR has no form for ${country.name}`);
    }

    const wanted = comparable(visaType);
    const match =
      wanted &&
      forms.find(
        (f) =>
          comparable(f.applicationType?.code) === wanted ||
          comparable(f.applicationType?.name) === wanted ||
          comparable(f.name).includes(wanted),
      );
    if (match) return { id: match.id, name: match.name };

    if (forms.length > 1) {
      const warning = `No ${country.name} form matches visa type "${visaType}"; filed under "${forms[0].name}"`;
      this.logger.warn(warning);
      warnings.push(warning);
    }
    return { id: forms[0].id, name: forms[0].name };
  }

  /**
   * AGIC says "Saudi Arabia" where ASFAAR says "Kingdom of Saudi Arabia", so
   * an exact name falls back to the one country whose name contains it.
   */
  private async country(visaCountry: string) {
    const name = visaCountry.trim();
    const select = { id: true, name: true };
    const exact = await this.prisma.country.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select,
    });
    if (exact) return exact;

    const containing = await this.prisma.country.findMany({
      where: { name: { contains: name, mode: 'insensitive' } },
      select,
      take: 2,
    });
    if (containing.length === 1) return containing[0];

    throw new AgicSetupError(
      containing.length
        ? `AGIC visa country "${visaCountry}" matches several ASFAAR countries; set AGIC_FORM_MAP`
        : `AGIC visa country "${visaCountry}" is not a country on ASFAAR`,
    );
  }
}
