import { prisma } from "@/lib/prisma";
import type { EnrollmentStatus } from "@/lib/generated/prisma";
import { requireActiveAcademicYear, assertYearOpen } from "./academic-year.service";
import { emit } from "@/lib/events";

/* ── Types ──────────────────────────────────────────────── */

export interface EnrollStudentInput {
  organizationId: string;
  studentId: number;
  campusId: number;
  classId: string;
  sectionId?: string;
  rollNumber?: string;
  admissionDate?: Date;
}

export interface TransferSectionInput {
  enrollmentId: string;
  organizationId: string;
  classId?: string;
  sectionId: string;
}

export interface TransferCampusInput {
  enrollmentId: string;
  organizationId: string;
  campusId: number;
  classId: string;
  sectionId?: string;
}

export interface PromoteInput {
  enrollmentId: string;
  organizationId: string;
  targetYearId: string;
  campusId: number;
  classId: string;
  sectionId?: string;
  rollNumber?: string;
}

export interface BulkPromoteInput {
  organizationId: string;
  sourceYearId: string;
  targetYearId: string;
  mappings: Array<{
    enrollmentId: string;
    campusId: number;
    classId: string;
    sectionId?: string;
    rollNumber?: string;
    status: "PROMOTED" | "RETAINED" | "GRADUATED";
  }>;
}

export interface EnrollmentScopeFilter {
  organizationId: string;
  campusId?: number;
  unitPath?: string | null;
}

export interface EnrollmentListParams {
  scope: EnrollmentScopeFilter;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: EnrollmentStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface EnrollmentRow {
  id: string;
  studentId: number;
  studentName: string;
  admissionNo: string;
  campusId: number;
  classId: string;
  className: string;
  sectionId: string | null;
  sectionName: string | null;
  rollNumber: string | null;
  status: EnrollmentStatus;
  enrolledAt: Date;
}

/* ── Enroll Student ─────────────────────────────────────── */

export async function enrollStudent(input: EnrollStudentInput) {
  const { organizationId, studentId, campusId, classId, sectionId } = input;

  return prisma.$transaction(async (tx) => {
    const activeYear = await requireActiveAcademicYear(organizationId);

    const existing = await tx.studentEnrollment.findUnique({
      where: {
        studentId_academicYearId: { studentId, academicYearId: activeYear.id },
      },
    });
    if (existing) {
      throw new EnrollmentError("Student is already enrolled in the active academic year");
    }

    await validateClassBelongsToYearAndCampus(tx, classId, activeYear.id, campusId, organizationId);

    if (sectionId) {
      await validateSectionBelongsToClass(tx, sectionId, classId, organizationId);
      await enforceCapacity(tx, sectionId, activeYear.id);
    }

    const enrollment = await tx.studentEnrollment.create({
      data: {
        organizationId,
        academicYearId: activeYear.id,
        studentId,
        campusId,
        classId,
        sectionId,
        rollNumber: input.rollNumber,
        admissionDate: input.admissionDate,
      },
    });

    emit("StudentEnrolled", organizationId, {
      enrollmentId: enrollment.id,
      studentId,
      campusId,
      academicYearId: activeYear.id,
      classId,
      sectionId,
    }).catch(() => {});

    return enrollment;
  });
}

/* ── Section / Class Transfer (Same Year) ───────────────── */

export async function transferSection(input: TransferSectionInput) {
  const { enrollmentId, organizationId, sectionId } = input;

  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.studentEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment || enrollment.organizationId !== organizationId) {
      throw new EnrollmentError("Enrollment not found");
    }
    if (enrollment.status !== "ACTIVE") {
      throw new EnrollmentError("Only ACTIVE enrollments can be transferred");
    }

    await assertYearOpen(enrollment.academicYearId);

    const targetClassId = input.classId ?? enrollment.classId;

    if (input.classId && input.classId !== enrollment.classId) {
      await validateClassBelongsToYearAndCampus(
        tx, input.classId, enrollment.academicYearId, enrollment.campusId, organizationId,
      );
    }

    await validateSectionBelongsToClass(tx, sectionId, targetClassId, organizationId);
    await enforceCapacity(tx, sectionId, enrollment.academicYearId);

    return tx.studentEnrollment.update({
      where: { id: enrollmentId },
      data: {
        classId: targetClassId,
        sectionId,
      },
    });
  });
}

/* ── Campus Transfer (Same Year) ────────────────────────── */

export async function transferCampus(input: TransferCampusInput) {
  const { enrollmentId, organizationId, campusId, classId, sectionId } = input;

  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.studentEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment || enrollment.organizationId !== organizationId) {
      throw new EnrollmentError("Enrollment not found");
    }
    if (enrollment.status !== "ACTIVE") {
      throw new EnrollmentError("Only ACTIVE enrollments can be transferred");
    }

    await assertYearOpen(enrollment.academicYearId);
    await validateClassBelongsToYearAndCampus(
      tx, classId, enrollment.academicYearId, campusId, organizationId,
    );

    if (sectionId) {
      await validateSectionBelongsToClass(tx, sectionId, classId, organizationId);
      await enforceCapacity(tx, sectionId, enrollment.academicYearId);
    }

    await tx.studentEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "TRANSFERRED" },
    });

    return tx.studentEnrollment.create({
      data: {
        organizationId,
        academicYearId: enrollment.academicYearId,
        studentId: enrollment.studentId,
        campusId,
        classId,
        sectionId,
        rollNumber: enrollment.rollNumber,
        promotedFromId: enrollment.id,
      },
    });
  });
}

/* ── Withdraw Student ───────────────────────────────────── */

export async function withdrawStudent(enrollmentId: string, organizationId: string) {
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: enrollmentId },
  });
  if (!enrollment || enrollment.organizationId !== organizationId) {
    throw new EnrollmentError("Enrollment not found");
  }
  if (enrollment.status !== "ACTIVE") {
    throw new EnrollmentError("Only ACTIVE enrollments can be withdrawn");
  }

  const updated = await prisma.studentEnrollment.update({
    where: { id: enrollmentId },
    data: { status: "WITHDRAWN" },
  });

  emit("StudentWithdrawn", organizationId, {
    enrollmentId,
    studentId: enrollment.studentId,
    campusId: enrollment.campusId,
    academicYearId: enrollment.academicYearId,
  }).catch(() => {});

  return updated;
}

/* ── Promote Single Student ─────────────────────────────── */

export async function promoteStudent(input: PromoteInput) {
  const { enrollmentId, organizationId, targetYearId, campusId, classId, sectionId } = input;

  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.studentEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment || enrollment.organizationId !== organizationId) {
      throw new EnrollmentError("Enrollment not found");
    }
    if (enrollment.status !== "ACTIVE") {
      throw new EnrollmentError("Only ACTIVE enrollments can be promoted");
    }
    if (enrollment.academicYearId === targetYearId) {
      throw new EnrollmentError("Cannot promote into the same academic year");
    }

    await assertYearOpen(targetYearId);
    await validateClassBelongsToYearAndCampus(tx, classId, targetYearId, campusId, organizationId);

    if (sectionId) {
      await validateSectionBelongsToClass(tx, sectionId, classId, organizationId);
      await enforceCapacity(tx, sectionId, targetYearId);
    }

    const existingTarget = await tx.studentEnrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: enrollment.studentId,
          academicYearId: targetYearId,
        },
      },
    });
    if (existingTarget) {
      throw new EnrollmentError("Student is already enrolled in the target academic year");
    }

    await tx.studentEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "PROMOTED" },
    });

    return tx.studentEnrollment.create({
      data: {
        organizationId,
        academicYearId: targetYearId,
        studentId: enrollment.studentId,
        campusId,
        classId,
        sectionId,
        rollNumber: input.rollNumber,
        promotedFromId: enrollment.id,
      },
    });
  });
}

/* ── Bulk Promote ───────────────────────────────────────── */

const PROMOTE_BATCH = 200;

export async function bulkPromote(input: BulkPromoteInput) {
  const { organizationId, sourceYearId, targetYearId, mappings } = input;

  if (sourceYearId === targetYearId) {
    throw new EnrollmentError("Source and target academic year must differ");
  }

  await assertYearOpen(targetYearId);

  let promoted = 0;
  let retained = 0;
  let graduated = 0;
  const errors: Array<{ enrollmentId: string; error: string }> = [];

  for (let i = 0; i < mappings.length; i += PROMOTE_BATCH) {
    const batch = mappings.slice(i, i + PROMOTE_BATCH);

    await prisma.$transaction(async (tx) => {
      for (const mapping of batch) {
        try {
          const enrollment = await tx.studentEnrollment.findUnique({
            where: { id: mapping.enrollmentId },
          });

          if (!enrollment || enrollment.organizationId !== organizationId) {
            errors.push({ enrollmentId: mapping.enrollmentId, error: "Not found" });
            continue;
          }
          if (enrollment.status !== "ACTIVE") {
            errors.push({ enrollmentId: mapping.enrollmentId, error: `Status is ${enrollment.status}` });
            continue;
          }
          if (enrollment.academicYearId !== sourceYearId) {
            errors.push({ enrollmentId: mapping.enrollmentId, error: "Not in source year" });
            continue;
          }

          const terminalStatus = mapping.status;

          await tx.studentEnrollment.update({
            where: { id: mapping.enrollmentId },
            data: { status: terminalStatus },
          });

          if (terminalStatus === "GRADUATED") {
            graduated++;
            continue;
          }

          const existingTarget = await tx.studentEnrollment.findUnique({
            where: {
              studentId_academicYearId: {
                studentId: enrollment.studentId,
                academicYearId: targetYearId,
              },
            },
          });

          if (existingTarget) {
            errors.push({ enrollmentId: mapping.enrollmentId, error: "Already enrolled in target year" });
            continue;
          }

          await tx.studentEnrollment.create({
            data: {
              organizationId,
              academicYearId: targetYearId,
              studentId: enrollment.studentId,
              campusId: mapping.campusId,
              classId: mapping.classId,
              sectionId: mapping.sectionId,
              rollNumber: mapping.rollNumber,
              promotedFromId: enrollment.id,
            },
          });

          if (terminalStatus === "PROMOTED") promoted++;
          if (terminalStatus === "RETAINED") retained++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          errors.push({ enrollmentId: mapping.enrollmentId, error: msg });
        }
      }
    });
  }

  return { promoted, retained, graduated, errors, total: mappings.length };
}

/* ── List Enrollments ───────────────────────────────────── */

export async function listEnrollments(params: EnrollmentListParams): Promise<{
  rows: EnrollmentRow[];
  total: number;
}> {
  const { scope, academicYearId, classId, sectionId, status, search, limit = 50, offset = 0 } = params;

  let yearId = academicYearId;
  if (!yearId) {
    const activeYear = await requireActiveAcademicYear(scope.organizationId);
    yearId = activeYear.id;
  }

  const where: Record<string, unknown> = {
    organizationId: scope.organizationId,
    academicYearId: yearId,
  };

  if (scope.campusId) {
    where.campusId = scope.campusId;
  } else if (scope.unitPath) {
    where.campus = { fullUnitPath: { startsWith: scope.unitPath } };
  }

  if (classId) where.classId = classId;
  if (sectionId) where.sectionId = sectionId;
  if (status) where.status = status;

  if (search) {
    where.student = {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { admissionNo: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [rows, total] = await prisma.$transaction([
    prisma.studentEnrollment.findMany({
      where,
      orderBy: [{ rollNumber: "asc" }, { student: { fullName: "asc" } }],
      skip: offset,
      take: limit,
      include: {
        student: { select: { fullName: true, admissionNo: true } },
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    }),
    prisma.studentEnrollment.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.student.fullName,
      admissionNo: r.student.admissionNo,
      campusId: r.campusId,
      classId: r.classId,
      className: r.class.name,
      sectionId: r.sectionId,
      sectionName: r.section?.name ?? null,
      rollNumber: r.rollNumber,
      status: r.status,
      enrolledAt: r.enrolledAt,
    })),
    total,
  };
}

/* ── Get Single Enrollment (with history chain) ─────────── */

export async function getEnrollment(enrollmentId: string, organizationId: string) {
  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: { select: { fullName: true, admissionNo: true } },
      class: { select: { name: true } },
      section: { select: { name: true } },
      academicYear: { select: { name: true } },
      promotedFrom: {
        select: {
          id: true,
          status: true,
          academicYear: { select: { name: true } },
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
      promotedTo: {
        select: {
          id: true,
          status: true,
          academicYear: { select: { name: true } },
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
    },
  });

  if (!enrollment || enrollment.organizationId !== organizationId) {
    throw new EnrollmentError("Enrollment not found");
  }

  return enrollment;
}

/* ── Enrollment Stats (per year) ────────────────────────── */

export async function getEnrollmentStats(
  scope: EnrollmentScopeFilter,
  academicYearId: string,
) {
  const campusFilter: Record<string, unknown> = {};
  if (scope.campusId) {
    campusFilter.campusId = scope.campusId;
  } else if (scope.unitPath) {
    campusFilter.campus = { fullUnitPath: { startsWith: scope.unitPath } };
  }

  const [byStatus, byClass] = await prisma.$transaction([
    prisma.studentEnrollment.groupBy({
      by: ["status"],
      where: {
        organizationId: scope.organizationId,
        academicYearId,
        ...campusFilter,
      },
      _count: true,
    }),
    prisma.studentEnrollment.groupBy({
      by: ["classId"],
      where: {
        organizationId: scope.organizationId,
        academicYearId,
        status: "ACTIVE",
        ...campusFilter,
      },
      _count: true,
    }),
  ]);

  const classIds = byClass.map((r) => r.classId);
  const classes = classIds.length
    ? await prisma.class.findMany({
        where: { id: { in: classIds } },
        select: { id: true, name: true, displayOrder: true },
      })
    : [];

  const classMap = new Map(classes.map((c) => [c.id, c]));

  return {
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count })),
    byClass: byClass
      .map((r) => ({
        classId: r.classId,
        className: classMap.get(r.classId)?.name ?? "Unknown",
        displayOrder: classMap.get(r.classId)?.displayOrder ?? 999,
        count: r._count,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder),
  };
}

/* ── Internal Helpers ───────────────────────────────────── */

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function validateClassBelongsToYearAndCampus(
  tx: TxClient,
  classId: string,
  academicYearId: string,
  campusId: number,
  organizationId: string,
) {
  const cls = await tx.class.findUnique({
    where: { id: classId },
    select: { academicYearId: true, campusId: true, organizationId: true, status: true },
  });

  if (!cls || cls.organizationId !== organizationId) {
    throw new EnrollmentError("Class not found");
  }
  if (cls.status !== "ACTIVE") {
    throw new EnrollmentError("Class is not active");
  }
  if (cls.academicYearId !== academicYearId) {
    throw new EnrollmentError("Class does not belong to the specified academic year");
  }
  if (cls.campusId !== campusId) {
    throw new EnrollmentError("Class does not belong to the specified campus");
  }
}

async function validateSectionBelongsToClass(
  tx: TxClient,
  sectionId: string,
  classId: string,
  organizationId: string,
) {
  const section = await tx.section.findUnique({
    where: { id: sectionId },
    select: { classId: true, organizationId: true, status: true },
  });

  if (!section || section.organizationId !== organizationId) {
    throw new EnrollmentError("Section not found");
  }
  if (section.status !== "ACTIVE") {
    throw new EnrollmentError("Section is not active");
  }
  if (section.classId !== classId) {
    throw new EnrollmentError("Section does not belong to the specified class");
  }
}

async function enforceCapacity(
  tx: TxClient,
  sectionId: string,
  academicYearId: string,
) {
  const section = await tx.section.findUnique({
    where: { id: sectionId },
    select: { capacity: true },
  });

  if (!section) {
    throw new EnrollmentError("Section not found");
  }

  if (section.capacity !== null) {
    const enrolled = await tx.studentEnrollment.count({
      where: { sectionId, academicYearId, status: "ACTIVE" },
    });

    if (enrolled >= section.capacity) {
      throw new EnrollmentError(
        `Section capacity reached (${enrolled}/${section.capacity})`,
      );
    }
  }
}

/* ── Custom Error ───────────────────────────────────────── */

export class EnrollmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnrollmentError";
  }
}
